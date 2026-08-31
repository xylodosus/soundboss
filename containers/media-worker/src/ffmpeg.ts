/**
 * Wrappers ffprobe / ffmpeg. C'est la raison d'être du conteneur : ces binaires
 * natifs sont inaccessibles depuis un runtime edge (Deno/Workers isolates).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const run = promisify(execFile);

/** Durée en secondes (entier), ou null si ffprobe ne la détermine pas. */
export async function probeDurationSeconds(filePath: string): Promise<number | null> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const value = Number(stdout.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/** Taux d'échantillonnage du premier flux audio, ou null s'il est indéterminé. */
export async function probeSampleRate(filePath: string): Promise<number | null> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=sample_rate',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const value = Number(stdout.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Remuxe un ADTS AAC brut en MP4/M4A **sans réencodage**.
 *
 * - `-c copy` : on recopie les trames telles quelles (aucune perte, quelques
 *   secondes même sur un fichier d'une heure).
 * - `-bsf:a aac_adtstoasc` : filtre de flux obligatoire ADTS → MP4, il convertit
 *   les en-têtes ADTS en configuration ASC attendue par le conteneur MP4.
 * - `-movflags +faststart` : place l'atome `moov` en tête, sans quoi le lecteur
 *   devrait télécharger tout le fichier avant de démarrer.
 */
export async function remuxAdtsToM4a(inputPath: string, outputPath: string): Promise<void> {
  await run('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-c', 'copy',
    '-bsf:a', 'aac_adtstoasc',
    '-movflags', '+faststart',
    outputPath,
  ], { maxBuffer: 10 * 1024 * 1024 });
}
