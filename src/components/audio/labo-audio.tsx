import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioContext,
  decodeAudioData,
  type AudioBuffer,
  type AudioBufferSourceNode,
  type BiquadFilterNode,
  type GainNode,
} from "react-native-audio-api";

import { Texte } from "@/components/ui/texte";
import { Waveform } from "@/components/audio/waveform";
import { ReglageLabo } from "@/components/audio/reglage-labo";
import { Egaliseur } from "@/components/audio/egaliseur";
import {
  BANDES,
  GAIN_MAX,
  POST_GAIN_MAX,
  Q_CLOCHE,
  gainLineaire,
} from "@/lib/egaliseur";
import { BPM_MAX, BPM_MIN, clicsDansHorizon } from "@/lib/metronome";
import {
  demiTonsEntre,
  libelleTonalite,
  parseSections,
  resumeSections,
  sectionA,
  tonalitesDuMode,
  transposer,
} from "@/lib/tonalite";
import { ModalChoix } from "@/components/ui/modal-choix";
import { useDialogue } from "@/lib/dialogue";
import {
  clefsSeances,
  useAjouterEnregistrement,
  useDemanderStems,
  useStatutStems,
  useStemsEnregistrement,
} from "@/lib/queries/seances";
import {
  PLAFOND_MEMOIRE,
  gainEffectif,
  libelleStem,
  memoireEstimee,
  ordonnerStems,
  peutCharger,
  titreStem,
  type EtatMixage,
} from "@/lib/stems";
import { Mixeur } from "@/components/audio/mixeur";
import { OngletCreation } from "@/components/audio/onglet-creation";
import { ModalChoixMultiple } from "@/components/ui/modal-choix-multiple";
import { useAjouterRessource } from "@/lib/queries/ressources";
import { useQueryClient } from "@tanstack/react-query";
import { telechargerEtPartager } from "@/lib/telechargement";
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
/**
 * Pistes séparées décodées, gardées entre deux ouvertures du même morceau.
 *
 * Elles pèsent lourd — cinq tampons — donc elles partent en même temps que le
 * mixage, dès qu'on ouvre un autre morceau ou que l'application passe en
 * arrière-plan.
 */
let cacheStems: { id: string; tampons: Map<string, AudioBuffer> } | null = null;
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
  cacheStems = null;
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
  /** JSONB : validé à l'usage, jamais converti de force. */
  tonalite_sections: unknown;
  /** Tant qu'elle est nulle, le conteneur n'a pas encore converti le fichier. */
  analyzed_at: string | null;
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
  seanceId,
  groupeId,
  pupitres = [],
  avecStems = true,
}: {
  piste: Piste | null;
  visible: boolean;
  onFermer: () => void;
  /** Contexte du transfert d'une piste vers les audios ou les fichiers. */
  seanceId?: string;
  groupeId?: string;
  pupitres?: { id: string; nom: string; couleur?: string | null }[];
  /**
   * Faux pour un audio qui n'est pas un enregistrement de répétition — un
   * fichier de groupe, une note vocale. Ces audios n'ont pas de ligne dans
   * `seance_enregistrements`, donc ni pistes séparées ni statut à interroger.
   */
  avecStems?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const dialogue = useDialogue();
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
  // Correction manuelle. Tant qu'elle est nulle, l'origine suit la chronologie
  // détectée, qui change au fil de la lecture quand le morceau module.
  const [tonaliteManuelle, setTonaliteManuelle] = useState<string | null>(null);
  const [choix, setChoix] = useState<"origine" | "cible" | null>(null);
  const [tentative, setTentative] = useState(0);
  const [corrigerTempo, setCorrigerTempo] = useState(false);
  const [egaliseur, setEgaliseur] = useState<number[]>(() => BANDES.map(() => 0));
  const [egaliseurActif, setEgaliseurActif] = useState(true);
  const [postGain, setPostGain] = useState(0);
  const [chargementStems, setChargementStems] = useState(false);
  /** Pistes réellement décodées et jouées. Vide = mixage complet. */
  const [pistesActives, setPistesActives] = useState<string[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [mutes, setMutes] = useState<Set<string>>(() => new Set());
  const [solos, setSolos] = useState<Set<string>>(() => new Set());
  const [pisteEnChargement, setPisteEnChargement] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState<string | null>(null);
  const [transfert, setTransfert] = useState<string | null>(null);
  const [choixPupitres, setChoixPupitres] = useState<string | null>(null);
  const [messageStems, setMessageStems] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("lecteur");

  const gainRef = useRef<GainNode | null>(null);
  const filtresRef = useRef<BiquadFilterNode[]>([]);
  // Une piste en mode mixage, plusieurs en mode stems. Le moteur ne fait pas
  // la différence : c'est la même liste, longue de un ou de cinq.
  const pistesRef = useRef<{ id: string; tampon: AudioBuffer }[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  /** Un gain par piste, pour couper une voix sans toucher aux autres. */
  const gainsPistesRef = useRef<Map<string, GainNode>>(new Map());
  /** Instant du contexte auquel la lecture a démarré, et position de départ. */
  const pisteRef = useRef(piste);
  pisteRef.current = piste;
  const departRef = useRef(0);
  const offsetDepartRef = useRef(0);
  // Un AudioBufferSourceNode ne se relit pas : chaque reprise en crée un neuf,
  // démarré à cet offset. C'est donc ici, et non dans le nœud, que vit la
  // position de lecture entre deux pauses.
  const positionRef = useRef(0);
  // stop() déclenche onEnded comme la fin naturelle. Sans ce drapeau, mettre en
  // pause remettrait la lecture à zéro.
  const arretVolontaireRef = useRef(false);
  // La lecture est suspendue le temps du glissement puis reprise au relâchement.
  const reprendreApresGesteRef = useRef(false);
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
    if (sourcesRef.current.length === 0) return;
    arretVolontaireRef.current = true;
    for (const source of sourcesRef.current) {
      try {
        source.onPositionChanged = null;
        source.onEnded = null;
        source.stop();
        source.disconnect();
      } catch {
        // Le nœud peut déjà être arrêté ; rien à récupérer.
      }
    }
    sourcesRef.current = [];
  }, []);

  const demarrer = useCallback(
    (offset: number) => {
      const contexte = contextePartage;
      const gainMaitre = gainRef.current;
      const pistes = pistesRef.current;
      if (!contexte || !gainMaitre || pistes.length === 0) return;

      libererSource();
      arretVolontaireRef.current = false;

      // La correction de hauteur n'est activée que si elle sert : à 1x sans
      // transposition, le signal ne traverse pas le stretcher, donc ni coût
      // processeur ni artefact sur une écoute normale.
      const correction = tempoRef.current !== 1 || transpositionRef.current !== 0;
      correctionActiveRef.current = correction;
      dernierClicRef.current = -1;

      // Toutes les pistes démarrent au MÊME instant du contexte, pas « maintenant » :
      // créer cinq nœuds prend quelques millisecondes, et démarrer chacun à sa
      // création les décalerait les uns des autres de façon audible.
      const depart = contexte.currentTime + 0.15;
      departRef.current = depart;
      offsetDepartRef.current = offset;
      const entree = filtresRef.current[0] ?? gainMaitre;

      const nouvelles: AudioBufferSourceNode[] = [];
      pistes.forEach((p, index) => {
        const source = creerSource(contexte, entree, p, correction, index === 0);
        source.start(depart, offset);
        nouvelles.push(source);
      });

      sourcesRef.current = nouvelles;
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

  /** Fabrique une source réglée et branchée, sans la démarrer. */
  function creerSource(
    contexte: AudioContext,
    entree: BiquadFilterNode | GainNode,
    p: { id: string; tampon: AudioBuffer },
    correction: boolean,
    porteLeSuivi: boolean
  ): AudioBufferSourceNode {
    const source = contexte.createBufferSource({ pitchCorrection: correction });
    source.buffer = p.tampon;
    source.playbackRate.value = tempoRef.current;
    source.detune.value =
      transpositionRef.current === 0 ? CENT_NEUTRE : transpositionRef.current * 100;
    const bornes = boucleRef.current;
    if (bornes) {
      source.loop = true;
      source.loopStart = bornes.a;
      source.loopEnd = bornes.b;
    }

    let gainPiste = gainsPistesRef.current.get(p.id);
    if (!gainPiste) {
      gainPiste = contexte.createGain();
      gainPiste.connect(entree);
      gainsPistesRef.current.set(p.id, gainPiste);
    }
    gainPiste.gain.value = p.id === "mixage" ? 1 : gainEffectif(p.id, etatMixageRef.current);
    source.connect(gainPiste);

    // Une seule piste porte le suivi : cinq abonnements diraient la même chose
    // cinq fois, puisqu'elles avancent ensemble.
    if (porteLeSuivi) {
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
    }
    return source;
  }

  /**
   * Ajoute une piste à une lecture déjà en cours, **sans toucher aux autres**.
   *
   * Relancer les cinq sources pour en ajouter une était la vraie cause du
   * décalage : la recréation coûte plusieurs dizaines de millisecondes par
   * nœud, et les dernières rataient le rendez-vous commun. Ici on ne crée
   * qu'une source, calée sur l'horloge audio — c'est le motif que recommandent
   * les implémentations Web Audio multipistes.
   */
  function ajouterEnLecture(p: { id: string; tampon: AudioBuffer }) {
    const contexte = contextePartage;
    const gainMaitre = gainRef.current;
    if (!contexte || !gainMaitre) return false;

    const marge = 0.08;
    const quand = contexte.currentTime + marge;
    // La position à laquelle démarrer n'est pas celle d'aujourd'hui mais celle
    // qu'aura la lecture à l'instant du rendez-vous.
    const offset = positionReelle() + marge * tempoRef.current;
    if (offset >= duree) return false;

    const source = creerSource(
      contexte,
      filtresRef.current[0] ?? gainMaitre,
      p,
      correctionActiveRef.current,
      sourcesRef.current.length === 0
    );
    source.start(quand, offset);
    sourcesRef.current = [...sourcesRef.current, source];
    pistesRef.current = [...pistesRef.current, p];
    return true;
  }

  /** Retire une piste sans interrompre les autres. */
  function retirerDeLaLecture(stemId: string) {
    const index = pistesRef.current.findIndex((p) => p.id === stemId);
    if (index === -1) return false;
    const source = sourcesRef.current[index];
    if (source) {
      try {
        source.onPositionChanged = null;
        source.onEnded = null;
        source.stop();
        source.disconnect();
      } catch {
        // Le nœud peut déjà être arrêté ; rien à récupérer.
      }
    }
    sourcesRef.current = sourcesRef.current.filter((_, i) => i !== index);
    pistesRef.current = pistesRef.current.filter((_, i) => i !== index);
    return true;
  }

  // Chargement : URL signée, pics, puis décodage. Le décodage est long (~5,5 s
  // sur cinq minutes), d'où un état explicite plutôt qu'un écran figé.
  useEffect(() => {
    const piste = pisteRef.current;
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
    setEgaliseur(BANDES.map(() => 0));
    setEgaliseurActif(true);
    setPostGain(0);
    setPistesActives([]);
    setVolumes({});
    setMutes(new Set());
    setSolos(new Set());
    setMessageStems(null);
    setOnglet("lecteur");
    setTonaliteManuelle(null);

    (async () => {
      try {
        const contexte = obtenirContexte();
        const gain = contexte.createGain();
        gain.connect(contexte.destination);

        // source → filtre1 → … → filtre5 → gain → sortie. Les filtres restent
        // montés même à plat : un biquad coûte quelques multiplications par
        // échantillon, bien moins que de recâbler le graphe à chaque réglage.
        const filtres = BANDES.map((bande) => {
          const f = contexte.createBiquadFilter();
          f.type = bande.type;
          f.frequency.value = bande.frequence;
          if (bande.type === "peaking") f.Q.value = Q_CLOCHE;
          f.gain.value = 0;
          return f;
        });
        filtres.forEach((f, i) => f.connect(i + 1 < filtres.length ? filtres[i + 1] : gain));

        if (annule) {
          filtres.forEach((f) => f.disconnect());
          gain.disconnect();
          return;
        }
        gainRef.current = gain;
        filtresRef.current = filtres;

        if (cache?.id === piste.id) {
          pistesRef.current = [{ id: "mixage", tampon: cache.tampon }];
          setPics(cache.pics);
          setDuree(cache.tampon.duration);
          setEtat("pret");
          return;
        }

        // Un autre morceau : les entrées précédentes n'ont plus lieu d'être.
        cache = null;
        cacheStems = null;

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

        pistesRef.current = [{ id: "mixage", tampon }];
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
    // Dépendance sur l'IDENTIFIANT du morceau, jamais sur l'objet : la requête
    // se rafraîchit au lancement d'une extraction puis à sa fin, et un nouvel
    // objet faisait croire à un changement de morceau — tout était remis à
    // plat, y compris l'onglet ouvert, en plein milieu du travail.
  }, [visible, piste?.id, tentative]);

  // À la fermeture on démonte le graphe, mais on garde le tampon décodé : c'est
  // tout l'intérêt du cache. Il part avec libererCache(), à l'ouverture d'un
  // autre morceau ou au passage en arrière-plan.
  useEffect(() => {
    if (visible) return;
    libererSource();
    gainsPistesRef.current.forEach((g) => g.disconnect());
    gainsPistesRef.current.clear();
    filtresRef.current.forEach((f) => f.disconnect());
    filtresRef.current = [];
    gainRef.current?.disconnect();
    gainRef.current = null;
    pistesRef.current = [];
    setDuree(0);
  }, [visible, libererSource]);

  // Changement de tempo ou de transposition en cours de lecture. Tant qu'on
  // reste du même côté du neutre, écrire dans les paramètres suffit : pas de
  // recréation, donc pas de coupure. Franchir la frontière impose un nœud neuf,
  // puisque pitchCorrection se fixe à la construction.
  useEffect(() => {
    const sources = sourcesRef.current;
    if (sources.length === 0) return;
    const correction = tempo !== 1 || transposition !== 0;
    if (correction !== correctionActiveRef.current) {
      demarrer(positionRef.current);
      return;
    }
    for (const source of sources) {
      source.playbackRate.value = tempo;
      source.detune.value = transposition === 0 ? CENT_NEUTRE : transposition * 100;
    }
    dernierClicRef.current = -1;
  }, [tempo, transposition, demarrer]);

  // Le mixage s'applique à chaud sur les gains de piste : régler un volume ou
  // appuyer sur M ne recrée aucun nœud, donc n'interrompt pas la lecture.
  const etatMixage: EtatMixage = useMemo(
    () => ({ volumes, mutes, solos }),
    [volumes, mutes, solos]
  );
  const etatMixageRef = useRef(etatMixage);
  etatMixageRef.current = etatMixage;
  useEffect(() => {
    gainsPistesRef.current.forEach((gain, id) => {
      gain.gain.value = id === "mixage" ? 1 : gainEffectif(id, etatMixage);
    });
  }, [etatMixage, pistesActives]);

  // Le gain d'un biquad s'écrit à chaud : aucun nœud à recréer, donc aucune
  // coupure — contrairement au tempo, qui peut franchir la frontière de la
  // correction de hauteur.
  useEffect(() => {
    // Le contournement met les bandes à plat plutôt que de démonter la chaîne :
    // débrancher cinq nœuds en cours de lecture produit un claquement.
    filtresRef.current.forEach((f, i) => {
      f.gain.value = egaliseurActif ? (egaliseur[i] ?? 0) : 0;
    });
  }, [egaliseur, egaliseurActif, etat]);

  // Le post-gain rattrape le volume perdu ou gagné par l'égalisation. Les
  // décibels se convertissent en gain linéaire : +6 dB double l'amplitude.
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = gainLineaire(postGain);
  }, [postGain, etat]);

  useEffect(() => {
    const sources = sourcesRef.current;
    if (sources.length === 0) return;
    for (const source of sources) {
      if (boucle) {
        source.loop = true;
        source.loopStart = boucle.a;
        source.loopEnd = boucle.b;
      } else {
        source.loop = false;
      }
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

  // Une correction manuelle l'emporte ; sinon on suit la section jouée, et à
  // défaut la tonalité dominante du morceau.
  const sections = useMemo(() => parseSections(piste?.tonalite_sections), [piste]);
  const { data: stems = [] } = useStemsEnregistrement(piste?.id ?? "", visible && !!piste && avecStems);
  const { mutate: demanderStems, isPending: demandeEnCours } = useDemanderStems();
  const { mutateAsync: ajouterEnregistrement } = useAjouterEnregistrement();
  const { mutateAsync: ajouterRessource } = useAjouterRessource(groupeId ?? "");
  const { data: statutStems } = useStatutStems(piste?.id ?? "", visible && !!piste && avecStems);
  const extractionEnCours = statutStems?.stems_statut === "en_cours";
  const stemsOrdonnes = useMemo(() => ordonnerStems(stems), [stems]);
  const clientRequetes = useQueryClient();

  // L'extraction s'achève côté serveur : sans cette invalidation, la liste des
  // pistes resterait vide jusqu'à la réouverture de la modale.
  useEffect(() => {
    if (statutStems?.stems_statut === "pret" && piste) {
      clientRequetes.invalidateQueries({
        queryKey: clefsSeances.enregistrements(piste.id),
      });
    }
  }, [statutStems?.stems_statut, piste, clientRequetes]);
  const tonaliteOrigine =
    tonaliteManuelle ?? sectionA(sections, position)?.id ?? piste?.tonalite ?? null;
  const resume = resumeSections(sections);

  /**
   * Position réelle, lue sur l'horloge du contexte audio.
   *
   * `positionRef` est alimentée par des événements traités sur le fil
   * JavaScript : décoder une piste de huit minutes le bloque plusieurs
   * secondes, et la valeur devient périmée d'autant. Relancer la lecture
   * dessus faisait reculer le morceau — visible sur un long morceau,
   * imperceptible sur un court.
   *
   * L'horloge audio, elle, ne cale jamais. On ne s'en sert pas quand une
   * boucle tourne : le calcul linéaire ne connaît pas les retours en arrière.
   */
  function positionReelle(): number {
    const contexte = contextePartage;
    if (!contexte || !enLecture || boucle) return positionRef.current;
    const ecoule = (contexte.currentTime - departRef.current) * tempoRef.current;
    if (ecoule <= 0) return offsetDepartRef.current;
    return Math.min(duree, offsetDepartRef.current + ecoule);
  }

  /** Remplace les pistes jouées et relance la lecture si elle était en cours. */
  function poserPistes(
    nouvelles: { id: string; tampon: AudioBuffer }[],
    positionReprise?: number
  ) {
    const jouait = enLecture;
    const reprise = positionReprise ?? positionRef.current;
    libererSource();
    pistesRef.current = nouvelles;
    if (nouvelles.length === 0) {
      setEnLecture(false);
      return;
    }
    if (jouait) demarrer(reprise);
    else setEnLecture(false);
  }

  const memoireChargee = pistesActives.reduce(
    (somme, id) =>
      somme +
      memoireEstimee(
        stemsOrdonnes.find((s) => s.id === id)?.duree_secondes ?? null,
        contextePartage?.sampleRate ?? 48000
      ),
    0
  );

  /**
   * Active ou désactive une piste, en la chargeant à la demande.
   *
   * On ne charge plus les cinq d'office : cinq pistes d'un morceau de huit
   * minutes demanderaient 450 Mo, alors que l'usage courant en réclame une ou
   * deux — chanter sur l'instrumental, isoler la basse pour la travailler.
   */
  async function basculerPiste(stemId: string) {
    if (etat !== "pret" || !piste || chargementStems) return;

    if (pistesActives.includes(stemId)) {
      const restantes = pistesActives.filter((id) => id !== stemId);
      setPistesActives(restantes);
      // On retire la seule source concernée : arrêter puis recréer les autres
      // les décalerait, alors qu'elles n'ont aucune raison de bouger.
      if (!enLecture || !retirerDeLaLecture(stemId)) {
        poserPistes(pistesJouees(restantes), positionReelle());
      }
      // Le tampon reste en cache : le réactiver doit être immédiat.
      return;
    }

    const stem = stemsOrdonnes.find((s) => s.id === stemId);
    const contexte = contextePartage;
    if (!stem || !contexte) return;

    const ajout = memoireEstimee(stem.duree_secondes, contexte.sampleRate);
    if (!peutCharger(memoireChargee, ajout, PLAFOND_MEMOIRE)) {
      setMessageStems(
        `Trop de pistes chargées pour ce morceau. Désactives-en une avant d'ajouter « ${libelleStem(
          stem.type
        )} ».`
      );
      return;
    }

    setMessageStems(null);
    setChargementStems(true);
    setPisteEnChargement(stemId);
    try {
      let tampon = cacheStems?.id === piste.id ? cacheStems.tampons.get(stemId) : undefined;
      if (!tampon) {
        const url = await urlLectureR2(stem.url);
        if (!url) throw new Error("Lien de la piste indisponible.");
        tampon = await decodeAudioData(url, contexte.sampleRate);
        if (cacheStems?.id !== piste.id) cacheStems = { id: piste.id, tampons: new Map() };
        cacheStems.tampons.set(stemId, tampon);
      }
      const suivantes = [...pistesActives, stemId];
      setPistesActives(suivantes);
      // Si la lecture tourne, la nouvelle piste s'y greffe sans interrompre les
      // autres. Sinon on repose simplement l'ensemble.
      if (!enLecture || !ajouterEnLecture({ id: stemId, tampon })) {
        poserPistes(pistesJouees(suivantes), positionReelle());
      }
    } catch (e) {
      setMessageStems(e instanceof Error ? e.message : String(e));
    } finally {
      setChargementStems(false);
      setPisteEnChargement(null);
    }
  }

  function basculerDans(
    ensemble: Set<string>,
    poser: (s: Set<string>) => void,
    id: string
  ) {
    const suivant = new Set(ensemble);
    if (suivant.has(id)) suivant.delete(id);
    else suivant.add(id);
    poser(suivant);
  }

  /** Télécharge une piste. Sur Android le fichier va dans la médiathèque ; sur iOS il passe par le partage. */
  async function telechargerPiste(stemId: string) {
    const stem = stemsOrdonnes.find((s) => s.id === stemId);
    if (!stem || telechargement) return;
    setTelechargement(stemId);
    try {
      const url = await urlLectureR2(stem.url);
      if (!url) throw new Error("Lien de la piste indisponible.");
      const nom = `${piste?.titre ?? "audio"} - ${libelleStem(stem.type)}.m4a`;
      await telechargerEtPartager(url, nom, "audio/mp4");
    } catch (e) {
      setMessageStems(e instanceof Error ? e.message : String(e));
    } finally {
      setTelechargement(null);
    }
  }

  /**
   * Télécharge toutes les pistes, une par une.
   *
   * Pas d'archive zip : elle imposerait une bibliothèque de compression pour
   * regrouper des fichiers déjà compressés, sans rien gagner en taille. Sur
   * Android chaque piste part directement dans la médiathèque, sans interaction.
   */
  async function telechargerToutes() {
    if (telechargement) return;
    for (const stem of stemsOrdonnes) {
      await telechargerPiste(stem.id);
    }
  }

  /** Tampons des pistes actives, dans l'ordre d'affichage. */
  function pistesJouees(ids: string[]): { id: string; tampon: AudioBuffer }[] {
    const tampons = cacheStems?.tampons;
    if (!tampons) return [];
    return stemsOrdonnes
      .filter((s) => ids.includes(s.id))
      .map((s) => ({ id: s.id, tampon: tampons.get(s.id) }))
      .filter((p): p is { id: string; tampon: AudioBuffer } => !!p.tampon);
  }

  /**
   * Active les pistes qui composent le morceau, sans l'instrumental.
   *
   * L'instrumental n'est pas un instrument : c'est le mixage de tout sauf la
   * voix. Le jouer en même temps que la basse, la batterie et les mélodies
   * ferait entendre chacune **deux fois**. Il s'active donc à la place des
   * autres, pas avec elles.
   */
  async function activerToutes() {
    for (const stem of stemsOrdonnes) {
      if (stem.type === "instrumental") continue;
      if (pistesActives.includes(stem.id)) continue;
      await basculerPiste(stem.id);
    }
  }

  /**
   * Demande l'affinage d'un stem, après confirmation du coût.
   *
   * Chaque affinage est une tâche facturée au même tarif à la minute qu'une
   * découpe principale — et un stem dure aussi longtemps que le morceau. Le
   * dire avant, pas après.
   */
  async function affinerStem(stemId: string, decoupe: string) {
    const stem = stemsOrdonnes.find((s) => s.id === stemId);
    if (!stem || !piste) return;

    const produits =
      decoupe === "vocal-stem"
        ? "voix principale et chœurs"
        : decoupe === "drum-stem"
          ? "grosse caisse, caisse claire et autres percussions"
          : "piano, guitares, cordes, vents et autres mélodies";

    const accepte = await dialogue.confirmer({
      titre: `Affiner « ${libelleStem(stem.type)} » ?`,
      message: `Cette piste sera séparée en ${produits}. L'opération prend quelques minutes et compte comme une extraction.`,
      boutonConfirmer: "Affiner",
      danger: false,
    });
    if (!accepte) return;

    demanderStems(
      { enregistrementId: piste.id, stemType: decoupe },
      {
        onSuccess: (r) => setMessageStems(r.message),
        onError: (e) => setMessageStems(e instanceof Error ? e.message : String(e)),
      }
    );
  }

  /**
   * Verse une piste dans les audios de la répétition.
   *
   * Aucun fichier n'est recopié : la piste existe déjà dans R2, seul un nouvel
   * enregistrement pointe dessus. Le déposer une seconde fois doublerait le
   * stockage pour un contenu identique.
   */
  async function transfererVersAudios(stemId: string, pupitreIds: string[]) {
    const stem = stemsOrdonnes.find((s) => s.id === stemId);
    if (!stem || !seanceId) return;
    try {
      await ajouterEnregistrement({
        seanceId,
        url: stem.url,
        titre: titreStem(piste?.titre, stem.type),
        dureeSecondes: stem.duree_secondes,
        pupitreIds,
      });
      setMessageStems(
        pupitreIds.length > 0
          ? "Piste ajoutée aux audios, pour les pupitres choisis."
          : "Piste ajoutée aux audios de la répétition."
      );
    } catch (e) {
      setMessageStems(e instanceof Error ? e.message : String(e));
    }
  }

  /** Verse une piste dans les fichiers du groupe, sans recopier l'audio. */
  async function transfererVersFichiers(stemId: string) {
    const stem = stemsOrdonnes.find((s) => s.id === stemId);
    if (!stem || !groupeId) return;
    try {
      await ajouterRessource({
        nom: titreStem(piste?.titre, stem.type),
        type: "audio",
        url: stem.url,
        format: "m4a",
        tailleBytes: stem.taille_octets,
        dureeSecondes: stem.duree_secondes,
        partageType: "groupe",
        partageGroupeId: groupeId,
      });
      setMessageStems("Piste ajoutée aux fichiers du groupe.");
    } catch (e) {
      setMessageStems(e instanceof Error ? e.message : String(e));
    }
  }

  /** Revient au mixage complet, en libérant les pistes séparées. */
  function revenirAuMixage() {
    setPistesActives([]);
    setVolumes({});
    setMutes(new Set());
    setSolos(new Set());
    setMessageStems(null);
    const enCache = cache;
    if (enCache && enCache.id === piste?.id) {
      poserPistes([{ id: "mixage", tampon: enCache.tampon }]);
    } else {
      poserPistes([]);
    }
  }

  function deplacerBorne(borne: "debut" | "fin", secondes: number, definitif = true) {
    if (!boucle) return;
    const cible = Math.min(Math.max(0, secondes), duree);
    // Les bornes ne se croisent pas : un quart de seconde les sépare au moins,
    // sinon la boucle deviendrait un bourdonnement.
    const ecart = 0.25;
    const bornes =
      borne === "debut"
        ? { a: Math.min(cible, boucle.b - ecart), b: boucle.b }
        : { a: boucle.a, b: Math.max(cible, boucle.a + ecart) };
    setBoucle(bornes);

    if (!definitif) return;
    // Rétrécir la boucle en laissant la tête de lecture dehors laisse l'index
    // natif hors des bornes, et la lecture sort du tampon. On la ramène dedans
    // au relâchement — et allerA reprend la lecture suspendue par le geste.
    allerA(Math.min(Math.max(positionRef.current, bornes.a), bornes.b));
  }

  /** Suspend la lecture au premier contact : on ne scrute pas en jouant. */
  function suspendrePourGeste() {
    if (etat !== "pret" || !enLecture) return;
    reprendreApresGesteRef.current = true;
    libererSource();
    setEnLecture(false);
  }

  /**
   * `definitif` distingue le glissement du relâchement.
   *
   * Pendant le glissement on n'actualise que l'affichage : relancer la lecture
   * à chaque événement recréait le nœud audio des dizaines de fois par seconde,
   * avec un étireur temporel alloué à chaque fois quand la correction de
   * hauteur est active. C'est ce qui fermait l'application.
   */
  function allerA(secondes: number, definitif = true) {
    if (etat !== "pret") return;
    const cible = Math.min(Math.max(0, secondes), duree);
    positionRef.current = cible;
    setPosition(cible);
    dernierClicRef.current = -1;
    if (!definitif) return;
    if (reprendreApresGesteRef.current) {
      reprendreApresGesteRef.current = false;
      demarrer(cible);
    } else if (enLecture) {
      demarrer(cible);
    }
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
                {piste?.analyzed_at
                  ? "Impossible d'ouvrir ce morceau dans le labo."
                  : "Ce morceau est encore en préparation. Certains formats doivent être convertis avant d'être lisibles."}
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
              // Le gap ne s'applique qu'entre les enfants : sans cette marge, le
              // dernier réglage collerait au bord bas de la feuille.
              contentContainerStyle={{ gap: espacement.lg, paddingBottom: 50 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Le transport reste au-dessus des onglets : il commande ce qui
                  joue, quel que soit l'onglet. La waveform, elle, dépeint le
                  mixage — elle n'a rien à dire d'une basse jouée en solo, donc
                  elle disparaît dans l'onglet Pistes. */}
              {onglet !== "pistes" && (
              <Waveform
                pics={pics}
                progression={duree > 0 ? position / duree : 0}
                surDeplacer={(ratio, definitif) => allerA(ratio * duree, definitif)}
                surDebutGeste={suspendrePourGeste}
                boucle={
                  boucle && duree > 0
                    ? { debut: boucle.a / duree, fin: boucle.b / duree }
                    : null
                }
                surDeplacerBorne={(borne, ratio, definitif) =>
                  deplacerBorne(borne, ratio * duree, definitif)
                }
              />
              )}
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

              <Onglets valeur={onglet} surChanger={setOnglet} avecStems={avecStems} />

              {onglet === "lecteur" && (
                <View style={{ gap: espacement.lg }}>

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
                      ? `Tonalité d'origine : ${libelleTonalite(tonaliteOrigine)}${
                          resume && !tonaliteManuelle ? ` — ${resume}` : " — appuyer pour corriger"
                        }`
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

                <View style={{ height: 1, backgroundColor: couleurs.bordure }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                  <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
                    Égaliseur
                  </Texte>
                  <Puce
                    libelle={egaliseurActif ? "Actif" : "Contourné"}
                    actif={egaliseurActif}
                    onPress={() => setEgaliseurActif((v) => !v)}
                  />
                  <Puce
                    libelle="À plat"
                    actif={false}
                    onPress={() => {
                      setEgaliseur(BANDES.map(() => 0));
                      setPostGain(0);
                    }}
                  />
                </View>

                <Egaliseur
                  gains={egaliseur}
                  actif={egaliseurActif}
                  surChanger={(i, g) =>
                    setEgaliseur((precedents) =>
                      precedents.map((v, j) => (j === i ? Math.min(GAIN_MAX, Math.max(-GAIN_MAX, g)) : v))
                    )
                  }
                />

                <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                  <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
                    Volume de sortie
                  </Texte>
                  <Texte variante="petit" poids="semibold" couleur={postGain === 0 ? couleurs.texteSecondaire : couleurs.warmGold}>
                    {`${postGain > 0 ? "+" : ""}${postGain.toFixed(1)} dB`}
                  </Texte>
                </View>
                <Slider
                  minimumValue={-POST_GAIN_MAX}
                  maximumValue={POST_GAIN_MAX}
                  step={0.5}
                  value={postGain}
                  onValueChange={setPostGain}
                  minimumTrackTintColor={couleurs.warmGold}
                  maximumTrackTintColor={couleurs.bordureForte}
                  thumbTintColor={couleurs.warmGold}
                  accessibilityLabel="Volume de sortie de l'égaliseur"
                />
                </View>
              )}

              {onglet === "pistes" && (
                <View style={{ gap: espacement.lg }}>

                {extractionEnCours ? (
                  <View
                    style={{
                      paddingVertical: espacement.xl,
                      gap: espacement.sm,
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator color={couleurs.warmGold} />
                    <Texte variante="petit" couleur={couleurs.texte}>
                      Extraction des pistes en cours.
                    </Texte>
                    <Texte
                      variante="micro"
                      couleur={couleurs.texteSecondaire}
                      style={{ textAlign: "center" }}
                    >
                      Ce processus peut prendre quelques minutes. Tu recevras une notification
                      quand ce sera prêt — tu peux fermer le labo entre-temps.
                    </Texte>
                  </View>
                ) : stemsOrdonnes.length === 0 ? (
                  <View
                    style={{
                      alignItems: "center",
                      gap: espacement.md,
                      paddingVertical: espacement.xl,
                    }}
                  >
                    <Ionicons name="git-branch-outline" size={40} color={couleurs.warmGold} />
                    <Texte
                      variante="petit"
                      couleur={couleurs.texteSecondaire}
                      style={{ textAlign: "center" }}
                    >
                      {"Sépare ce morceau en pistes — voix, basse, batterie, mélodies — pour travailler chaque partie isolément."}
                    </Texte>
                    <View style={{ flexDirection: "row" }}>
                      <Puce
                        libelle={demandeEnCours ? "Demande…" : "Extraire les pistes"}
                        principal
                        actif={false}
                        onPress={() => {
                          if (demandeEnCours || !piste) return;
                          demanderStems(
                            { enregistrementId: piste.id },
                            {
                              onSuccess: (r) => setMessageStems(r.message),
                              onError: (e) =>
                                setMessageStems(e instanceof Error ? e.message : String(e)),
                            }
                          );
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Mixeur
                      pistes={stemsOrdonnes}
                      actives={pistesActives}
                      etat={etatMixage}
                      chargement={pisteEnChargement}
                      telechargementEnCours={telechargement}
                      surBasculer={(id) => void basculerPiste(id)}
                      surVolume={(id, v) => setVolumes((p) => ({ ...p, [id]: v }))}
                      surMute={(id) => basculerDans(mutes, setMutes, id)}
                      surSolo={(id) => basculerDans(solos, setSolos, id)}
                      surTelecharger={(id) => void telechargerPiste(id)}
                      surTransferer={seanceId || groupeId ? (id) => setTransfert(id) : undefined}
                      surAffiner={(id, decoupe) => void affinerStem(id, decoupe)}
                      dejaAffines={stemsOrdonnes
                        .filter((s) => s.parent_id)
                        .map((s) => s.parent_id!)}
                    />

                    <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                      <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
                        {pistesActives.length === 0
                          ? "Appuie sur un nom pour activer une piste."
                          : ""}
                      </Texte>
                      {pistesActives.length > 0 ? (
                        <Puce libelle="Tout libérer" actif={false} onPress={revenirAuMixage} />
                      ) : (
                        <Puce
                          libelle="Tout activer"
                          actif={false}
                          onPress={() => void activerToutes()}
                        />
                      )}
                      <Puce
                        libelle={telechargement ? "En cours…" : "Tout télécharger"}
                        actif={false}
                        onPress={() => void telechargerToutes()}
                      />
                    </View>

                    {messageStems && (
                      <Texte variante="micro" couleur={couleurs.danger}>
                        {messageStems}
                      </Texte>
                    )}
                  </>
                )}
                </View>
              )}

              {onglet === "creation" && (
                <OngletCreation actif={visible && onglet === "creation"} />
              )}
            </ScrollView>
          )}
        </View>

        <ModalChoix
          visible={transfert !== null}
          titre="Transférer cette piste"
          elements={[
            ...(seanceId
              ? [
                  {
                    id: "audios",
                    titre: "Ajouter aux audios de la répétition",
                    sousTitre: "Visible par tout le groupe, ou par des pupitres choisis",
                    icone: "musical-notes-outline" as const,
                  },
                ]
              : []),
            ...(groupeId
              ? [
                  {
                    id: "fichiers",
                    titre: "Ajouter aux fichiers du groupe",
                    sousTitre: "Rangé avec les ressources partagées",
                    icone: "folder-outline" as const,
                  },
                ]
              : []),
          ]}
          surChoisir={(id) => {
            const stemId = transfert;
            setTransfert(null);
            if (!stemId) return;
            // Le choix des pupitres se fait dans une seconde étape : mêler les
            // deux listes dans une même modale rendait le geste illisible.
            if (id === "audios") setChoixPupitres(stemId);
            else void transfererVersFichiers(stemId);
          }}
          onFermer={() => setTransfert(null)}
          messageVide="Aucune destination disponible."
        />

        <ModalChoixMultiple
          visible={choixPupitres !== null}
          titre="Pour quels pupitres ?"
          sousTitre="Aucun choix = tout le groupe"
          elements={pupitres.map((p) => ({
            id: p.id,
            titre: p.nom,
            couleur: p.couleur ?? undefined,
          }))}
          surValider={(ids) => {
            const stemId = choixPupitres;
            setChoixPupitres(null);
            if (stemId) void transfererVersAudios(stemId, ids);
          }}
          onFermer={() => setChoixPupitres(null)}
        />

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
              setTonaliteManuelle(id);
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

type Onglet = "lecteur" | "pistes" | "creation";

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "lecteur", libelle: "Lecteur" },
  { id: "pistes", libelle: "Pistes" },
  { id: "creation", libelle: "Création" },
];

function Onglets({
  valeur,
  surChanger,
  avecStems,
}: {
  valeur: Onglet;
  surChanger: (o: Onglet) => void;
  avecStems: boolean;
}) {
  const visibles = avecStems ? ONGLETS : ONGLETS.filter((o) => o.id !== "pistes");
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: couleurs.surfaceCarte,
        borderRadius: rayons.pill,
        padding: 4,
      }}
    >
      {visibles.map((o) => {
        const actif = o.id === valeur;
        return (
          <Pressable
            key={o.id}
            onPress={() => surChanger(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: rayons.pill,
              backgroundColor: actif ? couleurs.warmGold : "transparent",
            }}
          >
            <Texte
              variante="petit"
              poids="semibold"
              couleur={actif ? couleurs.charcoal : couleurs.texteSecondaire}
            >
              {o.libelle}
            </Texte>
          </Pressable>
        );
      })}
    </View>
  );
}

function Puce({
  libelle,
  actif,
  onPress,
  principal = false,
}: {
  libelle: string;
  actif: boolean;
  onPress: () => void;
  /** Action principale de l'écran : fond plein, pas simple contour. */
  principal?: boolean;
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
        backgroundColor: principal
          ? couleurs.warmGold
          : actif
            ? couleurs.warmGold15
            : couleurs.surfaceCarte,
      }}
    >
      <Texte
        variante="petit"
        poids="semibold"
        couleur={principal ? couleurs.charcoal : actif ? couleurs.warmGold : couleurs.texte}
      >
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
