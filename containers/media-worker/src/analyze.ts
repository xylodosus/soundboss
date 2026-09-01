/**
 * Orchestration d'un job.
 *
 * Enchaînement : télécharge → détecte le conteneur → sonde la durée →
 * normalise OU remuxe → calcule les pics → écrit le résultat en base.
 *
 * Deux règles d'ordre à ne pas inverser :
 *  - la normalisation SUPERSÈDE le remux (réencoder produit déjà un M4A
 *    navigable, enchaîner les deux serait un double traitement) ;
 *  - les pics sont calculés sur le fichier FINAL, pour que la waveform affichée
 *    corresponde à ce qui est réellement joué.
 *
 * Idempotent : un média déjà analysé (metadata.analyzed_at) est ignoré.
 */
import { mkdtemp, rm, open, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectContainer, needsRemux, withExtension } from './container.ts';
import { downloadToFile, uploadFromFile, uploadBuffer, deleteObject } from './r2.ts';
import { getMedia, patchMedia } from './db.ts';
import { detectTempo } from './bpm.ts';
import { detectTonalite } from './tonalite.ts';
import { probeDurationSeconds, remuxAdtsToM4a } from './ffmpeg.ts';
import { measureLoudness, shouldNormalize, normalizeLoudness } from './loudness.ts';
import { computeWaveformPeaks, serializePeaks } from './waveform.ts';
import { config } from './config.ts';

export interface AnalyzeResult {
  mediaId: string;
  skipped?: string;
  container?: string;
  durationSeconds?: number | null;
  loudnessLufs?: number | null;
  processing?: 'remux' | 'loudnorm' | null;
  tonalite?: string | null;
  newPath?: string;
  peaksPath?: string;
}

/**
 * Chemin cible d'un fichier dérivé, garanti DIFFÉRENT de la source.
 *
 * `withExtension` renvoie le chemin inchangé quand l'extension est déjà la
 * bonne — écrire dessus écraserait l'original dans R2. C'est irréversible, et
 * le Worker sert les médias en `Cache-Control: immutable` : le CDN continuerait
 * de diffuser les anciens octets pendant que la base annonce le nouveau fichier.
 * Le cas est réel : plusieurs témoignages sont déjà en `.m4a`, et la
 * normalisation loudness s'applique quel que soit le conteneur d'origine.
 */
function derivedKey(sourcePath: string, marker: string): string {
  const candidate = withExtension(sourcePath, 'm4a');
  if (candidate !== sourcePath) return candidate;
  return withExtension(sourcePath, `${marker}.m4a`);
}

/**
 * Lit l'en-tête d'un fichier local pour la détection de conteneur.
 *
 * 64 Ko et non quelques octets : un tag ID3 peut précéder les données (y
 * compris devant de l'ADTS), et `detectContainer` doit pouvoir le sauter pour
 * voir le vrai flux derrière. Au-delà de cette taille, il préfère répondre
 * « inconnu » plutôt que de se tromper.
 */
async function readHead(path: string, length = 65536): Promise<Buffer> {
  const fh = await open(path, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

export async function analyzeMedia(mediaId: string): Promise<AnalyzeResult> {
  const media = await getMedia(mediaId);
  if (!media) return { mediaId, skipped: 'média introuvable' };
  if (!media.url) return { mediaId, skipped: 'clé R2 absente' };
  if (media.analyzed_at) return { mediaId, skipped: 'déjà analysé' };

  // seance_enregistrements ne contient que des audios stockés sur R2 : les
  // discriminants de type et de fournisseur du schéma d'origine n'ont plus lieu d'être.
  const isAudio = true;
  const dir = await mkdtemp(join(tmpdir(), 'cevlord-'));
  try {
    const srcPath = join(dir, 'source');
    await downloadToFile(media.url, srcPath);

    const container = detectContainer(await readHead(srcPath));

    // --- Traitement du fichier : normalisation OU remux, jamais les deux ---
    let finalPath = srcPath;
    let finalKey = media.url;
    let processing: 'remux' | 'loudnorm' | null = null;
    let loudnessLufs: number | null = null;

    if (isAudio && config.loudness.enabled) {
      const m = await measureLoudness(srcPath, config.loudness.targetLufs);
      loudnessLufs = m?.inputI ?? null;
      if (m && shouldNormalize(m.inputI, config.loudness.targetLufs, config.loudness.toleranceLu)) {
        const out = join(dir, 'normalized.m4a');
        await normalizeLoudness(srcPath, out, m, config.loudness.targetLufs, config.loudness.aacBitrate);
        finalPath = out;
        finalKey = derivedKey(media.url, 'loudnorm');
        processing = 'loudnorm';
      }
    }

    if (!processing && needsRemux(container, 'audio')) {
      const out = join(dir, 'remuxed.m4a');
      await remuxAdtsToM4a(srcPath, out);
      finalPath = out;
      finalKey = derivedKey(media.url, 'remux');
      processing = 'remux';
    }

    if (processing) {
      // Ceinture et bretelles : `derivedKey` garantit déjà la distinction, mais
      // écraser la source serait irréversible — on refuse plutôt que risquer.
      if (finalKey === media.url) {
        throw new Error(`Refus d'écraser la source : ${finalKey}`);
      }
      await uploadFromFile(finalKey, finalPath, 'audio/mp4');
    }

    // --- Durée, sondée sur le fichier FINAL ---
    // Même raison que pour les pics : sur un ADTS brut, ffprobe n'a pas de
    // table de positions et extrapole depuis le débit — mesuré sur une vraie
    // prédication, il annonçait 1102 s au lieu des 1135 s réelles (3 % d'écart,
    // soit une barre de progression décalée d'une demi-minute). Le conteneur
    // MP4 issu du traitement, lui, stocke la durée exacte.
    const durationSeconds = await probeDurationSeconds(finalPath);

    // La durée sondée fait autorité dès lors que le fichier final est un vrai
    // conteneur : seul l'ADTS brut prive ffprobe d'une table de positions et le
    // force à extrapoler depuis le débit. Le critère n'est donc pas « un
    // traitement a eu lieu ce coup-ci » — au retraitement d'un fichier déjà
    // remuxé, `processing` vaut null alors que la durée est parfaitement fiable.
    const durationIsAuthoritative = processing !== null || container !== 'adts-aac';

    // --- Pics de waveform, sur le fichier final ---
    let peaksPath: string | undefined;
    if (isAudio && config.waveform.enabled && durationSeconds) {
      const peaks = await computeWaveformPeaks(
        finalPath,
        durationSeconds,
        config.waveform.peakCount,
        config.waveform.sampleRate,
      );
      peaksPath = withExtension(finalKey, 'peaks.json');
      await uploadBuffer(peaksPath, serializePeaks(peaks), 'application/json');
    }

    // --- Tempo et tonalité ---
    // Mesurés sur le fichier final, comme la durée et les pics.
    const bpm = await detectTempo(finalPath);
    // Proposition, non verdict : les profils de Krumhansl-Schmuckler confondent
    // volontiers une tonalité avec sa relative mineure. Le labo laisse corriger,
    // et la confiance enregistrée dit s'il faut se méfier.
    const tonalite = await detectTonalite(finalPath);

    // --- Écriture en base ---
    // Pas de colonne metadata dans ce schéma : chaque information a sa colonne.
    const patch: Record<string, unknown> = {
      analyzed_at: new Date().toISOString(),
      peaks_url: peaksPath ?? null,
      bpm,
      tonalite: tonalite?.id ?? null,
      tonalite_confiance: tonalite?.confiance ?? null,
      // Taille du fichier FINAL, retraité ou non. Le code d'origine ne la
      // renseignait qu'après réencodage : elle restait donc nulle pour tout
      // fichier déjà dans un bon conteneur, c'est-à-dire la majorité.
      taille_octets: (await stat(finalPath)).size,
    };
    // On écrase une durée existante dès que la mesure fait autorité : elle vient
    // alors d'un vrai conteneur, là où la valeur en base pouvait provenir d'une
    // estimation client approximative (cas réel : 165 s enregistrées pour 55 s).
    if (durationSeconds && (durationIsAuthoritative || !media.duree_secondes)) {
      patch.duree_secondes = durationSeconds;
    }
    if (processing) {
      patch.url = finalKey;
    }

    await patchMedia(mediaId, patch);


    if (processing && config.deleteSourceAfterProcessing && finalKey !== media.url) {
      await deleteObject(media.url);
    }

    return {
      mediaId,
      container,
      durationSeconds,
      loudnessLufs,
      processing,
      tonalite: tonalite?.id ?? null,
      newPath: processing ? finalKey : undefined,
      peaksPath,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
