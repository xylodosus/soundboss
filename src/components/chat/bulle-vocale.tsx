import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { Texte } from "@/components/ui/texte";
import { chronoVocal } from "@/lib/vocal";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs } from "@/lib/theme";

const NB_POINTS = 26;

/**
 * Note vocale jouable à même la discussion.
 *
 * Rien n'est téléchargé avant l'appui sur lecture : la durée vient de la
 * colonne `duree_secondes`, pas du fichier. Sur une connexion mesurée, ouvrir
 * une discussion ne doit pas rapatrier toutes les notes qu'elle contient.
 *
 * La piste est faite de points et non d'une waveform : aucune analyse n'est
 * faite sur les messages du chat, et dessiner un relief qu'on n'a pas mesuré
 * serait une décoration qui ment.
 */
export function BulleVocale({
  cle,
  dureeSecondes,
  propre = false,
}: {
  /** Clé R2 du fichier. */
  cle: string;
  dureeSecondes?: number | null;
  /** Message envoyé par soi : la teinte suit la bulle. */
  propre?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [largeur, setLargeur] = useState(0);
  const [apercu, setApercu] = useState<number | null>(null);

  const player = useAudioPlayer(url ? { uri: url } : null);
  const statut = useAudioPlayerStatus(player);
  const aDemandeLecture = useRef(false);

  const dureeLue = statut?.duration && statut.duration > 0 ? statut.duration : null;
  const duree = dureeLue ?? dureeSecondes ?? null;
  const position = statut?.currentTime ?? 0;
  const enLecture = statut?.playing ?? false;
  const ratio = apercu ?? (duree && duree > 0 ? Math.min(1, position / duree) : 0);

  // Le fichier arrive de façon asynchrone : on retient l'intention de lire pour
  // la satisfaire dès qu'il est prêt, plutôt que d'exiger un second appui.
  useEffect(() => {
    if (!url || !aDemandeLecture.current || !statut?.isLoaded) return;
    aDemandeLecture.current = false;
    setChargement(false);
    player.play();
  }, [url, statut?.isLoaded, player]);

  async function basculer() {
    if (enLecture) {
      player.pause();
      return;
    }
    if (!url) {
      aDemandeLecture.current = true;
      setChargement(true);
      const resolue = await urlLectureR2(cle);
      if (!resolue) {
        setChargement(false);
        aDemandeLecture.current = false;
        return;
      }
      setUrl(resolue);
      return;
    }
    // Rejouer depuis le début une fois la note terminée.
    if (duree && position >= duree - 0.15) player.seekTo(0);
    player.play();
  }

  function deplacer(x: number, definitif: boolean) {
    if (!largeur || !duree) return;
    const r = Math.min(1, Math.max(0, x / largeur));
    if (definitif) {
      setApercu(null);
      player.seekTo(r * duree);
    } else {
      setApercu(r);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => deplacer(e.nativeEvent.locationX, false),
      onPanResponderMove: (e) => deplacer(e.nativeEvent.locationX, false),
      onPanResponderRelease: (e) => deplacer(e.nativeEvent.locationX, true),
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const teinte = propre ? couleurs.charcoal : couleurs.warmGold;
  const teinteFaible = propre ? "rgba(20,17,16,0.35)" : "rgba(255,255,255,0.25)";
  const joues = Math.round(ratio * NB_POINTS);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
      <Pressable
        onPress={() => void basculer()}
        accessibilityRole="button"
        accessibilityLabel={enLecture ? "Mettre en pause" : "Écouter la note vocale"}
        hitSlop={8}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {chargement ? (
          <ActivityIndicator size="small" color={teinte} />
        ) : (
          <Ionicons name={enLecture ? "pause" : "play"} size={20} color={teinte} />
        )}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <View
          onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
          style={{
            height: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {Array.from({ length: NB_POINTS }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === joues ? 8 : 3,
                height: i === joues ? 8 : 3,
                borderRadius: 4,
                backgroundColor: i <= joues ? teinte : teinteFaible,
              }}
            />
          ))}
        </View>
        <Texte
          variante="micro"
          couleur={propre ? "rgba(20,17,16,0.6)" : couleurs.texteSecondaire}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {duree
            ? enLecture || position > 0
              ? `${chronoVocal(position * 1000)} / ${chronoVocal(duree * 1000)}`
              : chronoVocal(duree * 1000)
            : "Note vocale"}
        </Texte>
      </View>
    </View>
  );
}
