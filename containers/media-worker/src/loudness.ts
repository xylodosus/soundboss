/**
 * Normalisation de loudness EBU R128 (`loudnorm`), en deux passes.
 *
 * ⚠️ Contrairement au remux, c'est une opération DESTRUCTIVE : loudnorm décode,
 * applique un gain, puis réencode. Il y a donc perte de génération et un coût
 * CPU réel. D'où le flag de configuration, désactivé par défaut, et la
 * tolérance qui évite de réencoder un fichier déjà correct.
 */
import { run, probeSampleRate } from './ffmpeg.ts';

export interface LoudnessMeasurement {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
}

/**
 * Extrait le bloc JSON que loudnorm écrit sur stderr, noyé dans les logs.
 * Renvoie null si la mesure est absente ou non exploitable (silence → -inf).
 */
export function parseLoudnormJson(stderr: string): LoudnessMeasurement | null {
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  let raw: Record<string, string>;
  try {
    raw = JSON.parse(stderr.slice(start, end + 1));
  } catch {
    return null;
  }

  const num = (k: string) => Number(raw[k]);
  const measurement: LoudnessMeasurement = {
    inputI: num('input_i'),
    inputTp: num('input_tp'),
    inputLra: num('input_lra'),
    inputThresh: num('input_thresh'),
    targetOffset: num('target_offset'),
  };

  // Un silence total donne "-inf" : rien à normaliser.
  if (!Number.isFinite(measurement.inputI)) return null;
  return measurement;
}

/**
 * Faut-il réencoder ? Uniquement si l'écart à la cible dépasse la tolérance :
 * abîmer un fichier déjà correct pour 1 dB n'aurait aucun sens.
 */
export function shouldNormalize(
  measuredLufs: number | null,
  targetLufs: number,
  toleranceLu: number,
): boolean {
  if (measuredLufs === null || !Number.isFinite(measuredLufs)) return false;
  return Math.abs(measuredLufs - targetLufs) > toleranceLu;
}

/** Passe 1 : mesure, sans produire de fichier (`-f null`). */
export async function measureLoudness(
  inputPath: string,
  targetLufs: number,
): Promise<LoudnessMeasurement | null> {
  const { stderr } = await run('ffmpeg', [
    '-hide_banner',
    '-i', inputPath,
    '-af', `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:print_format=json`,
    '-f', 'null',
    '-',
  ], { maxBuffer: 10 * 1024 * 1024 });
  return parseLoudnormJson(stderr);
}

/**
 * Passe 2 : applique la correction mesurée et réencode en AAC/M4A.
 * Réinjecter les mesures de la passe 1 (`measured_*`) donne une correction
 * linéaire précise, là où une passe unique serait dynamique et approximative.
 * `+faststart` place l'atome moov en tête, indispensable à la lecture progressive.
 */
/**
 * Arguments ffmpeg de la passe 2. Extrait de `normalizeLoudness` pour être
 * vérifiable sans lancer d'encodage — le débit et le taux d'échantillonnage
 * sont les deux réglages dont une erreur ne se voit qu'à l'écoute, ou sur la
 * facture de stockage.
 */
export function argumentsNormalisation(o: {
  inputPath: string;
  outputPath: string;
  filtre: string;
  sampleRate: number | null;
  bitrate: string;
}): string[] {
  // `-map 0:a:0` : on ne prend QUE le premier flux audio. Beaucoup de MP3
  // embarquent une pochette, que ffmpeg voit comme un flux vidéo : il tente de
  // la transcoder en H.264, que le conteneur M4A refuse, et TOUT l'encodage
  // échoue alors que l'audio était correct. Sans cette ligne, trois fichiers
  // sur onze échouaient.
  const args = ['-y', '-i', o.inputPath, '-map', '0:a:0', '-af', o.filtre];
  if (o.sampleRate) args.push('-ar', String(o.sampleRate));
  args.push('-c:a', 'aac', '-b:a', o.bitrate, '-movflags', '+faststart', o.outputPath);
  return args;
}

export async function normalizeLoudness(
  inputPath: string,
  outputPath: string,
  m: LoudnessMeasurement,
  targetLufs: number,
  bitrate = '64k',
): Promise<void> {
  // ⚠️ `loudnorm` suréchantillonne à 192 kHz en interne pour détecter les crêtes
  // vraies. Sans `aresample` explicite derrière, l'encodeur AAC hérite de ce
  // taux et retombe à 96 kHz : le fichier double de poids et les lecteurs
  // mobiles produisent des artefacts audibles (constaté à l'écoute — un 44,1 kHz
  // ressortait en 96 kHz avec des interférences). On force donc le retour au
  // taux d'origine. Le probe est fait ici plutôt que passé en paramètre : c'est
  // une garantie du contrat « normaliser sans altérer le reste », l'appelant ne
  // doit pas pouvoir l'oublier.
  const sampleRate = await probeSampleRate(inputPath);

  const filter =
    `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11` +
    `:measured_I=${m.inputI}:measured_TP=${m.inputTp}` +
    `:measured_LRA=${m.inputLra}:measured_thresh=${m.inputThresh}` +
    `:offset=${m.targetOffset}:linear=true:print_format=summary` +
    (sampleRate ? `,aresample=${sampleRate}` : '');

  const args = argumentsNormalisation({
    inputPath, outputPath, filtre: filter, sampleRate, bitrate,
  });

  await run('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 });
}
