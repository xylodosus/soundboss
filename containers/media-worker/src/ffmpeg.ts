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

/**
 * Réencode un audio quelconque en M4A/AAC.
 *
 * Contrairement à `remuxAdtsToM4a`, il n'y a pas de recopie possible : le flux
 * source n'est pas de l'AAC. On perd donc une génération, ce qui est le prix à
 * payer pour qu'un WMA — ou tout format que le mobile ignore — devienne
 * audible.
 *
 * `-vn` écarte les pochettes embarquées : une image traitée comme un flux vidéo
 * ferait échouer le conteneur M4A audio.
 */
export async function transcodeToM4a(
  inputPath: string,
  outputPath: string,
  /** Même convention que la normalisation : une chaîne ffmpeg, par exemple '64k'. */
  bitrate: string,
): Promise<void> {
  await run('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vn',
    '-c:a', 'aac',
    '-b:a', bitrate,
    '-movflags', '+faststart',
    outputPath,
  ], { maxBuffer: 10 * 1024 * 1024 });
}

/**
 * Réencode un stem en M4A **mono**, à fréquence réduite.
 *
 * Les stems se jouent ensemble — c'est tout leur intérêt, on en coupe un pour
 * entendre les autres. Cinq pistes stéréo à 48 kHz feraient 515 Mo décodés sur
 * l'appareil, mesure du lot E1 à l'appui. Mono à 22 050 Hz ramène chacune à
 * ~26 Mo, soit l'ordre de grandeur d'un seul morceau aujourd'hui.
 *
 * La perte est réelle et assumée : isoler une ligne de basse ou couper la voix
 * pour travailler un pupitre ne demande ni stéréo ni bande passante complète.
 */
export async function transcodeStemMono(
  inputPath: string,
  outputPath: string,
  frequence: number,
  bitrate: string,
): Promise<void> {
  await run('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vn',
    '-ac', '1',
    '-ar', String(frequence),
    '-c:a', 'aac',
    '-b:a', bitrate,
    '-movflags', '+faststart',
    outputPath,
  ], { maxBuffer: 10 * 1024 * 1024 });
}
