import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioContext,
  decodeAudioData,
  type AudioBuffer,
  type AudioBufferSourceNode,
  type GainNode,
} from "react-native-audio-api";

import { Texte } from "@/components/ui/texte";
import { Waveform } from "@/components/audio/waveform";
import { formatTemps } from "@/lib/format";
import { parsePics } from "@/lib/peaks";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs, espacement, rayons } from "@/lib/theme";

/** Saut avant/arrière du transport, en secondes. */
const SAUT = 10;
/** Cadence des remontées de position, en millisecondes (unité confirmée côté natif). */
const INTERVALLE_POSITION = 100;

type Etat = "chargement" | "pret" | "erreur";

type Piste = {
  id: string;
  titre: string | null;
  url: string;
  peaks_url: string | null;
  duree_secondes: number | null;
};

/**
 * Labo audio — lecture d'un enregistrement de répétition sur un tampon décodé.
 *
 * Volontairement séparé du lecteur courant, qui reste sur expo-audio : ici le
 * fichier est décodé entièrement en mémoire (~103 Mo et ~5,5 s pour cinq
 * minutes, mesuré sur Pocophone F1), ce qui est le prix à payer pour que les
 * lots suivants puissent poser tempo, transposition et égaliseur sur le signal.
 *
 * Le comptage des écoutes n'est pas branché ici : travailler un passage en
 * boucle n'est pas « écouter l'audio » au sens du suivi du chef de groupe.
 */
export function LaboAudio({
  piste,
  visible,
  onFermer,
}: {
  piste: Piste | null;
  visible: boolean;
  onFermer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [etat, setEtat] = useState<Etat>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [pics, setPics] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [duree, setDuree] = useState(0);
  const [enLecture, setEnLecture] = useState(false);

  const contexteRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const tamponRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Un AudioBufferSourceNode ne se relit pas : chaque reprise en crée un neuf,
  // démarré à cet offset. C'est donc ici, et non dans le nœud, que vit la
  // position de lecture entre deux pauses.
  const positionRef = useRef(0);
  // stop() déclenche onEnded comme la fin naturelle. Sans ce drapeau, mettre en
  // pause remettrait la lecture à zéro.
  const arretVolontaireRef = useRef(false);

  const libererSource = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    arretVolontaireRef.current = true;
    try {
      source.onPositionChanged = null;
      source.onEnded = null;
      source.stop();
      source.disconnect();
    } catch {
      // Le nœud peut déjà être arrêté ; rien à récupérer.
    }
    sourceRef.current = null;
  }, []);

  const demarrer = useCallback(
    (offset: number) => {
      const contexte = contexteRef.current;
      const gain = gainRef.current;
      const tampon = tamponRef.current;
      if (!contexte || !gain || !tampon) return;

      libererSource();
      arretVolontaireRef.current = false;

      const source = contexte.createBufferSource();
      source.buffer = tampon;
      source.onPositionChangedInterval = INTERVALLE_POSITION;
      // value est la position en secondes dans le tampon, pas un nombre d'images.
      source.onPositionChanged = ({ value }) => {
        positionRef.current = value;
        setPosition(value);
      };
      source.onEnded = () => {
        if (arretVolontaireRef.current) return;
        setEnLecture(false);
        positionRef.current = 0;
        setPosition(0);
      };
      source.connect(gain);
      source.start(0, offset);
      sourceRef.current = source;
      setEnLecture(true);
    },
    [libererSource]
  );

  // Chargement : URL signée, pics, puis décodage. Le décodage est long (~5,5 s
  // sur cinq minutes), d'où un état explicite plutôt qu'un écran figé.
  useEffect(() => {
    if (!visible || !piste) return;
    let annule = false;

    setEtat("chargement");
    setMessage(null);
    setPics([]);
    setPosition(0);
    positionRef.current = 0;
    setEnLecture(false);

    (async () => {
      try {
        const contexte = new AudioContext();
        const gain = contexte.createGain();
        // Le gain ne sert à rien tel quel : il est câblé dès maintenant pour que
        // l'égaliseur du lot E3 s'insère entre la source et lui sans refonte.
        gain.connect(contexte.destination);
        if (annule) {
          contexte.close();
          return;
        }
        contexteRef.current = contexte;
        gainRef.current = gain;

        // Les pics d'abord : la waveform peut s'afficher avant la fin du décodage.
        if (piste.peaks_url) {
          const urlPics = await urlLectureR2(piste.peaks_url);
          if (urlPics) {
            const reponse = await fetch(urlPics);
            if (reponse.ok) {
              const lus = parsePics(await reponse.text());
              if (!annule && lus) setPics(lus);
            }
          }
        }

        const url = await urlLectureR2(piste.url);
        if (!url) throw new Error("Lien de lecture indisponible.");
        const tampon = await decodeAudioData(url);
        if (annule) return;

        tamponRef.current = tampon;
        setDuree(tampon.duration);
        setEtat("pret");
      } catch (e) {
        if (annule) return;
        setMessage(e instanceof Error ? e.message : String(e));
        setEtat("erreur");
      }
    })();

    return () => {
      annule = true;
    };
  }, [visible, piste]);

  // Libération à la fermeture : c'est le seul endroit qui rend les ~103 Mo.
  useEffect(() => {
    if (visible) return;
    libererSource();
    tamponRef.current = null;
    gainRef.current = null;
    contexteRef.current?.close();
    contexteRef.current = null;
    setDuree(0);
  }, [visible, libererSource]);

  function basculer() {
    if (etat !== "pret") return;
    if (enLecture) {
      libererSource();
      setEnLecture(false);
    } else {
      demarrer(positionRef.current);
    }
  }

  function allerA(secondes: number) {
    if (etat !== "pret") return;
    const cible = Math.min(Math.max(0, secondes), duree);
    positionRef.current = cible;
    setPosition(cible);
    if (enLecture) demarrer(cible);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onFermer} accessibilityLabel="Fermer le labo" />
        <View
          style={{
            backgroundColor: couleurs.carte,
            borderTopLeftRadius: rayons.xl,
            borderTopRightRadius: rayons.xl,
            padding: espacement.xl,
            paddingBottom: espacement.xl + insets.bottom,
            gap: espacement.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.md }}>
            <View style={{ flex: 1 }}>
              <Texte variante="titre3" numberOfLines={1}>
                {piste?.titre ?? "Audio"}
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Labo — travail du morceau
              </Texte>
            </View>
            <Pressable
              onPress={onFermer}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={22} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          {etat === "chargement" && (
            <View style={{ paddingVertical: espacement.xl, gap: espacement.sm, alignItems: "center" }}>
              <ActivityIndicator color={couleurs.warmGold} />
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Préparation du morceau…
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Le fichier est décodé en entier, cela prend quelques secondes.
              </Texte>
            </View>
          )}

          {etat === "erreur" && (
            <View style={{ paddingVertical: espacement.xl, gap: espacement.sm }}>
              <Texte variante="petit" couleur={couleurs.danger}>
                {"Impossible d'ouvrir ce morceau dans le labo."}
              </Texte>
              {message && (
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {message}
                </Texte>
              )}
            </View>
          )}

          {etat === "pret" && (
            <>
              <Waveform
                pics={pics}
                progression={duree > 0 ? position / duree : 0}
                surDeplacer={(ratio) => allerA(ratio * duree)}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {formatTemps(position)}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {formatTemps(duree)}
                </Texte>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: espacement.xl,
                }}
              >
                <BoutonTransport
                  icone="play-back"
                  label={`Reculer de ${SAUT} secondes`}
                  onPress={() => allerA(positionRef.current - SAUT)}
                />
                <Pressable
                  onPress={basculer}
                  accessibilityRole="button"
                  accessibilityLabel={enLecture ? "Pause" : "Lecture"}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: rayons.pill,
                    backgroundColor: couleurs.warmGold,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={enLecture ? "pause" : "play"}
                    size={28}
                    color={couleurs.charcoal}
                    style={enLecture ? undefined : { marginLeft: 3 }}
                  />
                </Pressable>
                <BoutonTransport
                  icone="play-forward"
                  label={`Avancer de ${SAUT} secondes`}
                  onPress={() => allerA(positionRef.current + SAUT)}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function BoutonTransport({
  icone,
  label,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icone} size={24} color={couleurs.texte} />
    </Pressable>
  );
}
