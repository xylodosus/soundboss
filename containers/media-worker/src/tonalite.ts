/**
 * Détection de tonalité par profils de Krumhansl-Schmuckler.
 *
 * Le principe : on cumule l'énergie de chaque classe de hauteur sur tout le
 * morceau — le chromagramme — puis on cherche parmi vingt-quatre profils de
 * référence (douze majeurs, douze mineurs) celui qui lui ressemble le plus, au
 * sens de la corrélation de Pearson.
 *
 * Ses limites sont connues et assumées : la méthode confond régulièrement une
 * tonalité avec sa relative mineure, et elle est fragile sur une captation
 * acoustique de répétition. C'est pourquoi le résultat est une **proposition**,
 * corrigeable dans le labo, et qu'une confiance est enregistrée à côté.
 *
 * L'alternative était un service externe payant. À fiabilité comparable — car
 * il faudrait de toute façon pouvoir corriger — celle-ci ne coûte rien et ne
 * dépend de personne.
 */
import { spawn } from 'node:child_process';
import { fft, magnitudes } from './fft.ts';

/** Même nomenclature que le client : un seul nom par degré, notation latine. */
export const NOTES = [
  'Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'Sib', 'Si',
] as const;

/** Profils de Krumhansl et Kessler (1982), degré de stabilité de chaque classe. */
export const PROFILS = {
  majeur: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  mineur: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
} as const;

/** Fenêtre d'analyse. À 11 025 Hz, 8192 points donnent 1,35 Hz par intervalle,
 *  soit de quoi séparer deux demi-tons voisins dès le do grave. */
export const TAILLE_FENETRE = 8192;
const SAUT = TAILLE_FENETRE / 2;

/** Do2 à Si6 : au-dessous la résolution s'effondre, au-dessus il ne reste que des harmoniques. */
const MIDI_MIN = 36;
const MIDI_MAX = 95;

/** En deçà, la corrélation ne distingue plus rien du bruit. */
const CONFIANCE_MIN = 0.02;

/**
 * Nombre minimal de fenêtres, soit une vingtaine de secondes.
 *
 * Sans ce plancher, une note vocale de sept secondes obtenait la confiance la
 * plus haute du lot — non parce que sa tonalité était nette, mais parce que
 * trop peu de matière laissait trop peu de quoi contredire la première
 * hypothèse. L'écart au second se creuse quand le signal est pauvre : la
 * métrique récompensait le vide.
 */
const FENETRES_MIN = 60;

export interface TonaliteDetectee {
  id: string;
  confiance: number;
}

export interface SectionTonale {
  /** Début et fin en secondes depuis le début du morceau. */
  debut: number;
  fin: number;
  id: string;
  confiance: number;
}

function frequenceMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Durée d'une tranche d'analyse, en secondes. */
export const SECONDES_PAR_TRANCHE = 30;

/**
 * Cumul de l'énergie par classe de hauteur, **une entrée par tranche**.
 *
 * C'est le cœur : additionner toutes les tranches redonne le chromagramme
 * global. Les garder séparées permet de voir une modulation, qu'une réponse
 * unique ne peut pas décrire — sur le corpus SoundBoss, les deux seuls morceaux
 * mal détectés étaient exactement les deux qui changent de tonalité.
 */
export function chromaParTranches(
  signal: Float32Array,
  frequence: number,
  secondesParTranche = SECONDES_PAR_TRANCHE
): Float64Array[] {
  if (signal.length < TAILLE_FENETRE + SAUT * (FENETRES_MIN - 1)) return [];

  const echantillonsParTranche = Math.max(1, Math.round(frequence * secondesParTranche));
  const nbTranches = Math.max(1, Math.ceil(signal.length / echantillonsParTranche));
  const tranches = Array.from({ length: nbTranches }, () => new Float64Array(12));
  const fenetresParTranche = new Array(nbTranches).fill(0);

  parcourirFenetres(signal, frequence, (debut, contributions) => {
    const i = Math.min(nbTranches - 1, Math.floor(debut / echantillonsParTranche));
    for (let c = 0; c < 12; c++) tranches[i][c] += contributions[c];
    fenetresParTranche[i] += 1;
  });

  // Une tranche trop courte — la dernière, le plus souvent — n'a pas de quoi
  // trancher : la rendre vide vaut mieux qu'une réponse tirée du vide.
  const minimum = Math.max(8, Math.floor(FENETRES_MIN / 4));
  return tranches.map((c, i) => (fenetresParTranche[i] >= minimum ? c : new Float64Array(12)));
}

/** Cumul de l'énergie par classe de hauteur sur tout le signal. */
export function chromaDepuisSignal(signal: Float32Array, frequence: number): Float64Array {
  const chroma = new Float64Array(12);
  if (signal.length < TAILLE_FENETRE + SAUT * (FENETRES_MIN - 1)) return chroma;

  parcourirFenetres(signal, frequence, (_debut, contributions) => {
    for (let c = 0; c < 12; c++) chroma[c] += contributions[c];
  });
  return chroma;
}

/**
 * Parcourt le signal fenêtre par fenêtre et remet à l'appelant la contribution
 * de chacune, par classe de hauteur. Le tableau passé est **réutilisé** d'une
 * fenêtre à l'autre : à l'appelant de l'accumuler, pas de le garder.
 */
function parcourirFenetres(
  signal: Float32Array,
  frequence: number,
  surFenetre: (debut: number, contributions: Float64Array) => void
): void {
  // Fenêtre de Hann : sans elle, les discontinuités aux bords étalent chaque
  // partiel sur tout le spectre et le chromagramme se transforme en bouillie.
  const fenetre = new Float64Array(TAILLE_FENETRE);
  for (let i = 0; i < TAILLE_FENETRE; i++) {
    fenetre[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (TAILLE_FENETRE - 1)));
  }

  // Bornes d'intervalles précalculées : ±un demi-demi-ton autour de chaque note.
  const bornes: { classe: number; debut: number; fin: number }[] = [];
  const parHertz = TAILLE_FENETRE / frequence;
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const f = frequenceMidi(midi);
    const debut = Math.max(1, Math.floor(f * Math.pow(2, -0.5 / 12) * parHertz));
    const fin = Math.min(TAILLE_FENETRE / 2 - 1, Math.ceil(f * Math.pow(2, 0.5 / 12) * parHertz));
    if (debut <= fin) bornes.push({ classe: midi % 12, debut, fin });
  }

  const re = new Float64Array(TAILLE_FENETRE);
  const im = new Float64Array(TAILLE_FENETRE);
  const contributions = new Float64Array(12);

  for (let debut = 0; debut + TAILLE_FENETRE <= signal.length; debut += SAUT) {
    for (let i = 0; i < TAILLE_FENETRE; i++) {
      re[i] = signal[debut + i] * fenetre[i];
      im[i] = 0;
    }
    fft(re, im);
    const mags = magnitudes(re, im);
    contributions.fill(0);
    for (const { classe, debut: d, fin: f } of bornes) {
      let somme = 0;
      for (let k = d; k <= f; k++) somme += mags[k];
      contributions[classe] += somme;
    }
    surFenetre(debut, contributions);
  }
}

function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let moyA = 0;
  let moyB = 0;
  for (let i = 0; i < 12; i++) {
    moyA += a[i];
    moyB += b[i];
  }
  moyA /= 12;
  moyB /= 12;

  let num = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < 12; i++) {
    const da = a[i] - moyA;
    const db = b[i] - moyB;
    num += da * db;
    varA += da * da;
    varB += db * db;
  }
  const den = Math.sqrt(varA * varB);
  // Un chroma plat a une variance nulle : aucune tonalité ne s'en dégage.
  return den === 0 ? 0 : num / den;
}

/**
 * Meilleur profil, et l'écart qui le sépare du deuxième.
 *
 * La confiance est cet écart, et non la corrélation elle-même : un morceau peut
 * corréler à 0,9 avec sa tonalité *et* avec sa relative mineure, auquel cas la
 * réponse ne vaut rien. C'est la marge qui dit si le choix était tranché.
 */
export function detecterTonalite(chroma: Float64Array): TonaliteDetectee | null {
  let meilleur: { id: string; r: number } | null = null;
  let second = -Infinity;

  for (const mode of ['majeur', 'mineur'] as const) {
    const profil = PROFILS[mode];
    for (let tonique = 0; tonique < 12; tonique++) {
      const decale = new Array(12);
      for (let i = 0; i < 12; i++) decale[i] = profil[(i - tonique + 12) % 12];
      const r = correlation(chroma, decale);
      if (!meilleur || r > meilleur.r) {
        if (meilleur) second = meilleur.r;
        meilleur = { id: `${NOTES[tonique]}:${mode}`, r };
      } else if (r > second) {
        second = r;
      }
    }
  }

  if (!meilleur || meilleur.r <= 0) return null;
  const confiance = meilleur.r - second;
  if (confiance < CONFIANCE_MIN) return null;
  return { id: meilleur.id, confiance: Math.round(confiance * 1000) / 1000 };
}

/**
 * Détecte la tonalité d'un fichier.
 *
 * Décodé en mono 11 025 Hz : la tonalité se lit dans le médium, et diviser par
 * quatre le volume de données divise d'autant le temps d'analyse.
 */
export async function detectTonalite(
  chemin: string
): Promise<(TonaliteDetectee & { sections: SectionTonale[] }) | null> {
  const frequence = 11025;
  const morceaux: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-v', 'error',
      '-i', chemin,
      '-ac', '1',
      '-ar', String(frequence),
      '-f', 'f32le',
      '-',
    ]);
    ff.stdout.on('data', (m: Buffer) => morceaux.push(m));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg a rendu ${code}`))));
  }).catch(() => undefined);

  if (morceaux.length === 0) return null;
  const brut = Buffer.concat(morceaux);
  // Buffer.concat ne garantit pas l'alignement sur quatre octets d'un Float32Array.
  const utilisable = brut.subarray(0, brut.length - (brut.length % 4));
  const signal = new Float32Array(
    utilisable.buffer.slice(utilisable.byteOffset, utilisable.byteOffset + utilisable.length),
  );

  // Les tranches servent deux fois : additionnées elles donnent la tonalité
  // dominante, séparées elles donnent la chronologie. Un seul parcours du
  // signal pour les deux.
  const tranches = chromaParTranches(signal, frequence);
  if (tranches.length === 0) return null;

  const global = new Float64Array(12);
  for (const tranche of tranches) {
    for (let c = 0; c < 12; c++) global[c] += tranche[c];
  }

  const dominante = detecterTonalite(global);
  if (!dominante) return null;
  return { ...dominante, sections: sectionsTonales(tranches) };
}

/**
 * Chronologie des tonalités d'un morceau.
 *
 * Deux règles de lissage, et elles ne sont pas cosmétiques :
 *
 * — une tranche muette hérite de la précédente : un pont sans harmonie ne
 *   change pas la tonalité, il la suspend ;
 * — une tonalité isolée entre deux voisines identiques est écartée. Une
 *   modulation dure — c'est ce qui la distingue d'un accord de passage mal
 *   interprété. Sans cette règle, un morceau stable produirait une chronologie
 *   hachée que personne ne lirait.
 */
export function sectionsTonales(
  tranches: Float64Array[],
  secondesParTranche = SECONDES_PAR_TRANCHE
): SectionTonale[] {
  if (tranches.length === 0) return [];

  const brut = tranches.map((c) => detecterTonalite(c));

  // Héritage des tranches indécidables.
  const herite: (TonaliteDetectee | null)[] = [];
  for (let i = 0; i < brut.length; i++) {
    herite[i] = brut[i] ?? (i > 0 ? herite[i - 1] : null);
  }

  // Écartement des tonalités isolées.
  const lisse = herite.map((v, i) => {
    const avant = herite[i - 1];
    const apres = herite[i + 1];
    if (!avant || !apres || !v) return v;
    if (avant.id === apres.id && v.id !== avant.id) return avant;
    return v;
  });

  const sections: SectionTonale[] = [];
  for (let i = 0; i < lisse.length; i++) {
    const v = lisse[i];
    if (!v) continue;
    const derniere = sections[sections.length - 1];
    const debut = i * secondesParTranche;
    const fin = (i + 1) * secondesParTranche;
    if (derniere && derniere.id === v.id && derniere.fin === debut) {
      derniere.fin = fin;
      derniere.confiance = Math.max(derniere.confiance, v.confiance);
    } else {
      sections.push({ debut, fin, id: v.id, confiance: v.confiance });
    }
  }
  return sections;
}
