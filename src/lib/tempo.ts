/**
 * Pas de réglage du tempo dans le labo.
 *
 * Le tempo est stocké en **multiplicateur** — c'est ce dont le moteur audio a
 * besoin — mais se règle en **battements par minute** dès que le tempo du
 * morceau est connu, parce que c'est l'unité du musicien.
 *
 * Toute la difficulté est là : un cran doit déplacer le BPM affiché d'exactement
 * un, alors que la valeur manipulée est un ratio.
 */
export const TEMPO_MIN = 0.5;
export const TEMPO_MAX = 1.5;

/** Pas du mode multiplicateur, quand le BPM du morceau est inconnu. */
export const TEMPO_PAS = 0.05;

/** Les pas de 0,05 accumulent des erreurs binaires : 1,0499999 s'afficherait mal. */
export function arrondir(v: number): number {
  return Math.round(v * 100) / 100;
}

/** BPM affiché pour un multiplicateur donné. */
export function bpmAffiche(bpmOrigine: number, tempo: number): number {
  return Math.round(bpmOrigine * tempo);
}

/**
 * Un cran de tempo.
 *
 * ⚠️ En mode BPM, le ratio n'est **pas** arrondi. L'arrondir à deux décimales
 * donnait une granularité de `bpmOrigine / 100` — soit 1,2 BPM sur un morceau
 * à 120 — plus grossière que le pas de 1 BPM qu'on cherche. Certains crans
 * étaient alors absorbés : à 130, un « − » visait 129, dont le ratio 1,075
 * s'arrondissait à 1,08, c'est-à-dire de nouveau 130. Le bouton ne faisait
 * rien.
 *
 * Les bornes s'appliquent donc en BPM, pas sur le ratio, pour la même raison.
 */
export function pasTempo(tempo: number, sens: number, bpmOrigine: number): number {
  if (bpmOrigine > 0) {
    const cible = bpmAffiche(bpmOrigine, tempo) + sens;
    const min = Math.ceil(bpmOrigine * TEMPO_MIN);
    const max = Math.floor(bpmOrigine * TEMPO_MAX);
    return Math.min(max, Math.max(min, cible)) / bpmOrigine;
  }
  return arrondir(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, tempo + sens * TEMPO_PAS)));
}
