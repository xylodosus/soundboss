/**
 * Sonde de faisabilité du labo audio — ÉCRAN JETABLE.
 *
 * Mesure ce que coûte le décodage d'un enregistrement de répétition avec
 * react-native-audio-api, à la fréquence native puis à 22 050 Hz. Le résultat
 * décide de l'architecture du lot E1 : décodage complet (transposition, tempo,
 * égaliseur possibles) ou lecture en flux (aucun effet).
 *
 * À supprimer une fois la mesure consignée dans mobile_dev_plan.md.
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioContext, decodeAudioData, StreamerNode } from "react-native-audio-api";

import { supabase } from "@/lib/supabase";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs, espacement, police, rayons, tailles } from "@/lib/theme";

type Enregistrement = {
  id: string;
  titre: string | null;
  url: string;
  duree_secondes: number | null;
  taille_octets: number | null;
};

type Mesure = {
  etiquette: string;
  ms: number;
  duree: number;
  canaux: number;
  frequence: number;
  octets: number;
};

function mo(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export default function LaboSonde() {
  const [pistes, setPistes] = useState<Enregistrement[]>([]);
  const [journal, setJournal] = useState<string[]>([]);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [occupe, setOccupe] = useState(false);

  const tracer = (ligne: string) => setJournal((j) => [...j, ligne]);

  useEffect(() => {
    supabase
      .from("seance_enregistrements")
      .select("id, titre, url, duree_secondes, taille_octets")
      .order("duree_secondes", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) tracer(`Chargement impossible : ${error.message}`);
        else setPistes(data ?? []);
      });
  }, []);

  async function mesurer(piste: Enregistrement, frequence?: number) {
    const etiquette = frequence ? `${frequence} Hz` : "natif";
    setOccupe(true);
    tracer(`— ${piste.titre ?? piste.id} · ${etiquette}`);
    try {
      const url = await urlLectureR2(piste.url);
      if (!url) {
        tracer("  URL signée introuvable");
        return;
      }
      const debut = Date.now();
      const tampon = await decodeAudioData(url, frequence);
      const ms = Date.now() - debut;
      const octets = tampon.length * tampon.numberOfChannels * 4;
      const mesure: Mesure = {
        etiquette: `${piste.titre ?? piste.id} · ${etiquette}`,
        ms,
        duree: tampon.duration,
        canaux: tampon.numberOfChannels,
        frequence: tampon.sampleRate,
        octets,
      };
      setMesures((m) => [...m, mesure]);
      tracer(
        `  ${ms} ms · ${tampon.duration.toFixed(1)} s · ${tampon.numberOfChannels} canaux` +
          ` · ${tampon.sampleRate} Hz · ${mo(octets)}`
      );
      // Comparer à la durée en base : un écart révélerait un décodage tronqué.
      if (piste.duree_secondes) {
        const ecart = Math.abs(tampon.duration - piste.duree_secondes);
        tracer(`  écart avec la base : ${ecart.toFixed(1)} s`);
      }
    } catch (e) {
      tracer(`  ÉCHEC : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOccupe(false);
    }
  }

  /** Vérifie que la voie « flux » lit sans décoder — le repli si la mémoire cède. */
  async function essayerFlux(piste: Enregistrement) {
    setOccupe(true);
    tracer(`— flux : ${piste.titre ?? piste.id}`);
    try {
      const url = await urlLectureR2(piste.url);
      if (!url) {
        tracer("  URL signée introuvable");
        return;
      }
      const contexte = new AudioContext();
      const noeud = new StreamerNode(contexte, { streamPath: url });
      noeud.connect(contexte.destination);
      noeud.start();
      tracer("  lecture en flux démarrée (5 s)");
      setTimeout(() => {
        noeud.stop();
        contexte.close();
        tracer("  flux arrêté");
      }, 5000);
    } catch (e) {
      tracer(`  ÉCHEC flux : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <SafeAreaView style={styles.ecran} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Sonde du labo audio</Text>
        <Text style={styles.sous}>
          Mesure le coût du décodage. Lance la piste la plus longue en premier.
        </Text>

        {pistes.map((piste) => (
          <View key={piste.id} style={styles.carte}>
            <Text style={styles.nom} numberOfLines={1}>
              {piste.titre ?? piste.id}
            </Text>
            <Text style={styles.meta}>
              {piste.duree_secondes ? `${piste.duree_secondes} s` : "durée inconnue"}
              {piste.taille_octets ? ` · ${mo(piste.taille_octets)} sur disque` : ""}
            </Text>
            <View style={styles.boutons}>
              <Pressable
                disabled={occupe}
                onPress={() => mesurer(piste)}
                style={[styles.bouton, occupe && styles.boutonInactif]}
              >
                <Text style={styles.boutonTexte}>Natif</Text>
              </Pressable>
              <Pressable
                disabled={occupe}
                onPress={() => mesurer(piste, 22050)}
                style={[styles.bouton, occupe && styles.boutonInactif]}
              >
                <Text style={styles.boutonTexte}>22 050 Hz</Text>
              </Pressable>
              <Pressable
                disabled={occupe}
                onPress={() => essayerFlux(piste)}
                style={[styles.bouton, styles.boutonSecondaire, occupe && styles.boutonInactif]}
              >
                <Text style={styles.boutonTexte}>Flux</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {mesures.length > 0 && (
          <View style={styles.carte}>
            <Text style={styles.nom}>Récapitulatif</Text>
            {mesures.map((m, i) => (
              <Text key={i} style={styles.meta}>
                {m.etiquette} → {m.ms} ms, {mo(m.octets)}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.carte}>
          <Text style={styles.nom}>Journal</Text>
          {journal.length === 0 ? (
            <Text style={styles.meta}>Rien encore.</Text>
          ) : (
            journal.map((ligne, i) => (
              <Text key={i} style={styles.journal}>
                {ligne}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espacement.lg, gap: espacement.md },
  titre: { fontFamily: police.bold, fontSize: tailles.titre3, color: couleurs.texte },
  sous: { fontFamily: police.regular, fontSize: tailles.petit, color: couleurs.muted },
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayons.lg,
    padding: espacement.lg,
    gap: espacement.sm,
  },
  nom: { fontFamily: police.semibold, fontSize: tailles.corps, color: couleurs.texte },
  meta: { fontFamily: police.regular, fontSize: tailles.petit, color: couleurs.muted },
  journal: { fontFamily: police.regular, fontSize: tailles.micro, color: couleurs.muted },
  boutons: { flexDirection: "row", gap: espacement.sm, marginTop: espacement.xs },
  bouton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: espacement.lg,
    borderRadius: rayons.pill,
    backgroundColor: couleurs.warmGold,
  },
  boutonSecondaire: { backgroundColor: couleurs.terracotta },
  boutonInactif: { opacity: 0.4 },
  boutonTexte: { fontFamily: police.semibold, fontSize: tailles.petit, color: couleurs.charcoal },
});
