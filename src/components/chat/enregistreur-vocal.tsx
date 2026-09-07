import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { Texte } from "@/components/ui/texte";
import { WaveformMicro } from "@/components/audio/waveform-micro";
import { ajouterEchantillon, niveauDepuisDb } from "@/lib/niveau-micro";
import {
  SEUIL_ANNULATION,
  chronoVocal,
  issueAuRelachement,
  issueDuGeste,
  progressionVers,
  type EtatVocal,
} from "@/lib/vocal";
import { televerserFichier } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";

const INTERVALLE_MS = 100;
const CAPACITE_MAX = 6000;

/**
 * Enregistreur de note vocale, à même la barre de saisie.
 *
 * Le geste est celui que WhatsApp a imposé : on maintient le micro, on glisse
 * vers la gauche pour annuler, vers le haut pour verrouiller. Le relâchement
 * envoie — c'est ce qui fait tenir une note vocale en un seul geste, là où la
 * modale plein écran en demandait quatre.
 */
export function EnregistreurVocal({
  onEnvoyer,
  onErreur,
  onActif,
  dossier = "messages",
}: {
  /** Reçoit la clé R2, la durée en secondes et la taille en octets. */
  onEnvoyer: (cle: string, dureeSecondes: number, tailleOctets?: number) => void;
  onErreur: (message: string) => void;
  /** Signale au composeur d'effacer sa saisie : la barre prend toute la place. */
  onActif?: (actif: boolean) => void;
  dossier?: string;
}) {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const statut = useAudioRecorderState(recorder, INTERVALLE_MS);

  const [etat, setEtat] = useState<EtatVocal>("repos");
  const [echantillons, setEchantillons] = useState<number[]>([]);
  const [largeur, setLargeur] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [depuis, setDepuis] = useState(0);

  // Le geste vit dans des refs : le PanResponder est créé une fois, il ne doit
  // pas dépendre de valeurs qui changent soixante fois par seconde.
  const etatRef = useRef<EtatVocal>("repos");
  const debutRef = useRef(0);
  const annuleRef = useRef(false);
  const niveauRef = useRef(0);
  const glissement = useRef(new Animated.Value(0)).current;
  const [progressionAnnulation, setProgressionAnnulation] = useState(0);

  const niveauDb = typeof statut?.metering === "number" ? statut.metering : null;
  niveauRef.current = niveauDepuisDb(niveauDb);

  const enCours = etat !== "repos";

  useEffect(() => {
    onActif?.(enCours);
    // onActif change à chaque rendu du parent ; le suivre relancerait l'effet
    // sans fin. Seul le passage en enregistrement compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCours]);

  useEffect(() => {
    if (!enCours) return;
    const timer = setInterval(() => {
      setEchantillons((p) => ajouterEchantillon(p, niveauRef.current, CAPACITE_MAX));
      setDepuis(Date.now() - debutRef.current);
    }, INTERVALLE_MS);
    return () => clearInterval(timer);
  }, [enCours]);

  async function demarrer() {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      onErreur("Accès au micro refusé. Autorise le micro dans les réglages.");
      return;
    }
    // Le doigt a pu se lever pendant la demande de permission : ne pas
    // enregistrer dans le vide.
    if (annuleRef.current) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      debutRef.current = Date.now();
      setDepuis(0);
      setEchantillons([]);
      majEtat("enregistre");
    } catch {
      onErreur("Impossible de démarrer l'enregistrement.");
      majEtat("repos");
    }
  }

  function majEtat(v: EtatVocal) {
    etatRef.current = v;
    setEtat(v);
  }

  /** Arrête le micro et rend l'enregistrement, ou rien s'il est écarté. */
  async function arreter(): Promise<{ uri: string; dureeMs: number } | null> {
    const dureeMs = Date.now() - debutRef.current;
    try {
      await recorder.stop();
    } catch {
      return null;
    }
    const uri = recorder.uri;
    return uri ? { uri, dureeMs } : null;
  }

  async function terminer(envoyer: boolean) {
    const resultat = await arreter();
    majEtat("repos");
    glissement.setValue(0);
    setProgressionAnnulation(0);
    setEchantillons([]);
    if (!resultat || !envoyer) return;

    if (issueAuRelachement(resultat.dureeMs) === "trop-court") {
      onErreur("Maintiens le micro pour enregistrer.");
      return;
    }

    setEnvoi(true);
    try {
      const { key } = await televerserFichier(
        { uri: resultat.uri, name: `vocal-${Date.now()}.m4a`, type: "audio/mp4" },
        dossier
      );
      onEnvoyer(key, Math.round(resultat.dureeMs / 1000), tailleDe(resultat.uri));
    } catch {
      onErreur("Impossible d'envoyer la note vocale.");
    } finally {
      setEnvoi(false);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        annuleRef.current = false;
        void demarrer();
      },
      onPanResponderMove: (_e, g) => {
        if (etatRef.current !== "enregistre") return;
        const issue = issueDuGeste(g.dx, g.dy);
        if (issue === "annuler") {
          annuleRef.current = true;
          void terminer(false);
          return;
        }
        if (issue === "verrouiller") {
          majEtat("verrouille");
          glissement.setValue(0);
          setProgressionAnnulation(0);
          return;
        }
        // Le libellé suit le doigt : le geste doit se voir avant d'aboutir.
        glissement.setValue(Math.min(0, g.dx));
        setProgressionAnnulation(progressionVers(-g.dx, SEUIL_ANNULATION));
      },
      onPanResponderRelease: () => {
        annuleRef.current = true;
        // Verrouillé, le doigt peut se lever sans rien conclure.
        if (etatRef.current === "enregistre") void terminer(true);
      },
      onPanResponderTerminate: () => {
        annuleRef.current = true;
        if (etatRef.current === "enregistre") void terminer(false);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  if (etat === "repos") {
    return (
      <View
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Maintenir pour enregistrer une note vocale"
        style={{ width: 34, height: 40, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="mic" size={19} color={envoi ? couleurs.muted : couleurs.danger} />
      </View>
    );
  }

  const verrouille = etat === "verrouille";

  return (
    <View
      onLayout={(e) => setLargeur(e.nativeEvent.layout.width - 150)}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        paddingHorizontal: 12,
        borderRadius: rayons.pill,
        backgroundColor: couleurs.surfaceCarte,
        borderWidth: 1,
        borderColor: couleurs.bordure,
      }}
    >
      <Pressable
        onPress={() => void terminer(false)}
        disabled={!verrouille}
        accessibilityRole="button"
        accessibilityLabel="Supprimer la note vocale"
        hitSlop={8}
        style={{ opacity: verrouille ? 1 : 0.35 }}
      >
        <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
      </Pressable>

      <Texte
        variante="petit"
        poids="bold"
        couleur={couleurs.danger}
        style={{ width: 44, fontVariant: ["tabular-nums"] }}
      >
        {chronoVocal(depuis)}
      </Texte>

      {largeur > 0 && echantillons.length > 0 ? (
        <View style={{ flex: 1 }}>
          <WaveformMicro echantillons={echantillons} largeur={largeur} hauteur={28} direct />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {verrouille ? (
        <Pressable
          onPress={() => void terminer(true)}
          accessibilityRole="button"
          accessibilityLabel="Envoyer la note vocale"
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: couleurs.warmGold,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={16} color={couleurs.charcoal} />
        </Pressable>
      ) : (
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            transform: [{ translateX: glissement }],
            opacity: 1 - progressionAnnulation * 0.7,
          }}
        >
          <Ionicons name="chevron-back" size={14} color={couleurs.texteSecondaire} />
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            Glisser pour annuler
          </Texte>
        </Animated.View>
      )}
    </View>
  );
}

/** Taille du fichier local, pour le décompte du stockage. */
function tailleDe(uri: string): number | undefined {
  try {
    return new File(uri).size ?? undefined;
  } catch {
    return undefined;
  }
}
