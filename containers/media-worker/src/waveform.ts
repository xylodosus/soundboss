/**
 * Pics de waveform pour les lecteurs audio.
 *
 * Non destructif : on décode uniquement pour mesurer l'enveloppe, le fichier
 * d'origine n'est jamais modifié. Le calcul est incrémental — une heure d'audio
 * en PCM 8 kHz mono pèse ~58 Mo, qu'on ne charge jamais en entier.
 */
import { spawn } from 'node:child_process';

/** Accumule le maximum absolu par intervalle, au fil du flux PCM. */
export class PeakAccumulator {
  private readonly peaks: Uint8Array;
  private readonly samplesPerPeak: number;
  private seen = 0;
  private currentMax = 0;
  private cursor = 0;

  constructor(totalSamples: number, peakCount: number) {
    this.peaks = new Uint8Array(peakCount);
    this.samplesPerPeak = Math.max(1, Math.ceil(totalSamples / peakCount));
  }

  push(chunk: Int16Array): void {
    for (let i = 0; i < chunk.length; i++) {
      const v = Math.abs(chunk[i]);
      if (v > this.currentMax) this.currentMax = v;
      this.seen++;
      if (this.seen % this.samplesPerPeak === 0) this.flush();
    }
  }

  private flush(): void {
    if (this.cursor < this.peaks.length) {
      // 32768 = amplitude maximale d'un échantillon 16 bits signé.
      this.peaks[this.cursor] = Math.min(255, Math.round((this.currentMax / 32768) * 255));
      this.cursor++;
    }
    this.currentMax = 0;
  }

  /** Vide l'intervalle partiel restant et renvoie les pics. */
  finish(): Uint8Array {
    if (this.cursor < this.peaks.length) this.flush();
    return this.peaks;
  }
}

/**
 * Décode l'audio en PCM mono et en tire les pics.
 *
 * `sampleRate` est injecté plutôt que lu dans une configuration globale : ce
 * module reste ainsi une brique de calcul pure, testable sans variables
 * d'environnement. 8 kHz suffit largement pour une enveloppe visuelle et divise
 * par six le volume de données à parcourir par rapport à du 48 kHz.
 */
export function computeWaveformPeaks(
  inputPath: string,
  durationSeconds: number,
  peakCount: number,
  sampleRate: number,
): Promise<Uint8Array> {
  const acc = new PeakAccumulator(Math.max(1, durationSeconds * sampleRate), peakCount);

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-v', 'error',
      '-i', inputPath,
      '-ac', '1',
      '-ar', String(sampleRate),
      '-f', 's16le',
      '-',
    ]);

    // Un échantillon fait 2 octets : un morceau peut se terminer au milieu.
    // On conserve l'octet orphelin pour le recoller au morceau suivant.
    let leftover: Buffer | null = null;

    ff.stdout.on('data', (chunk: Buffer) => {
      const buf = leftover ? Buffer.concat([leftover, chunk]) : chunk;
      const usable = buf.length - (buf.length % 2);
      leftover = usable < buf.length ? buf.subarray(usable) : null;
      if (usable > 0) {
        const samples = new Int16Array(usable / 2);
        for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(i * 2);
        acc.push(samples);
      }
    });

    let stderr = '';
    ff.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg waveform a échoué (${code}) : ${stderr}`));
      resolve(acc.finish());
    });
  });
}

/** Sérialise les pics pour l'objet R2 voisin. */
export function serializePeaks(peaks: Uint8Array): string {
  return JSON.stringify({ v: 1, peaks: Array.from(peaks) });
}
