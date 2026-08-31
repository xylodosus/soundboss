/**
 * Détection du tempo par `aubiotrack`.
 *
 * Le paquet Alpine `aubio` ne fournit PAS de commande `aubio` à sous-commandes :
 * il expose les anciens binaires séparés (aubiotrack, aubioonset, aubiopitch…).
 * `aubiotrack` n'imprime pas un BPM mais la suite des instants de battement, en
 * secondes, un par ligne — le tempo s'en déduit.
 *
 * La tonalité n'est PAS détectée ici : aubio ne sait pas l'extraire (issue #369
 * du projet), il faudrait un extracteur chroma type KeyExtractor d'Essentia,
 * qui imposerait une base Debian. Elle arrive avec les stems, via Fadr.
 */
import { spawn } from 'node:child_process';

/** Bornes musicales plausibles : hors de là, la mesure est du bruit. */
const BPM_MIN = 40;
const BPM_MAX = 300;

/** En deçà, une médiane d'intervalles n'a aucune valeur statistique. */
const BATTEMENTS_MIN = 4;

/** Lit la sortie d'aubiotrack : un instant de battement par ligne. */
export function parseBattements(sortie: string): number[] {
  return sortie
    .split('\n')
    .map((l) => l.trim())
    // Filtrer AVANT la conversion : Number('') vaut 0, une ligne vide
    // deviendrait sinon un battement à l'instant zéro.
    .filter((l) => l.length > 0)
    .map(Number)
    .filter((v) => Number.isFinite(v));
}

/**
 * Tempo déduit de la médiane des intervalles entre battements. La médiane, et
 * non la moyenne : un battement manqué ou doublé produit un intervalle aberrant
 * qui tirerait fortement une moyenne, sans déplacer la médiane.
 */
export function bpmDepuisBattements(battements: number[]): number | null {
  if (battements.length < BATTEMENTS_MIN) return null;

  const intervalles: number[] = [];
  for (let i = 1; i < battements.length; i++) {
    const d = battements[i] - battements[i - 1];
    if (d > 0) intervalles.push(d);
  }
  if (intervalles.length === 0) return null;

  intervalles.sort((a, b) => a - b);
  const milieu = Math.floor(intervalles.length / 2);
  const mediane =
    intervalles.length % 2 === 0
      ? (intervalles[milieu - 1] + intervalles[milieu]) / 2
      : intervalles[milieu];

  const bpm = Math.round(60 / mediane);
  if (!Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) return null;
  return bpm;
}

/**
 * Détecte le tempo d'un fichier. Retourne null si aubiotrack est absent, échoue
 * ou doute : le BPM est un agrément, jamais un bloquant.
 */
export async function detectTempo(chemin: string): Promise<number | null> {
  return new Promise((resolve) => {
    const p = spawn('aubiotrack', [chemin]);
    let sortie = '';
    p.stdout.on('data', (d) => (sortie += d.toString()));
    p.on('error', () => resolve(null));
    p.on('close', (code) =>
      resolve(code === 0 ? bpmDepuisBattements(parseBattements(sortie)) : null),
    );
  });
}
