/**
 * Accès Supabase par PostgREST en `fetch` brut : quelques requêtes suffisent,
 * inutile d'embarquer le SDK (empreinte mémoire).
 * La clé service-role contourne la RLS — ce service n'est jamais exposé au client.
 */
import { config } from './config.ts';

export interface MediaRow {
  /** uuid : seance_enregistrements n'utilise pas d'identifiant numérique. */
  id: string;
  /** Clé R2 de l'audio. */
  url: string;
  duree_secondes: number | null;
  taille_octets: number | null;
  analyzed_at: string | null;
}

const headers = {
  apikey: config.supabase.serviceRoleKey,
  Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const COLUMNS = 'id,url,duree_secondes,taille_octets,analyzed_at';
const TABLE = 'seance_enregistrements';

export async function getMedia(mediaId: string): Promise<MediaRow | null> {
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${mediaId}&select=${COLUMNS}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture média échouée (${res.status})`);
  const rows = (await res.json()) as MediaRow[];
  return rows[0] ?? null;
}

/** Audios jamais analysés. */
export async function listUnanalyzed(limit: number): Promise<MediaRow[]> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE}` +
    `?analyzed_at=is.null&select=${COLUMNS}&limit=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Listing médias échoué (${res.status})`);
  return (await res.json()) as MediaRow[];
}

/**
 * `updated_at` n'est PAS ajouté ici : contrairement au schéma d'origine,
 * seance_enregistrements ne possède pas cette colonne et PostgREST rejetterait
 * la requête.
 */
export async function patchMedia(
  mediaId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${mediaId}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour média échouée (${res.status})`);
}

export interface StemRow {
  enregistrement_id: string;
  parent_id: string | null;
  type: string;
  url: string;
  taille_octets: number | null;
  duree_secondes: number | null;
  fadr_asset_id: string | null;
}

/** Insère un stem et rend son identifiant, pour que ses enfants s'y rattachent. */
export async function insertStem(stem: StemRow): Promise<string> {
  const url = `${config.supabase.url}/rest/v1/enregistrement_stems`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(stem),
  });
  if (!res.ok) throw new Error(`Insertion stem échouée (${res.status})`);
  const rows = (await res.json()) as { id: string }[];
  return rows[0].id;
}

/** Stems déjà produits pour un enregistrement, pour rattacher un affinage. */
export async function listStems(
  enregistrementId: string,
): Promise<{ id: string; type: string; url: string; fadr_asset_id: string | null }[]> {
  // `url` sert de repli, `fadr_asset_id` est la voie normale : Fadr détient
  // déjà le stem en qualité pleine, inutile de lui renvoyer notre copie mono.
  const url =
    `${config.supabase.url}/rest/v1/enregistrement_stems` +
    `?enregistrement_id=eq.${enregistrementId}&select=id,type,url,fadr_asset_id`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Listing stems échoué (${res.status})`);
  return (await res.json()) as {
    id: string;
    type: string;
    url: string;
    fadr_asset_id: string | null;
  }[];
}

export interface JobIA {
  id: string;
  user_id: string | null;
  statut: string | null;
  provider_job_id: string | null;
  input_params: Record<string, unknown>;
  resultat: Record<string, unknown> | null;
  created_at?: string | null;
  started_at?: string | null;
}

const CHAMPS_JOB =
  'id,user_id,statut,provider_job_id,input_params,resultat,created_at,started_at';

const TABLE_JOBS = 'ai_jobs';

export async function getJobIA(jobId: string): Promise<JobIA | null> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE_JOBS}` +
    `?id=eq.${jobId}&select=${CHAMPS_JOB}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture job IA échouée (${res.status})`);
  return ((await res.json()) as JobIA[])[0] ?? null;
}

/**
 * Job correspondant à un identifiant de tâche du fournisseur.
 *
 * C'est ce qui authentifie un rappel : l'adresse est publique — Kie.ai doit
 * pouvoir l'appeler — donc un rappel dont le task_id ne correspond à aucun job
 * en attente est ignoré, sans que rien ne soit écrit.
 */
export async function getJobParTacheFournisseur(tacheId: string): Promise<JobIA | null> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE_JOBS}` +
    `?provider_job_id=eq.${encodeURIComponent(tacheId)}` +
    `&select=${CHAMPS_JOB}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Recherche job IA échouée (${res.status})`);
  return ((await res.json()) as JobIA[])[0] ?? null;
}

export async function patchJobIA(jobId: string, patch: Record<string, unknown>): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/${TABLE_JOBS}?id=eq.${jobId}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour job IA échouée (${res.status})`);
}

/**
 * Générations que Kie.ai n'a jamais clôturées.
 *
 * `started_at` est renseigné au lancement ; `created_at` sert de repli pour un
 * job resté `queued`, que le conteneur n'a même pas réussi à lancer.
 */
export async function generationsEnSuspens(limite: number): Promise<JobIA[]> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE_JOBS}` +
    `?statut=in.(queued,processing)&provider=eq.kie-suno` +
    `&select=${CHAMPS_JOB}&order=created_at.asc&limit=${limite}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture des générations en suspens échouée (${res.status})`);
  return (await res.json()) as JobIA[];
}

export interface PurgeR2 {
  id: string;
  cle: string;
  essais: number;
}

const TABLE_PURGES = 'r2_purges';

/** Clés dont les octets restent à retirer de R2. */
export async function purgesEnAttente(limite: number): Promise<PurgeR2[]> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE_PURGES}` +
    `?purgee_at=is.null&select=id,cle,essais&order=created_at.asc&limit=${limite}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture de la file de purge échouée (${res.status})`);
  return (await res.json()) as PurgeR2[];
}

export async function patchPurge(id: string, patch: Record<string, unknown>): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/${TABLE_PURGES}?id=eq.${id}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour de la purge échouée (${res.status})`);
}

export interface MessageSansTaille {
  id: string;
  fichier_url: string;
}

/**
 * Pièces jointes du chat dont la taille n'a jamais été enregistrée.
 *
 * L'envoi d'image ne la transmettait pas : ces fichiers comptent aujourd'hui
 * pour zéro octet dans le stockage du groupe.
 */
export async function messagesSansTaille(limite: number): Promise<MessageSansTaille[]> {
  const url =
    `${config.supabase.url}/rest/v1/messages` +
    `?fichier_url=not.is.null&fichier_taille=is.null&est_supprime=not.is.true` +
    `&select=id,fichier_url&limit=${limite}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture des pièces jointes échouée (${res.status})`);
  return (await res.json()) as MessageSansTaille[];
}

export async function patchMessage(id: string, patch: Record<string, unknown>): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/messages?id=eq.${id}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour du message échouée (${res.status})`);
}

export interface RessourceSansTaille {
  id: string;
  url: string;
}

/** Fichiers dont la taille n'a jamais été enregistrée. */
export async function ressourcesSansTaille(limite: number): Promise<RessourceSansTaille[]> {
  const url =
    `${config.supabase.url}/rest/v1/ressources` +
    `?taille_bytes=is.null&select=id,url&limit=${limite}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture des ressources échouée (${res.status})`);
  return (await res.json()) as RessourceSansTaille[];
}

export async function patchRessource(id: string, patch: Record<string, unknown>): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/ressources?id=eq.${id}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour de la ressource échouée (${res.status})`);
}
