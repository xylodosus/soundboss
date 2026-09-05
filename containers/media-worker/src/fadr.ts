/**
 * Client de l'API Fadr — séparation en stems.
 *
 * Le parcours tient en cinq requêtes : url de dépôt signée, dépôt, création de
 * l'asset, lancement de la tâche, scrutation. Puis on lit chaque stem produit
 * et on demande son url de téléchargement.
 *
 * Un point que la documentation laisse ouvert : **aucun état d'échec n'est
 * décrit**. Le seul signal est `status.complete`. Le client ne peut donc pas
 * distinguer une tâche échouée d'une tâche lente — seule une échéance le
 * permet, et c'est ainsi que la scrutation est écrite plutôt qu'en inventant un
 * état qui n'existe peut-être pas.
 */

const BASE = 'https://api.fadr.com';

/** Scrutation recommandée par Fadr. */
export const INTERVALLE_SCRUTATION_MS = 5000;

/**
 * Les quatre découpes, et ce qu'elles attendent en entrée.
 *
 * `parent` nomme le type de stem à réinjecter : `drum-stem` ne s'applique pas
 * au morceau mais au stem de batterie qu'une découpe `main` a produit.
 */
export const STEM_TYPES = {
  main: { parent: null, produit: ['vocals', 'bass', 'drums', 'melodies', 'instrumental'] },
  'vocal-stem': { parent: 'vocals', produit: ['lead vocals', 'background vocals'] },
  'melodic-stem': {
    parent: 'melodies',
    produit: ['piano', 'electric guitar', 'acoustic guitar', 'strings', 'wind', 'other melodies'],
  },
  'drum-stem': { parent: 'drums', produit: ['kick', 'snare', 'other drums'] },
} as const;

export type StemType = keyof typeof STEM_TYPES;

export interface Tache {
  _id: string;
  status?: { msg?: string; progress?: number; complete?: boolean };
  output?: { assets?: unknown[] };
}

function objet(valeur: unknown): Record<string, unknown> | null {
  return valeur && typeof valeur === 'object' ? (valeur as Record<string, unknown>) : null;
}

export function parseUrlDepot(reponse: unknown): { url: string; s3Path: string } {
  const o = objet(reponse);
  const url = o?.url;
  const s3Path = o?.s3Path;
  if (typeof url !== 'string' || typeof s3Path !== 'string') {
    throw new Error("Réponse de dépôt Fadr inexploitable : url ou s3Path manquant");
  }
  return { url, s3Path };
}

export function parseAsset(reponse: unknown): string {
  const o = objet(reponse);
  const asset = objet(o?.asset) ?? o;
  const id = asset?._id;
  if (typeof id !== 'string') throw new Error("Asset Fadr sans identifiant");
  return id;
}

export function parseTaches(reponse: unknown): Tache[] {
  const brut = objet(reponse)?.tasks;
  if (!Array.isArray(brut)) return [];
  return brut
    .map((t) => objet(t))
    .filter((t): t is Record<string, unknown> => !!t && typeof t._id === 'string')
    .map((t) => t as unknown as Tache);
}

/** Seul signal de fin documenté. Tout le reste est de la supposition. */
export function estTerminee(tache: Tache): boolean {
  return tache.status?.complete === true;
}

export function messageEtat(tache: Tache): string {
  const msg = tache.status?.msg;
  if (!msg) return 'état inconnu';
  const progression = tache.status?.progress;
  return typeof progression === 'number' ? `${msg} (${progression}%)` : msg;
}

/** Identifiants des assets produits, que Fadr rende des chaînes ou des objets. */
export function assetsProduits(tache: Tache): string[] {
  const assets = tache.output?.assets;
  if (!Array.isArray(assets)) return [];
  return assets
    .map((a) => (typeof a === 'string' ? a : objet(a)?._id))
    .filter((id): id is string => typeof id === 'string');
}

/**
 * Type d'un stem produit.
 *
 * Rend « inconnu » plutôt que d'échouer : la documentation n'énumère pas la
 * totalité des `metaData.stemType`, et un type non prévu doit être stocké et
 * affiché tel quel, jamais rejeté.
 */
export function typeDeStem(asset: unknown): string {
  const type = objet(objet(asset)?.metaData)?.stemType;
  return typeof type === 'string' && type.length > 0 ? type : 'inconnu';
}

// --- Requêtes ---------------------------------------------------------------

async function appel(
  cle: string,
  chemin: string,
  options: { methode?: string; corps?: unknown } = {},
): Promise<unknown> {
  const reponse = await fetch(`${BASE}${chemin}`, {
    method: options.methode ?? 'GET',
    headers: {
      Authorization: `Bearer ${cle}`,
      ...(options.corps ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });
  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '');
    throw new Error(`Fadr ${chemin} a répondu ${reponse.status} ${detail.slice(0, 200)}`);
  }
  return reponse.json();
}

export async function creerUrlDepot(cle: string, nom: string, extension: string) {
  return parseUrlDepot(
    await appel(cle, '/assets/upload2', { methode: 'POST', corps: { name: nom, extension } }),
  );
}

export async function deposer(url: string, octets: Buffer, mimeType: string): Promise<void> {
  // Le Content-Type est obligatoire : l'url signée le couvre, une valeur
  // divergente fait rejeter le dépôt par S3.
  const reponse = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: new Uint8Array(octets),
  });
  if (!reponse.ok) throw new Error(`Dépôt Fadr échoué (${reponse.status})`);
}

export async function creerAsset(
  cle: string,
  nom: string,
  extension: string,
  groupe: string,
  s3Path: string,
): Promise<string> {
  return parseAsset(
    await appel(cle, '/assets', {
      methode: 'POST',
      corps: { name: nom, extension, group: groupe, s3Path },
    }),
  );
}

export async function lancerSeparation(
  cle: string,
  assetId: string,
  stemType: StemType,
): Promise<string> {
  const reponse = objet(
    await appel(cle, '/assets/analyze/stem', {
      methode: 'POST',
      corps: { _id: assetId, stemType },
    }),
  );
  const tache = objet(reponse?.task) ?? reponse;
  const id = tache?._id;
  if (typeof id !== 'string') throw new Error('Tâche Fadr sans identifiant');
  return id;
}

export async function etatTache(cle: string, tacheId: string): Promise<Tache | null> {
  const taches = parseTaches(
    await appel(cle, '/tasks/query', { methode: 'POST', corps: { _ids: [tacheId] } }),
  );
  return taches[0] ?? null;
}

export async function lireAsset(cle: string, assetId: string): Promise<unknown> {
  return appel(cle, `/assets/${assetId}`);
}

export async function urlTelechargement(cle: string, assetId: string): Promise<string> {
  const url = objet(await appel(cle, `/assets/download/${assetId}/hq`))?.url;
  if (typeof url !== 'string') throw new Error('Url de téléchargement Fadr absente');
  return url;
}
