import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from "expo-audio";
import { WaveformMicro } from "@/components/audio/waveform-micro";
import { ajouterEchantillon, niveauDepuisDb } from "@/lib/niveau-micro";
import { televerserFichier } from "@/lib/r2";
import { couleurs, police, rayons } from "@/lib/theme";
import { Texte } from "./texte";

/** Cadence de relevé du niveau d'entrée, en millisecondes. */
const INTERVALLE_MS = 100;

/** Fenêtre gardée en mémoire : 20 min à 10 relevés/s. */
const CAPACITE_MAX = 12000;

/** Au-dessus de ce niveau d'entrée, l'enregistrement risque d'écrêter. */
const SEUIL_SATURATION = -6;

function formatChrono(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Modal d'enregistrement audio depuis le micro (expo-audio).
 * Flux : enregistrer → arrêter (finalise le fichier) → écouter → ✓ sauvegarder.
 * La pause est évitée : le fichier n'est fiable qu'après stop().
 */
export function ModalEnregistrement({
  visible,
  onFermer,
  dossier,
  onAjouter,
}: {
  visible: boolean;
  onFermer: () => void;
  dossier: string;
  /** dureeSecondes : requise pour le seuil des 30 % d'écoute. */
  onAjouter: (url: string, titre: string, dureeSecondes?: number) => void;
}) {
  const insets = useSafeAreaInsets();
  // isMeteringEnabled est absent des presets : sans lui, statut.metering reste
  // indéfini et aucun niveau réel ne remonte du natif.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const statut = useAudioRecorderState(recorder, INTERVALLE_MS);

  const [erreur, setErreur] = useState<string | null>(null);
  const [coupeSon, setCoupeSon] = useState(false);
  const [termine, setTermine] = useState(false);
  const [dureeFinale, setDureeFinale] = useState(0);
  const [echantillons, setEchantillons] = useState<number[]>([]);
  const [mesureDispo, setMesureDispo] = useState(false);
  const [largeurZone, setLargeurZone] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  const enRegistrement = statut?.isRecording ?? false;
  const duree = enRegistrement
    ? statut?.durationMillis ?? 0
    : termine
      ? dureeFinale
      : 0;

  // Lecture de l'enregistrement finalisé (avant sauvegarde)
  const playerLecture = useAudioPlayer(
    termine && recorder.uri ? { uri: recorder.uri } : null
  );
  const statutLecture = useAudioPlayerStatus(playerLecture);
  const enLecturePrevue = statutLecture?.playing ?? false;

  const niveauDb = typeof statut?.metering === "number" ? statut.metering : null;
  const niveauRef = useRef(0);
  niveauRef.current = niveauDepuisDb(niveauDb);

  // Permissions + préparation à l'ouverture
  useEffect(() => {
    if (!visible) return;
    let actif = true;
    setErreur(null);
    setTermine(false);
    setDureeFinale(0);
    setEchantillons([]);
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!actif) return;
      if (!granted) {
        setErreur("Accès au micro refusé. Autorise le micro dans les réglages.");
      }
    })();
    return () => {
      actif = false;
    };
  }, [visible]);

  // Nettoyage à la fermeture
  useEffect(() => {
    if (!visible && enRegistrement) {
      recorder.stop().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (niveauDb != null) setMesureDispo(true);
  }, [niveauDb]);

  // Capture des niveaux à cadence fixe, en lisant la dernière mesure connue.
  // S'appuyer sur les changements de niveauDb ferait figer la waveform pendant
  // les passages silencieux, où la mesure ne varie plus assez pour re-rendre.
  useEffect(() => {
    if (!enRegistrement) return;
    const timer = setInterval(() => {
      setEchantillons((precedents) =>
        ajouterEchantillon(precedents, niveauRef.current, CAPACITE_MAX)
      );
    }, INTERVALLE_MS);
    return () => clearInterval(timer);
  }, [enRegistrement]);

  async function demarrer() {
    setErreur(null);
    setEchantillons([]);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setErreur("Impossible de démarrer l'enregistrement.");
    }
  }

  async function arreter() {
    playerLecture?.pause();
    try {
      await recorder.stop();
      setDureeFinale(statut?.durationMillis ?? 0);
    } catch {
      setErreur("Impossible de finaliser l'enregistrement.");
      return;
    }
    setTermine(true);
  }

  async function sauvegarder() {
    playerLecture?.pause();
    if (!termine) {
      await arreter();
      if (!termine) return;
    }
    const uri = recorder.uri;
    if (!uri) {
      setErreur("Aucun enregistrement à sauvegarder.");
      return;
    }
    setEnvoi(true);
    try {
      const { key } = await televerserFichier(
        {
          uri,
          name: `enregistrement-${Date.now()}.m4a`,
          type: "audio/mp4",
        },
        dossier
      );
      // durationMillis est en millisecondes ; la base attend des secondes.
      onAjouter(key, "Audio du micro", Math.round(dureeFinale / 1000));
      onFermer();
    } catch {
      setErreur("Impossible d'envoyer l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: couleurs.carte,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        {/* En-tête */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View style={{ width: 40 }} />
          <Texte poids="bold" variante="corps">
            Nouvel enregistrement
          </Texte>
          <Pressable
            onPress={onFermer}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={24} color={couleurs.texteSecondaire} />
          </Pressable>
        </View>

        {erreur ? (
          <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
            <Ionicons name="mic-off-outline" size={36} color={couleurs.danger} />
            <Texte variante="petit" couleur={couleurs.danger} style={{ textAlign: "center" }}>
              {erreur}
            </Texte>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              style={{
                minHeight: 48,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.16)",
                paddingHorizontal: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Texte poids="bold">Fermer</Texte>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Statut + timer */}
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: enRegistrement
                      ? couleurs.danger
                      : termine
                        ? "#34D399"
                        : couleurs.muted,
                  }}
                />
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  {enRegistrement
                    ? "Enregistrement en cours (Micro Interne)"
                    : termine
                      ? "Enregistrement terminé"
                      : "Prêt à enregistrer"}
                </Texte>
              </View>

              <Texte
                poids="extrabold"
                couleur={couleurs.warmGold}
                style={{
                  fontSize: 44,
                  lineHeight: 56,
                  fontFamily: police.extrabold,
                  letterSpacing: 1,
                  marginTop: 16,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatChrono(duree)}
              </Texte>
            </View>

            {/* Visualisation : la waveform trace les niveaux réellement mesurés */}
            <View
              onLayout={(e) => setLargeurZone(e.nativeEvent.layout.width - 24)}
              style={{
                height: 180,
                marginHorizontal: 16,
                marginTop: 20,
                borderRadius: rayons.xl,
                backgroundColor: "rgba(16,14,13,0.5)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {mesureDispo &&
              largeurZone > 0 &&
              echantillons.length > 0 &&
              (termine || enRegistrement) ? (
                <WaveformMicro
                  echantillons={echantillons}
                  largeur={largeurZone}
                  direct={enRegistrement}
                />
              ) : enRegistrement ? (
                // Sans metering (matériel ou OS qui ne le remonte pas), on
                // n'affiche pas de tracé plutôt qu'un tracé inventé.
                <View style={{ alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: couleurs.danger,
                    }}
                  />
                  <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
                    ENREGISTREMENT EN COURS
                  </Texte>
                </View>
              ) : (
                <View style={{ alignItems: "center", gap: 10 }}>
                  <Ionicons name="mic-outline" size={32} color={couleurs.texteSecondaire} />
                  <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
                    APPUIE SUR LE MICRO POUR COMMENCER
                  </Texte>
                </View>
              )}
            </View>

            {/* Écouter l'enregistrement avant sauvegarde */}
            {termine && dureeFinale > 0 && (
              <Pressable
                onPress={() => {
                  if (!playerLecture) return;
                  if (enLecturePrevue) playerLecture.pause();
                  else playerLecture.play();
                }}
                accessibilityRole="button"
                accessibilityLabel={enLecturePrevue ? "Pause de l'écoute" : "Écouter l'enregistrement"}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  alignSelf: "center",
                  marginTop: 16,
                  borderRadius: rayons.pill,
                  borderWidth: 1,
                  borderColor: "rgba(251,191,36,0.35)",
                  backgroundColor: "rgba(251,191,36,0.1)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: couleurs.warmGold,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={enLecturePrevue ? "pause" : "play"}
                    size={18}
                    color={couleurs.charcoal}
                  />
                </View>
                <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
                  {enLecturePrevue ? "Pause" : "Écouter l'enregistrement"}
                </Texte>
              </Pressable>
            )}

            {/* Niveau d'entrée */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginHorizontal: 24,
                marginTop: 14,
              }}
            >
              <Ionicons name="mic" size={14} color={couleurs.texteSecondaire} />
              <View
                style={{
                  flex: 1,
                  maxWidth: 200,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: couleurs.surfaceCarte,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.round(niveauDepuisDb(niveauDb) * 100)}%`,
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor:
                      niveauDb != null && niveauDb > SEUIL_SATURATION
                        ? couleurs.danger
                        : couleurs.terracottaLight,
                  }}
                />
              </View>
              <Texte
                variante="micro"
                poids="bold"
                couleur={couleurs.texteSecondaire}
                numberOfLines={1}
                style={{ width: 52, textAlign: "right", fontVariant: ["tabular-nums"] }}
              >
                {niveauDb != null ? `${Math.round(niveauDb)}dB` : "--"}
              </Texte>
            </View>

            {/* Contrôles */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 8,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.06)",
                marginTop: 16,
              }}
            >
              {/* Mute (visuel) */}
              <Pressable
                onPress={() => setCoupeSon((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={coupeSon ? "Réactiver le micro" : "Couper le micro"}
                style={{ alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: couleurs.surfaceCarte,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={coupeSon ? "mic-off" : "mic"}
                    size={18}
                    color={coupeSon ? couleurs.danger : couleurs.texteSecondaire}
                  />
                </View>
                <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
                  {coupeSon ? "OFF" : "MUTE"}
                </Texte>
              </Pressable>

              {/* Bouton principal : démarrer / arrêter */}
              <Pressable
                onPress={enRegistrement ? arreter : demarrer}
                accessibilityRole="button"
                accessibilityLabel={enRegistrement ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
                style={{ alignItems: "center", justifyContent: "center" }}
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
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
                    <Ionicons
                      name={enRegistrement ? "square" : "mic"}
                      size={enRegistrement ? 26 : 32}
                      color={couleurs.charcoal}
                    />
                  </View>
                </View>
              </Pressable>

              {/* Check : sauvegarde l'enregistrement */}
              <Pressable
                onPress={sauvegarder}
                disabled={envoi || duree <= 0}
                accessibilityRole="button"
                accessibilityLabel="Sauvegarder l'enregistrement"
                style={{ alignItems: "center", gap: 6, opacity: duree > 0 && !envoi ? 1 : 0.4 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(52,211,153,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(52,211,153,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {envoi ? (
                    <Spinner />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#34D399" />
                  )}
                </View>
                <Texte variante="micro" poids="bold" couleur="#34D399" style={{ letterSpacing: 1 }}>
                  TERMINER
                </Texte>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function Spinner() {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: "rgba(52,211,153,0.3)",
        borderTopColor: "#34D399",
      }}
    />
  );
}
