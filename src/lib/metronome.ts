/**
 * Calcul des instants de clic du métronome, exprimés en temps du tampon audio.
 *
 * La conversion vers le temps du contexte se fait à l'appel, car elle dépend du
 * tempo de lecture : à 0,8x, une seconde de morceau dure 1,25 seconde réelle.
 */

export const BPM_MIN = 30;
export const BPM_MAX = 300;

/** Tolérance de comparaison : sans elle, un temps tombant pile sur la position saute. */
const EPSILON = 1e-9;

/**
 * Instants de clic compris dans `[position, position + horizon)`.
 *
 * @param position position de lecture courante, en secondes du tampon
 * @param phase    instant du premier temps, fixé par le bouton « Caler »
 * @param bpm      battements par minute
 * @param horizon  fenêtre de programmation à l'avance, en secondes
 */
export function clicsDansHorizon(
  position: number,
  phase: number,
  bpm: number,
  horizon: number
): number[] {
  // Un bpm hors bornes ferait tourner la boucle sans fin ou noierait la sortie.
  if (!Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) return [];
  if (!(horizon > 0)) return [];

  const intervalle = 60 / bpm;
  const depart = Math.max(position, phase);
  const premier = Math.max(0, Math.ceil((depart - phase) / intervalle - EPSILON));
  const fin = position + horizon;

  const clics: number[] = [];
  for (let n = premier; ; n++) {
    const t = phase + n * intervalle;
    if (t >= fin) break;
    if (t >= position - EPSILON) clics.push(t);
  }
  return clics;
}
