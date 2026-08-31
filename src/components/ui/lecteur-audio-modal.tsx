import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { urlLectureR2 } from "@/lib/r2";
import { telechargerEtPartager } from "@/lib/telechargement";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export interface PisteAudio {
  titre: string;
  sousTitre?: string;
  url: string; // URL http(s) résolue (signée R2)
  imageCle?: string | null; // clé R2 / URL de la couverture (photo de groupe, affiche projet…)
}

const NB_BARRES = 40;

/** Hauteurs pseudo-aléatoires stables (ne changent pas entre rendus). */
function hauteurBarre(i: number): number {
  return 18 + ((i * 37 + 11) % 82);
}

function formatTemps(secondes: number): string {
  if (!isFinite(secondes) || secondes < 0) return "0:00";
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Barre de la waveform. En lecture : pulse en égaliseur (amplitudes animées).
 * En pause : se fige sur sa hauteur de base. Colorée en doré si déjà lue.
 */
function BarreWaveforme({
  index,
  actif,
  enLecture,
}: {
  index: number;
  actif: boolean;
  enLecture: boolean;
}) {
  const hauteurBase = hauteurBarre(index);
  const amplitude = useSharedValue(hauteurBase);

  useEffect(() => {
    if (enLecture) {
      amplitude.value = withRepeat(
        withSequence(
          withTiming(12 + Math.random() * 80, { duration: 260 }),
          withTiming(12 + Math.random() * 80, { duration: 260 })
        ),
        -1
      );
    } else {
      cancelAnimation(amplitude);
      amplitude.value = withTiming(hauteurBase, { duration: 200 });
    }
  }, [enLecture, amplitude, hauteurBase]);

  const styleAnim = useAnimatedStyle(() => ({
    height: `${amplitude.value}%`,
  }));

  return (
    <Animated.View
      style={[
        styleAnim,
        {
          width: 4,
          borderRadius: 2,
          backgroundColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.18)",
        },
      ]}
    />
  );
}

/** Waveform : barres pulsantes pendant la lecture, coloration liée à la progression. */
function Waveforme({ enLecture, ratio }: { enLecture: boolean; ratio: number }) {
  const barres = useMemo(() => Array.from({ length: NB_BARRES }), []);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        height: 80,
        justifyContent: "center",
      }}
    >
      {barres.map((_, i) => (
        <BarreWaveforme
          key={i}
          index={i}
          actif={i / NB_BARRES <= ratio}
          enLecture={enLecture}
        />
      ))}
    </View>
  );
}

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

  async function telecharger() {
    if (!piste) return;
    setEnTelechargement(true);
    try {
      const resultat = await telechargerEtPartager(piste.url, `${piste.titre}.m4a`, "audio/mp4");
      if (resultat === "cache") dialogue.succes("Audio téléchargé.");
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
      onRequestClose={onFermer}
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
        <Pressable style={{ flex: 1 }} onPress={onFermer} />

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
              <Ionicons name="download-outline" size={20} color={couleurs.warmGold} />
            </Pressable>
            <Pressable
              onPress={onFermer}
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

          {/* Visuel : image du groupe/projet, sinon disque vinyle */}
          <View
            style={{
              aspectRatio: 1,
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
                  width: 96,
                  height: 96,
                  borderRadius: 48,
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
                <Ionicons name="disc" size={44} color={couleurs.warmGold} />
              </View>
            )}
          </View>

          {/* Waveform + temps */}
          <View style={{ marginTop: 20 }}>
            <Waveforme enLecture={enLecture} ratio={ratio} />
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
          </View>
        </View>
      </View>
    </Modal>
  );
}
