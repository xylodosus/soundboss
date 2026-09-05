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
): Promise<{ id: string; type: string; url: string }[]> {
  // `url` est indispensable : un affinage se fait sur le stem parent, pas sur
  // le morceau complet.
  const url =
    `${config.supabase.url}/rest/v1/enregistrement_stems` +
    `?enregistrement_id=eq.${enregistrementId}&select=id,type,url`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Listing stems échoué (${res.status})`);
  return (await res.json()) as { id: string; type: string; url: string }[];
}
