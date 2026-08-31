import { useEffect, useState } from "react";
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
import { televerserFichier } from "@/lib/r2";
import { couleurs, police, rayons } from "@/lib/theme";
import { Texte } from "./texte";

const NB_BARRES = 40;

/** Hauteurs fixes (représentent l'audio enregistré). */
function hauteurBarre(i: number): number {
  return 18 + ((i * 37 + 11) % 82);
}

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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const statut = useAudioRecorderState(recorder);

  const [erreur, setErreur] = useState<string | null>(null);
  const [coupeSon, setCoupeSon] = useState(false);
  const [termine, setTermine] = useState(false);
  const [dureeFinale, setDureeFinale] = useState(0);
  const [niveau, setNiveau] = useState(10);
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

  // Vrai niveau d'entrée quand le metering est dispo (sinon simulation)
  const niveauDb = statut?.metering ?? null;

  // Permissions + préparation à l'ouverture
  useEffect(() => {
    if (!visible) return;
    let actif = true;
    setErreur(null);
    setTermine(false);
    setDureeFinale(0);
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

  // Niveau d'entrée : metering réel si dispo, sinon simulation
  useEffect(() => {
    if (!enRegistrement) return;
    if (niveauDb != null) {
      setNiveau(Math.max(0, Math.min(100, Math.round(((niveauDb + 60) / 60) * 100))));
      return;
    }
    const timer = setInterval(() => {
      setNiveau(15 + Math.random() * 80);
    }, 400);
    return () => {
      clearInterval(timer);
      setNiveau(10);
    };
  }, [enRegistrement, niveauDb]);

  async function demarrer() {
    setErreur(null);
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

  const niveauPct = Math.min(100, Math.round(niveau));

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

            {/* Visualisation : waveform seulement si un audio est enregistré */}
            <View
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
              {termine && dureeFinale > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    height: 120,
                    paddingHorizontal: 8,
                  }}
                >
                  {Array.from({ length: NB_BARRES }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 5,
                        height: `${hauteurBarre(i)}%`,
                        borderRadius: 3,
                        backgroundColor: couleurs.warmGold,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </View>
              ) : enRegistrement ? (
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
                    width: `${Math.min(100, niveauPct)}%`,
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor:
                      niveauPct > 80 ? couleurs.danger : couleurs.terracottaLight,
                  }}
                />
              </View>
              <Texte
                variante="micro"
                poids="bold"
                couleur={couleurs.texteSecondaire}
                numberOfLines={1}
                style={{ width: 44, textAlign: "right", fontVariant: ["tabular-nums"] }}
              >
                {Math.max(-30, Math.round(-3 - (niveauPct / 100) * 27))}dB
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
