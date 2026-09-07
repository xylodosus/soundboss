/**
 * Client de l'API Suno chez Kie.ai — génération musicale.
 *
 * Deux traits la distinguent de Fadr, et ils commandent toute la conception :
 *
 * — la fin n'est pas annoncée par scrutation mais par un **rappel HTTP** sur une
 *   adresse publique, ce qui impose que le conteneur en ait une ;
 * — les fichiers produits ne sont **conservés que 14 jours**. Il faut donc les
 *   rapatrier dans R2 dès réception, jamais se contenter de garder leur URL.
 */

const BASE = 'https://api.kie.ai';

export const MODELES = ['V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'] as const;
export type Modele = (typeof MODELES)[number];

/** Le plus récent par défaut ; c'est aussi le seul qui accepte une durée. */
export const MODELE_DEFAUT: Modele = 'V5_5';

export interface Demande {
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  model: Modele;
  style?: string;
  title?: string;
  duration?: number;
}

/**
 * La durée n'est honorée qu'en mode personnalisé sur V5_5.
 *
 * La doc Kie.ai est explicite : « valid only when custom_mode is true and model
 * is V5_5 ». Ailleurs le paramètre est accepté puis ignoré, et la piste sort à
 * la longueur que Suno juge bonne — celui qui a demandé trois minutes se croit
 * trompé. Autant ne pas l'envoyer.
 */
export function dureeApplicable(customMode: boolean, model: Modele): boolean {
  return customMode && model === 'V5_5';
}

const BALISE_STRUCTURE = /\[[^\]]+\]/;

export function aDesBalises(paroles: string): boolean {
  return BALISE_STRUCTURE.test(paroles);
}

/**
 * Complète des paroles nues d'une ossature, sans ajouter un seul mot chanté.
 *
 * Avec voix, Suno s'arrête quand le texte est épuisé : un couplet de quatre
 * lignes rend seize secondes, quelle que soit la durée demandée. Le même
 * morceau en instrumental en rend bien trois minutes — la durée est honorée,
 * c'est la matière chantée qui manque.
 *
 * On ne peut pas écrire de paroles à la place de l'auteur. On peut en revanche
 * déclarer les sections instrumentales que Suno n'ose pas inventer seul, et
 * poser l'[Outro] sans lequel il coupe net.
 */
export function structurerParoles(paroles: string): string {
  const texte = paroles.trim();
  if (!texte || aDesBalises(texte)) return texte;
  return [
    '[Intro]',
    '',
    '[Verse 1]',
    texte,
    '',
    '[Instrumental Break]',
    '(extended instrumental solo)',
    '',
    '[Outro]',
    '(instrumental fade)',
  ].join('\n');
}

function objet(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/**
 * Valide et complète une demande avant l'appel.
 *
 * Vérifier ici plutôt que de laisser l'API refuser : un aller-retour raté coûte
 * du temps à l'utilisateur, et une demande mal formée pourrait être facturée.
 */
export function validerDemande(brut: Record<string, unknown>): Demande {
  const prompt = typeof brut.prompt === 'string' ? brut.prompt.trim() : '';
  const customMode = brut.customMode === true;
  const instrumental = brut.instrumental === true;

  const model = (brut.model ?? MODELE_DEFAUT) as Modele;
  if (!MODELES.includes(model)) {
    throw new Error(`Modèle inconnu : ${String(brut.model)}`);
  }

  const style = typeof brut.style === 'string' ? brut.style.trim() : undefined;
  const title = typeof brut.title === 'string' ? brut.title.trim() : undefined;

  if (customMode && (!style || !title)) {
    throw new Error('Le mode personnalisé exige un style et un titre.');
  }

  // En mode personnalisé instrumental, l'invite est facultative : le style
  // suffit à décrire ce qu'on veut entendre.
  const inviteFacultative = customMode && instrumental;
  if (!prompt && !inviteFacultative) {
    throw new Error('Une description est nécessaire.');
  }

  const duration =
    dureeApplicable(customMode, model) &&
    typeof brut.duration === 'number' &&
    brut.duration >= 10 &&
    brut.duration <= 360
      ? Math.round(brut.duration)
      : undefined;

  // L'ossature ne se justifie que si une durée a été demandée : ailleurs, rien
  // ne dit que l'auteur veuille autre chose que ce qu'il a écrit.
  const promptFinal =
    duration !== undefined && customMode && !instrumental ? structurerParoles(prompt) : prompt;

  return { prompt: promptFinal, customMode, instrumental, model, style, title, duration };
}

export function parseTacheId(reponse: unknown): string {
  const o = objet(reponse);
  const code = o?.code;
  if (typeof code === 'number' && code !== 200) {
    throw new Error(`Kie.ai a répondu ${code} : ${String(o?.msg ?? 'sans message')}`);
  }
  const id = objet(o?.data)?.taskId;
  if (typeof id !== 'string') throw new Error('Kie.ai n’a pas rendu d’identifiant de tâche.');
  return id;
}

/**
 * Seul `complete` fait foi.
 *
 * `text` annonce les paroles et `first` la première piste : agir dessus
 * enregistrerait un résultat partiel comme définitif, et le job passerait
 * « terminé » avec une seule des deux pistes.
 */
export function estCallbackFinal(corps: unknown): boolean {
  return objet(corps)?.callbackType === 'complete';
}

/**
 * Message d'échec porté par un rappel, s'il y en a un.
 *
 * Kie.ai place `code` et `msg` à la racine du rappel — « Audio download
 * failed » par exemple, quand il n'a pas pu aller chercher la source. Les
 * ignorer transformait une explication en « sans rendre de piste », ce qui
 * n'aidait personne.
 */
export function erreurDuCallback(corps: unknown): string | null {
  const o = objet(corps);
  const code = o?.code;
  if (typeof code !== 'number' || code === 200) return null;
  return `Kie.ai ${code} : ${String(o?.msg ?? 'sans message')}`;
}

export interface PisteGeneree {
  id: string;
  url: string;
  duree: number | null;
  titre: string | null;
  image: string | null;
}

/** Pistes d'un rappel, quelle que soit la profondeur d'enveloppe observée. */
function normaliserPistes(brut: unknown): PisteGeneree[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .map((p) => objet(p))
    .filter((p): p is Record<string, unknown> => !!p && typeof p.audio_url === 'string')
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id : '',
      url: p.audio_url as string,
      duree: typeof p.duration === 'number' ? p.duration : null,
      titre: typeof p.title === 'string' ? p.title : null,
      image: typeof p.image_url === 'string' ? p.image_url : null,
    }));
}

export function pistesDuCallback(corps: unknown): PisteGeneree[] {
  const o = objet(corps);
  return normaliserPistes(Array.isArray(o?.data) ? o.data : objet(o?.data)?.data);
}

/** Pistes portées par `GET /generate/record-info`, sous data.response.sunoData. */
export function pistesDeLaTache(corps: unknown): PisteGeneree[] {
  const donnees = objet(objet(corps)?.data);
  return normaliserPistes(objet(donnees?.response)?.sunoData);
}

/**
 * États d'une tâche, tels que documentés par Kie.ai.
 *
 * Les trois premiers sont des étapes, pas des issues : `TEXT_SUCCESS` annonce
 * les paroles et `FIRST_SUCCESS` la première piste. Les prendre pour une fin
 * enregistrerait un résultat partiel comme définitif — même règle que pour les
 * rappels, où seul `complete` fait foi.
 */
const ETATS_EN_COURS = ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'];
const ETATS_ECHEC = [
  'CREATE_TASK_FAILED',
  'GENERATE_AUDIO_FAILED',
  'SENSITIVE_WORD_ERROR',
];

export type EtatTache = 'en_cours' | 'reussie' | 'echouee' | 'inconnue';

/**
 * Lit l'issue d'une tâche interrogée après coup.
 *
 * Les pistes priment sur le statut. `CALLBACK_EXCEPTION` désigne exactement le
 * cas qu'on répare — la génération a abouti mais le rappel n'est pas arrivé —
 * et la traiter comme un échec jetterait deux pistes déjà payées.
 */
export function etatDeLaTache(corps: unknown): {
  etat: EtatTache;
  message: string | null;
  pistes: PisteGeneree[];
} {
  const o = objet(corps);
  const code = o?.code;
  if (typeof code === 'number' && code !== 200) {
    return {
      etat: 'echouee',
      message: `Kie.ai ${code} : ${String(o?.msg ?? 'sans message')}`,
      pistes: [],
    };
  }

  const donnees = objet(o?.data);
  const pistes = pistesDeLaTache(corps);
  const statut = typeof donnees?.status === 'string' ? donnees.status : '';

  if (pistes.length > 0 && !ETATS_EN_COURS.includes(statut)) {
    return { etat: 'reussie', message: null, pistes };
  }
  if (ETATS_EN_COURS.includes(statut)) return { etat: 'en_cours', message: null, pistes: [] };
  if (ETATS_ECHEC.includes(statut) || statut === 'CALLBACK_EXCEPTION') {
    const detail =
      typeof donnees?.errorMessage === 'string' && donnees.errorMessage
        ? donnees.errorMessage
        : statut;
    return { etat: 'echouee', message: `Kie.ai : ${detail}`, pistes: [] };
  }
  return { etat: 'inconnue', message: null, pistes: [] };
}

/** Interroge Kie.ai sur une tâche, quand son rappel n'est jamais arrivé. */
export async function recupererTache(cle: string, tacheId: string): Promise<unknown> {
  const url = `${BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(tacheId)}`;
  const reponse = await fetch(url, { headers: { Authorization: `Bearer ${cle}` } });
  if (!reponse.ok) {
    throw new Error(`Kie.ai record-info a répondu ${reponse.status}`);
  }
  return reponse.json();
}

/**
 * Durée maximale de l'audio source d'une reprise, imposée par Kie.ai.
 */
export const SOURCE_MAX_SECONDES = 8 * 60;

/** Lance une génération. Rend l'identifiant de tâche, la suite arrive par rappel. */
export async function lancerGeneration(
  cle: string,
  demande: Demande,
  urlRappel: string,
  /** Audio source d'une reprise. Absent, c'est une création à partir de rien. */
  urlSource?: string,
): Promise<string> {
  // Deux points d'entrée pour une même intention : reprendre un morceau
  // existant, ou en créer un de toutes pièces.
  const chemin = urlSource ? '/api/v1/generate/upload-cover' : '/api/v1/generate';
  const reponse = await fetch(`${BASE}${chemin}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...demande,
      callBackUrl: urlRappel,
      ...(urlSource ? { uploadUrl: urlSource } : {}),
    }),
  });
  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '');
    throw new Error(`Kie.ai ${chemin} a répondu ${reponse.status} ${detail.slice(0, 200)}`);
  }
  return parseTacheId(await reponse.json());
}
