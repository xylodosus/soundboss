/**
 * Accès R2 par API S3 signée (aws4fetch). Tout transite par le disque :
 * un sermon d'une heure ne doit jamais être chargé en mémoire, la RAM étant
 * l'unité facturée sur l'hébergeur.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AwsClient } from 'aws4fetch';
import { config } from './config.ts';

const client = new AwsClient({
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  service: 's3',
  region: 'auto',
});

/**
 * Réessaie une opération réseau avec attente croissante.
 *
 * Constaté en production : deux uploads R2 sur une quinzaine ont échoué de
 * façon transitoire (« terminated » d'undici, « fetch failed »), puis ont
 * réussi à l'identique au coup suivant. Sans reprise, le média restait non
 * traité jusqu'au prochain sweep manuel — un échec silencieux.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts) {
        const delay = 1000 * 2 ** (i - 1);
        console.warn(`[r2] ${label} tentative ${i}/${attempts} échouée, nouvel essai dans ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw last;
}

function objectUrl(key: string): string {
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `${config.r2.endpoint}/${config.r2.bucket}/${encoded}`;
}

/** Télécharge un objet R2 vers un fichier local. Renvoie sa taille en octets. */
export async function downloadToFile(key: string, destPath: string): Promise<number> {
  return withRetry(`download ${key}`, async () => {
  const res = await client.fetch(objectUrl(key), { method: 'GET' });
  if (!res.ok || !res.body) {
    throw new Error(`Téléchargement R2 échoué (${res.status}) pour ${key}`);
  }

  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > config.maxFileBytes) {
    throw new Error(`Fichier trop volumineux : ${declared} octets (max ${config.maxFileBytes})`);
  }

  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(destPath));
  return (await stat(destPath)).size;
  });
}

/** Envoie un fichier local vers R2. */
export async function uploadFromFile(
  key: string,
  srcPath: string,
  contentType: string,
): Promise<void> {
  const { size } = await stat(srcPath);
  await withRetry(`upload ${key}`, async () => {
  // Le flux est recréé à chaque tentative : un ReadableStream déjà consommé
  // ne peut pas être rejoué.
  const res = await client.fetch(objectUrl(key), {
    method: 'PUT',
    body: Readable.toWeb(createReadStream(srcPath)) as any,
    // duplex est requis par undici pour un corps en flux. Le type attendu ici
    // est AwsRequestInit (aws4fetch), qui étend le RequestInit global — lequel
    // ne déclare pas `duplex`, contrairement à celui d'undici. On utilise
    // @ts-ignore et non @ts-expect-error : ce dernier échoue à son tour quand
    // l'environnement type bien la propriété, ce qui rendait la directive
    // "unused". @ts-ignore tolère les deux cas.
    // @ts-ignore
    duplex: 'half',
    headers: { 'Content-Type': contentType, 'Content-Length': String(size) },
  });
  if (!res.ok) {
    throw new Error(`Upload R2 échoué (${res.status}) pour ${key}`);
  }
  });
}

/** Envoie un petit contenu en mémoire (utilisé pour le JSON des pics). */
export async function uploadBuffer(
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  const res = await client.fetch(objectUrl(key), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) {
    throw new Error(`Upload R2 échoué (${res.status}) pour ${key}`);
  }
}

/** Supprime un objet R2. */
export async function deleteObject(key: string): Promise<void> {
  const res = await client.fetch(objectUrl(key), { method: 'DELETE' });
  // 204 attendu ; 404 signifie déjà absent, ce n'est pas une erreur.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Suppression R2 échouée (${res.status}) pour ${key}`);
  }
}
