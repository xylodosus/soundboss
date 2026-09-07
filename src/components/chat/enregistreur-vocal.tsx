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
import { modeEnregistrement, modeLecture } from "@/lib/mode-audio";
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
 * Deux entrées, et c'est délibéré :
 *
 * — un **appui bref** ouvre l'enregistrement en mains libres, corbeille et
 *   envoi à portée de doigt ;
 * — un **maintien** reprend le geste que WhatsApp a imposé : glisser vers la
 *   gauche pour annuler, vers le haut pour verrouiller, relâcher pour envoyer.
 *
 * Le geste ne peut pas être la seule issue. La barre remplace la saisie au
 * moment même où le doigt appuie, et si le doigt se perd dans ce remaniement
 * l'utilisateur se retrouve enfermé : ni envoi, ni annulation. C'est ce qui
 * s'est produit. La corbeille reste donc toujours atteignable.
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
      // iOS refuse d'enregistrer tant que la session ne l'autorise pas, et
      // l'app la règle au démarrage pour la lecture seule.
      await modeEnregistrement();
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
      await modeLecture().catch(() => {});
      return null;
    }
    // Laisser la session en enregistrement renverrait le son vers l'écouteur
    // du haut sur iOS : la note qu'on vient d'envoyer serait inaudible.
    await modeLecture().catch(() => {});
    const uri = recorder.uri;
    return uri ? { uri, dureeMs } : null;
  }

  async function terminer(envoyer: boolean) {
    const resultat = await arreter();
    majEtat("repos");
    glissement.setValue(0);
    setProgressionAnnulation(0);
    setEchantillons([]);
    if (!resultat) return;
    if (!envoyer) {
      if (issueAuRelachement(resultat.dureeMs) === "trop-court") {
        onErreur("Appuie sur le micro pour enregistrer, ou maintiens-le.");
      }
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
      // Verrouillé, les appuis reviennent aux boutons : sans cela, la
      // corbeille et l'envoi seraient inatteignables.
      onStartShouldSetPanResponder: () => etatRef.current !== "verrouille",
      onMoveShouldSetPanResponder: () => etatRef.current !== "verrouille",
      onPanResponderGrant: () => {
        // Un appui sur la barre déjà ouverte ne doit pas relancer un second
        // enregistrement par-dessus le premier.
        if (etatRef.current !== "repos") return;
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
        if (etatRef.current !== "enregistre") return;
        const issue = issueAuRelachement(Date.now() - debutRef.current);
        // Un simple tap passe en mains libres plutôt que d'envoyer : c'est ce
        // qui garantit qu'on peut toujours atteindre les boutons.
        if (issue === "verrouiller") majEtat("verrouille");
        else void terminer(issue === "envoyer");
      },
      onPanResponderTerminate: () => {
        annuleRef.current = true;
        if (etatRef.current === "enregistre") void terminer(false);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const verrouille = etat === "verrouille";

  // Une seule View porte le geste, du repos jusqu'à la fin : la démonter au
  // démarrage de l'enregistrement — ce que faisait la version précédente en
  // rendant deux arbres différents — perdait le doigt en cours de route et
  // enfermait l'utilisateur dans une barre sans issue.
  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole={etat === "repos" ? "button" : undefined}
      accessibilityLabel={
        etat === "repos" ? "Appuyer ou maintenir pour enregistrer une note vocale" : undefined
      }
      style={
        etat === "repos"
          ? { width: 34, height: 40, alignItems: "center", justifyContent: "center" }
          : {
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              paddingHorizontal: 10,
              borderRadius: rayons.pill,
              backgroundColor: couleurs.surfaceCarte,
              borderWidth: 1,
              borderColor: couleurs.bordure,
            }
      }
    >
      {etat === "repos" ? (
        <Ionicons name="mic" size={19} color={envoi ? couleurs.muted : couleurs.danger} />
      ) : (
        <>
          {/* Toujours active, même le doigt posé : pendant un maintien le
              geste capte les appuis et elle reste inerte, mais si le geste se
              perd elle redevient la porte de sortie. Une barre sans issue est
              pire qu'un bouton sans effet. */}
          <Pressable
            onPress={() => void terminer(false)}
            accessibilityRole="button"
            accessibilityLabel="Supprimer la note vocale"
            hitSlop={8}
            style={{ width: 32, alignItems: "center" }}
          >
            <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
          </Pressable>

          <Texte
            variante="petit"
            poids="bold"
            couleur={couleurs.danger}
            style={{ width: 42, fontVariant: ["tabular-nums"] }}
          >
            {chronoVocal(depuis)}
          </Texte>

          {/* La waveform mesure sa propre place. La déduire d'une soustraction
              faisait déborder le tracé sur le libellé voisin. */}
          <View
            onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}
            style={{ flex: 1, overflow: "hidden" }}
          >
            {largeur > 0 && echantillons.length > 0 && (
              <WaveformMicro
                echantillons={echantillons}
                largeur={largeur}
                hauteur={26}
                direct
              />
            )}
          </View>

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
                gap: 2,
                transform: [{ translateX: glissement }],
                opacity: 1 - progressionAnnulation * 0.7,
              }}
            >
              <Ionicons name="chevron-back" size={14} color={couleurs.texteSecondaire} />
              <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                Glisser pour annuler
              </Texte>
            </Animated.View>
          )}
        </>
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
