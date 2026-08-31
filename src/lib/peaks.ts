/**
 * Pics de waveform produits par le media-worker.
 *
 * Le conteneur écrit `<base>.peaks.json` dans R2 et enregistre la clé dans
 * `seance_enregistrements.peaks_url`. Format : `{ v: 1, peaks: number[] }`,
 * mille valeurs d'amplitude de 0 à 255 (voir `containers/media-worker/src/waveform.ts`).
 */

/** Nombre de pics écrits par le worker — utile pour dimensionner un repli. */
export const NB_PICS_WORKER = 1000;

export function parsePics(brut: string): number[] | null {
  try {
    const donnees = JSON.parse(brut) as { v?: number; peaks?: unknown };
    // Refuser une version inconnue : mieux vaut pas de waveform du tout qu'une
    // waveform fausse, lue selon un format qui aurait changé côté conteneur.
    if (donnees.v !== 1 || !Array.isArray(donnees.peaks)) return null;
    return donnees.peaks.filter((p): p is number => typeof p === "number");
  } catch {
    return null;
  }
}

/**
 * Réduit les pics à la largeur d'affichage en gardant le **maximum** de chaque
 * intervalle, et non la moyenne : une moyenne lisserait les attaques, et la
 * waveform perdrait précisément ce qu'on y cherche — les repères visuels.
 */
export function echantillonnerPics(pics: number[], largeur: number): number[] {
  if (pics.length === 0 || largeur <= 0) return [];
  if (pics.length <= largeur) return pics;

  const parIntervalle = pics.length / largeur;
  const sortie: number[] = [];
  for (let i = 0; i < largeur; i++) {
    const debut = Math.floor(i * parIntervalle);
    const fin = Math.min(pics.length, Math.floor((i + 1) * parIntervalle));
    let max = 0;
    for (let j = debut; j < fin; j++) if (pics[j] > max) max = pics[j];
    sortie.push(max);
  }
  return sortie;
}
