import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { urlLectureR2 } from "@/lib/r2";
import { Waveform } from "@/components/audio/waveform";
import { LaboAudio } from "@/components/audio/labo-audio";
import { parsePics } from "@/lib/peaks";
import { formatTemps } from "@/lib/format";
import { telechargerEtPartager } from "@/lib/telechargement";
import { useDialogue } from "@/lib/dialogue";
import { deltaEcoute, estEcoutee } from "@/lib/ecoute";
import {
  useEnregistrement,
  useEnregistrerEcoute,
  useSeance,
  useValiderEcoute,
} from "@/lib/queries/seances";
import { usePupitresGroupe } from "@/lib/queries/groupes";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export interface PisteAudio {
  /** Audio de répétition : active la remontée de progression d'écoute. */
  enregistrementId?: string;
  titre: string;
  sousTitre?: string;
  url: string; // URL http(s) résolue (signée R2)
  imageCle?: string | null; // clé R2 / URL de la couverture (photo de groupe, affiche projet…)
}


/**
 * Barre de la waveform. En lecture : pulse en égaliseur (amplitudes animées).
 * En pause : se fige sur sa hauteur de base. Colorée en doré si déjà lue.
 */

/**
 * Lecteur audio plein écran (bottom sheet) — d'après le template SoundBoss :
 * waveform simulée, temps, contrôles ±10s / lecture, volume.
 */
export function LecteurAudioModal({
  piste,
  visible,
  onFermer,
}: {
  piste: PisteAudio | null;
  visible: boolean;
  onFermer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useAudioPlayer(piste ? { uri: piste.url } : null);
  const statut = useAudioPlayerStatus(player);
  const [sonCoupe, setSonCoupe] = useState(false);
  const [imageResolue, setImageResolue] = useState<string | null>(null);
  const dialogue = useDialogue();
  const [enTelechargement, setEnTelechargement] = useState(false);

  // Cumul du temps réellement joué, pour le seuil des 30 % d'écoute.
  // `mutate` est référentiellement stable en TanStack Query v5 : on le
  // déstructure pour pouvoir l'inscrire honnêtement dans les dépendances,
  // plutôt que de désactiver la règle des hooks.
  const { mutate: pousserEcoute } = useEnregistrerEcoute();
  const { mutate: validerEcoute } = useValiderEcoute();
  // Une écoute est comptabilisée une seule fois par session de lecture.
  const dejaValide = useRef(false);
  const cumul = useRef(0);
  const dernierePosition = useRef(0);
  const dernierEnvoi = useRef(0);

  const enregistrementId = piste?.enregistrementId;
  const { data: enregistrement } = useEnregistrement(enregistrementId ?? "", !!enregistrementId);
  const [pics, setPics] = useState<number[]>([]);
  const [laboOuvert, setLaboOuvert] = useState(false);

  // Pics produits par le media-worker. Absents — audio pas encore analysé, ou
  // fichier qui n'est pas un enregistrement — la waveform se replie sur une
  // barre de progression simple.
  useEffect(() => {
    let annule = false;
    setPics([]);
    const cle = enregistrement?.peaks_url;
    if (!cle) return;
    urlLectureR2(cle)
      .then((url) => (url ? fetch(url) : null))
      .then((r) => (r?.ok ? r.text() : null))
      .then((texte) => {
        if (!annule && texte) setPics(parsePics(texte) ?? []);
      })
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, [enregistrement?.peaks_url]);

  // Nouvelle piste : le cumul repart de zéro.
  useEffect(() => {
    cumul.current = 0;
    dernierePosition.current = 0;
    dernierEnvoi.current = 0;
    dejaValide.current = false;
  }, [enregistrementId]);

  useEffect(() => {
    if (!enregistrementId) return;
    const position = statut.currentTime ?? 0;
    if (!statut.playing) {
      // À l'arrêt on se recale sans compter : reprendre après une pause ne
      // doit pas créer un faux delta.
      dernierePosition.current = position;
      return;
    }
    cumul.current += deltaEcoute(dernierePosition.current, position);
    dernierePosition.current = position;

    // Un envoi toutes les 15 s suffit : la RPC garde la valeur maximale.
    if (cumul.current - dernierEnvoi.current >= 15) {
      dernierEnvoi.current = cumul.current;
      pousserEcoute({ enregistrementId, secondes: Math.round(cumul.current) });
    }

    // Franchissement des 30 % : l'écoute compte, une fois pour cette session.
    if (!dejaValide.current && estEcoutee(cumul.current, statut.duration ?? null)) {
      dejaValide.current = true;
      validerEcoute(enregistrementId);
    }
  }, [
    statut.currentTime,
    statut.playing,
    statut.duration,
    enregistrementId,
    pousserEcoute,
    validerEcoute,
  ]);

  // À la fermeture, pousser le reliquat : sans ça une écoute de moins de 15 s
  // depuis le dernier envoi serait perdue.
  function fermerEnPoussantEcoute() {
    if (enregistrementId && cumul.current > dernierEnvoi.current) {
      pousserEcoute({ enregistrementId, secondes: Math.round(cumul.current) });
      dernierEnvoi.current = cumul.current;
    }
    onFermer();
  }

  async function telecharger() {
    if (!piste) return;
    setEnTelechargement(true);
    try {
      const resultat = await telechargerEtPartager(piste.url, `${piste.titre}.m4a`, "audio/mp4");
      if (resultat === "telecharge") dialogue.succes("Audio enregistré sur ton appareil.");
      else if (resultat === "cache") dialogue.succes("Audio téléchargé.");
    } catch {
      dialogue.erreur("Impossible de télécharger cet audio.");
    } finally {
      setEnTelechargement(false);
    }
  }

  // Résout l'image de couverture (clé R2 → URL signée)
  useEffect(() => {
    let actif = true;
    setImageResolue(null);
    const cle = piste?.imageCle;
    if (!cle) return;
    if (cle.startsWith("http")) {
      setImageResolue(cle);
      return;
    }
    urlLectureR2(cle).then((url) => {
      if (actif) setImageResolue(url);
    });
    return () => {
      actif = false;
    };
  }, [piste?.imageCle]);

  const duree = statut?.duration ?? 0;
  const temps = statut?.currentTime ?? 0;
  const enLecture = statut?.playing ?? false;
  const ratio = duree > 0 ? temps / duree : 0;

  function basculerLecture() {
    if (!player) return;
    if (enLecture) player.pause();
    else player.play();
  }

  function reculer() {
    if (!player) return;
    player.seekTo(Math.max(0, temps - 10));
  }

  function avancer() {
    if (!player) return;
    player.seekTo(Math.min(duree, temps + 10));
  }

  function basculerVolume() {
    if (!player) return;
    const coupe = player.volume !== 0;
    player.volume = coupe ? 0 : 1;
    setSonCoupe(coupe);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={fermerEnPoussantEcoute}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "flex-end",
        }}
      >
        {/* Tap sur le fond → fermer */}
        <Pressable style={{ flex: 1 }} onPress={fermerEnPoussantEcoute} />

        {/* Feuille */}
        <View
          style={{
            backgroundColor: couleurs.carte,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
            borderBottomWidth: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {/* Poignée */}
          <View
            style={{
              width: 48,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignSelf: "center",
              marginBottom: 16,
            }}
          />

          {/* En-tête */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Texte variante="titre3" poids="extrabold" numberOfLines={1}>
                {piste?.titre ?? "Lecture"}
              </Texte>
              {piste?.sousTitre && (
                <Texte
                  variante="petit"
                  couleur={couleurs.texteSecondaire}
                  numberOfLines={1}
                  style={{ marginTop: 2 }}
                >
                  {piste.sousTitre}
                </Texte>
              )}
            </View>
            <Pressable
              onPress={telecharger}
              disabled={enTelechargement || !piste}
              accessibilityRole="button"
              accessibilityLabel="Télécharger l'audio"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: couleurs.surfaceCarte,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
                opacity: enTelechargement ? 0.5 : 1,
              }}
            >
              {/* Une opacité réduite ne suffit pas à signaler une attente :
                  sur un fichier de plusieurs mégaoctets en réseau lent, le
                  bouton paraissait simplement inerte. */}
              {enTelechargement ? (
                <ActivityIndicator size="small" color={couleurs.warmGold} />
              ) : (
                <Ionicons name="download-outline" size={20} color={couleurs.warmGold} />
              )}
            </Pressable>
            <Pressable
              onPress={fermerEnPoussantEcoute}
              accessibilityRole="button"
              accessibilityLabel="Fermer le lecteur"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: couleurs.surfaceCarte,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={22} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          {/* Visuel : image du groupe/projet, sinon disque vinyle.
              Réduit à un format de vignette : un carré pleine largeur poussait
              la waveform et le transport sous la ligne de flottaison. */}
          <View
            style={{
              width: 132,
              height: 132,
              alignSelf: "center",
              borderRadius: rayons.xl,
              backgroundColor: "rgba(251,191,36,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 16,
              overflow: "hidden",
            }}
          >
            {imageResolue ? (
              <Image
                source={{ uri: imageResolue }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: couleurs.warmGold,
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                }}
              >
                <Ionicons name="disc" size={34} color={couleurs.warmGold} />
              </View>
            )}
          </View>

          {/* Waveform + temps */}
          <View style={{ marginTop: 20 }}>
            <Waveform
              pics={pics}
              progression={ratio}
              surDeplacer={(r, definitif) => {
                if (definitif) player.seekTo(Math.min(duree, Math.max(0, r * duree)));
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
                paddingHorizontal: 2,
              }}
            >
              <Texte variante="micro" couleur={couleurs.muted} style={{ fontVariant: ["tabular-nums"] }}>
                {formatTemps(temps)}
              </Texte>
              <Texte variante="micro" couleur={couleurs.muted} style={{ fontVariant: ["tabular-nums"] }}>
                {formatTemps(duree)}
              </Texte>
            </View>
          </View>

          {/* Contrôles principaux */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              marginTop: 16,
            }}
          >
            <Pressable
              onPress={reculer}
              accessibilityRole="button"
              accessibilityLabel="Reculer de 10 secondes"
              hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name="reload"
                size={26}
                color={couleurs.texte}
                style={{ transform: [{ scaleX: -1 }] }}
              />
            </Pressable>

            <Pressable
              onPress={basculerLecture}
              accessibilityRole="button"
              accessibilityLabel={enLecture ? "Pause" : "Lecture"}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: couleurs.warmGold,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: couleurs.warmGold,
                shadowOpacity: 0.35,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Ionicons name={enLecture ? "pause" : "play"} size={34} color={couleurs.charcoal} />
            </Pressable>

            <Pressable
              onPress={avancer}
              accessibilityRole="button"
              accessibilityLabel="Avancer de 10 secondes"
              hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="reload" size={26} color={couleurs.texte} />
            </Pressable>
          </View>

          {/* Contrôles secondaires */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.06)",
              marginTop: 16,
              paddingTop: 12,
              paddingBottom: 20,
            }}
          >
            <Pressable
              onPress={basculerVolume}
              accessibilityRole="button"
              accessibilityLabel={sonCoupe ? "Réactiver le son" : "Couper le son"}
              hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name={sonCoupe ? "volume-mute" : "volume-high"}
                size={22}
                color={couleurs.texteSecondaire}
              />
            </Pressable>

            {/* Le labo décode le morceau en entier : c'est un second geste,
                jamais celui par défaut. Il s'ouvre sur n'importe quel audio —
                sur un enregistrement de répétition il aura en plus les pics,
                le tempo, la tonalité et les pistes séparées. */}
            {piste && (
              <Pressable
                onPress={() => setLaboOuvert(true)}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir dans le labo audio"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  paddingHorizontal: 16,
                  borderRadius: rayons.pill,
                  backgroundColor: couleurs.warmGold15,
                  borderWidth: 1,
                  borderColor: "rgba(251,191,36,0.25)",
                }}
              >
                <Ionicons name="pulse-outline" size={18} color={couleurs.warmGold} />
                <Texte variante="petit" poids="semibold" couleur={couleurs.warmGold}>
                  Labo audio
                </Texte>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Monté seulement à l'ouverture : ses requêtes de contexte — séance,
          groupe, pupitres — n'ont aucune raison de partir à chaque écoute. */}
      {laboOuvert &&
        (enregistrement ? (
          <LaboDepuisLecteur
            enregistrement={enregistrement}
            onFermer={() => setLaboOuvert(false)}
          />
        ) : (
          piste && (
            <LaboAudio
              piste={{
                // url est déjà une URL signée : urlLectureR2 la rend telle
                // quelle lorsqu'elle commence par http.
                id: piste.url,
                titre: piste.titre,
                url: piste.url,
                peaks_url: null,
                duree_secondes: null,
                bpm: null,
                tonalite: null,
                tonalite_confiance: null,
                tonalite_sections: null,
                analyzed_at: null,
              }}
              visible
              onFermer={() => setLaboOuvert(false)}
              avecStems={false}
            />
          )
        ))}
    </Modal>
  );
}

/**
 * Ouvre le labo sur un enregistrement, en retrouvant le contexte nécessaire au
 * transfert d'une piste : la séance, son groupe, et les pupitres de ce groupe.
 *
 * Le lecteur, lui, ne connaît que l'identifiant de l'enregistrement — il sert
 * aussi bien un audio de répétition qu'un fichier de groupe.
 */
function LaboDepuisLecteur({
  enregistrement,
  onFermer,
}: {
  enregistrement: NonNullable<ReturnType<typeof useEnregistrement>["data"]>;
  onFermer: () => void;
}) {
  const { data: seance } = useSeance(enregistrement.seance_id);
  const groupeId = seance?.groupe?.id ?? "";
  const { data: pupitres = [] } = usePupitresGroupe(groupeId);

  return (
    <LaboAudio
      piste={enregistrement}
      visible
      onFermer={onFermer}
      seanceId={enregistrement.seance_id}
      groupeId={groupeId || undefined}
      pupitres={pupitres}
    />
  );
}
