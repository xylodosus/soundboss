import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, View } from "react-native";
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
import { ReglageLabo } from "@/components/audio/reglage-labo";
import { BPM_MAX, BPM_MIN, clicsDansHorizon } from "@/lib/metronome";
import {
  demiTonsEntre,
  libelleTonalite,
  tonalitesDuMode,
  transposer,
} from "@/lib/tonalite";
import { ModalChoix } from "@/components/ui/modal-choix";
import { formatTemps } from "@/lib/format";
import { parsePics } from "@/lib/peaks";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs, espacement, rayons } from "@/lib/theme";

/** Saut avant/arrière du transport, en secondes. */
const SAUT = 10;
/** Cadence des remontées de position, en millisecondes (unité confirmée côté natif). */
const INTERVALLE_POSITION = 100;

const TEMPO_MIN = 0.5;
const TEMPO_MAX = 1.5;
const TEMPO_PAS = 0.05;
const DEMI_TONS_MAX = 6;

/**
 * Le natif ne réinitialise la transposition que si detune est non nul :
 * `if (detune != 0.0f) stretch_->setTransposeSemitones(detune);`. Revenir à zéro
 * exact laisserait le stretcher calé sur la dernière valeur. Un centième de cent
 * est inaudible et franchit le garde-fou.
 */
const CENT_NEUTRE = 0.01;

/**
 * Au-delà, on rend la main plutôt que de laisser tourner un sablier sans fin.
 * Cinq minutes de musique se décodent en cinq à six secondes ; passé une
 * minute et demie, quelque chose est cassé, pas lent.
 */
const DELAI_DECODAGE = 90_000;

/** Fenêtre de programmation du métronome, en secondes de tampon. */
const HORIZON_CLICS = 0.3;
const CADENCE_ORDONNANCEUR = 100;

/**
 * Contexte et tampon partagés entre deux ouvertures de la modale.
 *
 * Le décodage coûte cinq secondes : le refaire à chaque réouverture du même
 * morceau était insupportable à l'usage. Une seule entrée est gardée, donc le
 * plafond mémoire reste celui d'un morceau (~103 Mo) ; elle est relâchée quand
 * on ouvre un autre morceau, ou quand l'application passe en arrière-plan.
 */
let contextePartage: AudioContext | null = null;
let cache: { id: string; tampon: AudioBuffer; pics: number[] } | null = null;
let abonnementArrierePlan: { remove: () => void } | null = null;
/**
 * Décodage en vol, partagé entre les ouvertures.
 *
 * Le décodage natif ne s'annule pas : fermer la modale pendant qu'il travaille
 * ne l'arrête pas. Sans ce partage, rouvrir le morceau en lançait un second en
 * concurrence du premier — deux fois cent mégaoctets sur le même appareil, et
 * les deux finissaient par se bloquer. C'est ce que décrivait le sablier sans fin.
 */
let decodageEnVol: { id: string; promesse: Promise<AudioBuffer> } | null = null;
/** Vrai tant que la modale est affichée : on ne coupe pas le contexte sous les pieds. */
let laboOuvert = false;

function obtenirContexte(): AudioContext {
  if (!contextePartage) contextePartage = new AudioContext();
  return contextePartage;
}

function libererCache() {
  cache = null;
  contextePartage?.close();
  contextePartage = null;
  abonnementArrierePlan?.remove();
  abonnementArrierePlan = null;
}

function surveillerArrierePlan() {
  if (abonnementArrierePlan) return;
  abonnementArrierePlan = AppState.addEventListener("change", (etat) => {
    // Le labo n'a pas vocation à jouer en arrière-plan — c'est le rôle du
    // lecteur courant. Quitter l'app rend donc les 103 Mo.
    if (etat === "background" && !laboOuvert) libererCache();
  });
}

type Etat = "chargement" | "pret" | "erreur";

type Piste = {
  id: string;
  titre: string | null;
  url: string;
  peaks_url: string | null;
  duree_secondes: number | null;
  bpm: number | null;
  tonalite: string | null;
  tonalite_confiance: number | null;
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
  const [tempo, setTempo] = useState(1);
  const [transposition, setTransposition] = useState(0);
  const [boucle, setBoucle] = useState<{ a: number; b: number } | null>(null);
  const [metronome, setMetronome] = useState(false);
  // Un seul tempo de référence, en temps du tampon : il sert à afficher le tempo
  // du morceau, à en dériver le tempo joué, et à battre la mesure.
  const [bpmOrigine, setBpmOrigine] = useState(0);
  const [phase, setPhase] = useState(0);
  const [tonaliteOrigine, setTonaliteOrigine] = useState<string | null>(null);
  const [choix, setChoix] = useState<"origine" | "cible" | null>(null);
  const [tentative, setTentative] = useState(0);
  const [corrigerTempo, setCorrigerTempo] = useState(false);

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
  // Miroirs des réglages : demarrer() doit rester stable pour ne pas recréer le
  // nœud à chaque rendu, mais doit lire les valeurs courantes.
  const tempoRef = useRef(1);
  const transpositionRef = useRef(0);
  const boucleRef = useRef<{ a: number; b: number } | null>(null);
  const correctionActiveRef = useRef(false);
  const dernierClicRef = useRef(-1);
  tempoRef.current = tempo;
  transpositionRef.current = transposition;
  boucleRef.current = boucle;

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
      const contexte = contextePartage;
      const gain = gainRef.current;
      const tampon = tamponRef.current;
      if (!contexte || !gain || !tampon) return;

      libererSource();
      arretVolontaireRef.current = false;

      // La correction de hauteur n'est activée que si elle sert : à 1x sans
      // transposition, le signal ne traverse pas le stretcher, donc ni coût
      // processeur ni artefact sur une écoute normale.
      const correction = tempoRef.current !== 1 || transpositionRef.current !== 0;
      const source = contexte.createBufferSource({ pitchCorrection: correction });
      correctionActiveRef.current = correction;
      source.buffer = tampon;
      source.playbackRate.value = tempoRef.current;
      source.detune.value =
        transpositionRef.current === 0 ? CENT_NEUTRE : transpositionRef.current * 100;
      const bornes = boucleRef.current;
      if (bornes) {
        source.loop = true;
        source.loopStart = bornes.a;
        source.loopEnd = bornes.b;
      }
      dernierClicRef.current = -1;
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

  useEffect(() => {
    laboOuvert = visible;
    return () => {
      laboOuvert = false;
    };
  }, [visible]);

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
    setTempo(1);
    setTransposition(0);
    setBoucle(null);
    setMetronome(false);
    setPhase(0);
    setBpmOrigine(piste.bpm ?? 0);
    setCorrigerTempo(false);
    // Proposition du conteneur, corrigeable : les profils de Krumhansl-Schmuckler
    // confondent volontiers une tonalité avec sa relative mineure.
    setTonaliteOrigine(piste.tonalite);

    (async () => {
      try {
        const contexte = obtenirContexte();
        const gain = contexte.createGain();
        // Le gain ne sert à rien tel quel : il est câblé dès maintenant pour que
        // l'égaliseur du lot E3 s'insère entre la source et lui sans refonte.
        gain.connect(contexte.destination);
        if (annule) {
          gain.disconnect();
          return;
        }
        gainRef.current = gain;

        if (cache?.id === piste.id) {
          tamponRef.current = cache.tampon;
          setPics(cache.pics);
          setDuree(cache.tampon.duration);
          setEtat("pret");
          return;
        }

        // Un autre morceau : l'entrée précédente n'a plus lieu d'être.
        cache = null;

        let lus: number[] = [];
        if (piste.peaks_url) {
          const urlPics = await urlLectureR2(piste.peaks_url);
          if (urlPics) {
            const reponse = await fetch(urlPics);
            if (reponse.ok) lus = parsePics(await reponse.text()) ?? [];
          }
        }
        if (!annule && lus.length > 0) setPics(lus);

        const url = await urlLectureR2(piste.url);
        if (!url) throw new Error("Lien de lecture indisponible.");

        // Décoder à la fréquence du contexte, et non à celle du fichier :
        // l'index de lecture natif avance d'un échantillon du tampon par image
        // de sortie, sans corriger l'écart. Un fichier à 44 100 Hz joué dans un
        // contexte à 48 000 Hz sortait 1,088x trop vite, soit un demi-ton et
        // demi trop haut.
        if (!decodageEnVol || decodageEnVol.id !== piste.id) {
          const promesse = decodeAudioData(url, contexte.sampleRate);
          // Sans consommateur, un rejet remonterait en avertissement global.
          promesse.catch(() => undefined);
          decodageEnVol = { id: piste.id, promesse };
        }
        const enVol = decodageEnVol;

        let tampon: AudioBuffer;
        try {
          tampon = await avecDelai(enVol.promesse, DELAI_DECODAGE);
        } catch (e) {
          // Sur expiration, la promesse est CONSERVÉE : le décodage natif
          // continue, et un nouvel essai le rattrapera au lieu d'en lancer un
          // second à côté. Sur un vrai échec, en revanche, elle ne servira plus.
          if (!(e instanceof DelaiExpire) && decodageEnVol === enVol) decodageEnVol = null;
          throw e;
        }
        if (decodageEnVol === enVol) decodageEnVol = null;
        if (annule) return;

        tamponRef.current = tampon;
        cache = { id: piste.id, tampon, pics: lus };
        surveillerArrierePlan();
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
  }, [visible, piste, tentative]);

  // À la fermeture on démonte le graphe, mais on garde le tampon décodé : c'est
  // tout l'intérêt du cache. Il part avec libererCache(), à l'ouverture d'un
  // autre morceau ou au passage en arrière-plan.
  useEffect(() => {
    if (visible) return;
    libererSource();
    gainRef.current?.disconnect();
    gainRef.current = null;
    tamponRef.current = null;
    setDuree(0);
  }, [visible, libererSource]);

  // Changement de tempo ou de transposition en cours de lecture. Tant qu'on
  // reste du même côté du neutre, écrire dans les paramètres suffit : pas de
  // recréation, donc pas de coupure. Franchir la frontière impose un nœud neuf,
  // puisque pitchCorrection se fixe à la construction.
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;
    const correction = tempo !== 1 || transposition !== 0;
    if (correction !== correctionActiveRef.current) {
      demarrer(positionRef.current);
      return;
    }
    source.playbackRate.value = tempo;
    source.detune.value = transposition === 0 ? CENT_NEUTRE : transposition * 100;
    dernierClicRef.current = -1;
  }, [tempo, transposition, demarrer]);

  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;
    if (boucle) {
      source.loop = true;
      source.loopStart = boucle.a;
      source.loopEnd = boucle.b;
    } else {
      source.loop = false;
    }
  }, [boucle]);

  // Ordonnanceur du métronome : programme les clics un peu à l'avance, car les
  // rendez-vous audio se prennent sur l'horloge du contexte, pas sur celle de JS.
  useEffect(() => {
    if (!metronome || etat !== "pret" || !enLecture) return;
    const contexte = contextePartage;
    if (!contexte) return;

    const minuteur = setInterval(() => {
      const pos = positionRef.current;
      for (const instant of clicsDansHorizon(pos, phase, bpmOrigine, HORIZON_CLICS)) {
        if (instant <= dernierClicRef.current) continue;
        // Le tempo est au dénominateur : à 0,8x, une seconde de morceau dure
        // 1,25 seconde réelle.
        programmerClic(contexte, contexte.currentTime + (instant - pos) / tempoRef.current);
        dernierClicRef.current = instant;
      }
    }, CADENCE_ORDONNANCEUR);

    return () => clearInterval(minuteur);
  }, [metronome, etat, enLecture, phase, bpmOrigine]);

  function basculer() {
    if (etat !== "pret") return;
    if (enLecture) {
      libererSource();
      setEnLecture(false);
    } else {
      demarrer(positionRef.current);
    }
  }

  function deplacerBorne(borne: "debut" | "fin", secondes: number) {
    setBoucle((b) => {
      if (!b) return b;
      const cible = Math.min(Math.max(0, secondes), duree);
      // Les bornes ne se croisent pas : un quart de seconde les sépare au moins,
      // sinon la boucle deviendrait un bourdonnement.
      const ecart = 0.25;
      return borne === "debut"
        ? { a: Math.min(cible, b.b - ecart), b: b.b }
        : { a: b.a, b: Math.max(cible, b.a + ecart) };
    });
  }

  function allerA(secondes: number) {
    if (etat !== "pret") return;
    const cible = Math.min(Math.max(0, secondes), duree);
    positionRef.current = cible;
    setPosition(cible);
    dernierClicRef.current = -1;
    if (enLecture) demarrer(cible);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View
          style={{
            flex: 1,
            paddingTop: espacement.lg + insets.top,
            paddingHorizontal: espacement.xl,
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
              <View style={{ flexDirection: "row" }}>
                <Puce
                  libelle="Réessayer"
                  actif
                  onPress={() => setTentative((n) => n + 1)}
                />
              </View>
            </View>
          )}

          {etat === "pret" && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: espacement.lg }}
              showsVerticalScrollIndicator={false}
            >
              <Waveform
                pics={pics}
                progression={duree > 0 ? position / duree : 0}
                surDeplacer={(ratio) => allerA(ratio * duree)}
                boucle={
                  boucle && duree > 0
                    ? { debut: boucle.a / duree, fin: boucle.b / duree }
                    : null
                }
                surDeplacerBorne={(borne, ratio) => deplacerBorne(borne, ratio * duree)}
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

              <View style={{ height: 1, backgroundColor: couleurs.bordure }} />

              <ReglageLabo
                libelle="Tempo"
                valeurAffichee={
                  bpmOrigine > 0 ? `${Math.round(bpmOrigine * tempo)} BPM` : `${tempo.toFixed(2)}x`
                }
                auNeutre={tempo === 1}
                onMoins={() => setTempo((v) => pasTempo(v, -1, bpmOrigine))}
                onPlus={() => setTempo((v) => pasTempo(v, 1, bpmOrigine))}
                onNeutre={() => setTempo(1)}
              />

              {/* Valeur de référence, pas un réglage de lecture : au même niveau
                  que « Tempo » elle affichait le même nombre avec les mêmes
                  boutons, et rien ne les distinguait. */}
              <Pressable
                onPress={() => setCorrigerTempo((v) => !v)}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {bpmOrigine > 0
                    ? `Tempo du morceau : ${bpmOrigine} BPM — appuyer pour corriger`
                    : "Tempo du morceau inconnu — appuyer pour l'indiquer"}
                </Texte>
              </Pressable>

              {corrigerTempo && (
                <View style={{ gap: espacement.sm }}>
                  <ReglageLabo
                    libelle="Corriger"
                    valeurAffichee={bpmOrigine > 0 ? `${bpmOrigine} BPM` : "—"}
                    auNeutre={bpmOrigine === (piste?.bpm ?? 0)}
                    onMoins={() => setBpmOrigine((v) => Math.max(BPM_MIN, (v || 100) - 1))}
                    onPlus={() => setBpmOrigine((v) => Math.min(BPM_MAX, (v || 100) + 1))}
                    onNeutre={() => setBpmOrigine(piste?.bpm ?? 0)}
                  />
                  {/* La détection se trompe surtout d'une octave rythmique :
                      ABBA se lit 170 ou 85 selon ce qu'on appelle le temps. */}
                  <View style={{ flexDirection: "row", gap: espacement.sm }}>
                    <Puce
                      libelle="Moitié"
                      actif={false}
                      onPress={() => setBpmOrigine((v) => Math.max(BPM_MIN, Math.round(v / 2)))}
                    />
                    <Puce
                      libelle="Double"
                      actif={false}
                      onPress={() => setBpmOrigine((v) => Math.min(BPM_MAX, v * 2))}
                    />
                  </View>
                </View>
              )}

              <ReglageLabo
                libelle="Tonalité"
                valeurAffichee={
                  tonaliteOrigine
                    ? libelleTonalite(transposer(tonaliteOrigine, transposition))
                    : demiTons(transposition)
                }
                auNeutre={transposition === 0}
                onMoins={() => setTransposition((v) => Math.max(-DEMI_TONS_MAX, v - 1))}
                onPlus={() => setTransposition((v) => Math.min(DEMI_TONS_MAX, v + 1))}
                onNeutre={() => setTransposition(0)}
                onValeur={tonaliteOrigine ? () => setChoix("cible") : undefined}
              />

              {/* Le conteneur ne détecte pas encore la tonalité : tant qu'elle
                  n'est pas déclarée, seuls les demi-tons ont un sens. */}
              <Pressable
                onPress={() => setChoix("origine")}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {tonaliteOrigine
                    ? `Tonalité d'origine : ${libelleTonalite(tonaliteOrigine)} — appuyer pour corriger`
                    : "Indiquer la tonalité d'origine pour choisir par nom"}
                </Texte>
              </Pressable>

              <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
                  Boucle
                </Texte>
                <Puce
                  libelle="A"
                  actif={!!boucle}
                  onPress={() =>
                    setBoucle((b) => ({
                      a: positionRef.current,
                      // Sans borne de fin, la boucle n'a pas de sens : on prend
                      // la fin du morceau tant que B n'est pas posé.
                      b: b && b.b > positionRef.current ? b.b : duree,
                    }))
                  }
                />
                <Puce
                  libelle="B"
                  actif={!!boucle}
                  onPress={() =>
                    setBoucle((b) =>
                      // Poser B avant A n'aurait pas de sens : on ignore.
                      b && positionRef.current > b.a ? { a: b.a, b: positionRef.current } : b
                    )
                  }
                />
                <Puce libelle="Effacer" actif={false} onPress={() => setBoucle(null)} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
                  Métronome
                </Texte>
                <Puce
                  libelle={metronome ? "Actif" : "Inactif"}
                  actif={metronome}
                  onPress={() => {
                    if (!metronome && bpmOrigine === 0) setBpmOrigine(100);
                    setMetronome((v) => !v);
                  }}
                />
                <Puce
                  libelle="Caler"
                  actif={false}
                  onPress={() => {
                    setPhase(positionRef.current);
                    dernierClicRef.current = -1;
                  }}
                />
              </View>
            </ScrollView>
          )}
        </View>

        <ModalChoix
          visible={choix !== null}
          titre={choix === "origine" ? "Tonalité d'origine" : "Transposer vers"}
          elements={tonalitesDuMode(choix === "cible" ? tonaliteOrigine : null).map((t) => ({
            id: t.id,
            titre: `${t.note} ${t.mode}`,
            sousTitre:
              choix === "cible" && tonaliteOrigine
                ? demiTons(demiTonsEntre(tonaliteOrigine, t.id))
                : undefined,
          }))}
          surChoisir={(id) => {
            if (choix === "origine") {
              // On déclare la tonalité du morceau, pas celle qu'on entend après
              // transposition : la transposition courante n'y touche pas.
              setTonaliteOrigine(id);
            } else {
              setTransposition(demiTonsEntre(tonaliteOrigine, id));
            }
            setChoix(null);
          }}
          onFermer={() => setChoix(null)}
        />
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

/** Distingue une attente trop longue d'un vrai échec : les deux ne se rattrapent pas pareil. */
class DelaiExpire extends Error {
  constructor() {
    super("Le décodage prend anormalement longtemps. Réessaie dans un instant.");
    this.name = "DelaiExpire";
  }
}

/** Rejette si la promesse n'a pas abouti à temps. Le travail natif continue en
 *  coulisses — on ne sait pas l'interrompre — mais l'écran cesse d'attendre. */
function avecDelai<T>(promesse: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resoudre, rejeter) => {
    const minuteur = setTimeout(() => rejeter(new DelaiExpire()), ms);
    promesse.then(
      (v) => {
        clearTimeout(minuteur);
        resoudre(v);
      },
      (e) => {
        clearTimeout(minuteur);
        rejeter(e);
      }
    );
  });
}

/** Les pas de 0,05 accumulent des erreurs binaires : 1,0499999 s'afficherait mal. */
function arrondir(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Un cran de tempo. Quand le tempo du morceau est connu, on raisonne en
 * battements par minute — c'est l'unité du musicien ; sinon en multiplicateur.
 */
function pasTempo(tempo: number, sens: number, bpmOrigine: number): number {
  if (bpmOrigine > 0) {
    const cible = Math.round(bpmOrigine * tempo) + sens;
    return arrondir(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, cible / bpmOrigine)));
  }
  return arrondir(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, tempo + sens * TEMPO_PAS)));
}

function demiTons(n: number): string {
  if (n === 0) return "0";
  return `${n > 0 ? "+" : ""}${n} ${Math.abs(n) > 1 ? "tons" : "ton"}`;
}

function Puce({
  libelle,
  actif,
  onPress,
}: {
  libelle: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      style={{
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: espacement.lg,
        borderRadius: rayons.pill,
        backgroundColor: actif ? couleurs.warmGold15 : couleurs.surfaceCarte,
      }}
    >
      <Texte variante="petit" poids="semibold" couleur={actif ? couleurs.warmGold : couleurs.texte}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Un clic bref : sinusoïde percussive branchée en direct sur la sortie. */
function programmerClic(contexte: AudioContext, quand: number) {
  if (quand < contexte.currentTime) return;
  const oscillateur = contexte.createOscillator();
  const enveloppe = contexte.createGain();
  oscillateur.frequency.value = 1200;
  enveloppe.gain.setValueAtTime(0.3, quand);
  enveloppe.gain.exponentialRampToValueAtTime(0.001, quand + 0.05);
  oscillateur.connect(enveloppe);
  // Branché sur la destination et non sur le gain du morceau : l'égaliseur du
  // lot E3 s'insérera sur ce gain, et il n'a rien à faire au clic.
  enveloppe.connect(contexte.destination);
  oscillateur.start(quand);
  oscillateur.stop(quand + 0.06);
}
