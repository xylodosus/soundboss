/** Bandes et conversions de l'égaliseur graphique du labo. */

export type TypeBande = "lowshelf" | "peaking" | "highshelf";

export type Bande = {
  libelle: string;
  frequence: number;
  type: TypeBande;
};

/**
 * Dix bandes espacées d'une octave, la disposition classique d'un égaliseur
 * graphique. Les extrêmes sont en plateau et non en cloche : relever la
 * brillance doit relever tout ce qui est au-dessus de 16 kHz, pas creuser une
 * bosse autour.
 */
export const BANDES: Bande[] = [
  { libelle: "31", frequence: 31, type: "lowshelf" },
  { libelle: "62", frequence: 62, type: "peaking" },
  { libelle: "125", frequence: 125, type: "peaking" },
  { libelle: "250", frequence: 250, type: "peaking" },
  { libelle: "500", frequence: 500, type: "peaking" },
  { libelle: "1K", frequence: 1000, type: "peaking" },
  { libelle: "2K", frequence: 2000, type: "peaking" },
  { libelle: "4K", frequence: 4000, type: "peaking" },
  { libelle: "8K", frequence: 8000, type: "peaking" },
  { libelle: "16K", frequence: 16000, type: "highshelf" },
];

/** Le natif accepte ±40 dB : au-delà d'une quinzaine, on ne corrige plus, on détruit. */
export const GAIN_MAX = 15;

/** Graduations horizontales, en décibels. */
export const GRADUATIONS = [GAIN_MAX, GAIN_MAX / 2, 0, -GAIN_MAX / 2, -GAIN_MAX];

/** Post-gain de sortie, en décibels, et sa conversion en gain linéaire. */
export const POST_GAIN_MAX = 12;

export function gainLineaire(decibels: number): number {
  return Math.pow(10, decibels / 20);
}

/** Largeur des cloches. 1 couvre environ une octave, assez large pour rester musical. */
export const Q_CLOCHE = 1;

/** Position du curseur, de 0 en haut (+12 dB) à 1 en bas (−12 dB). */
export function ratioDepuisGain(gain: number): number {
  const borne = Math.min(GAIN_MAX, Math.max(-GAIN_MAX, gain));
  return (GAIN_MAX - borne) / (2 * GAIN_MAX);
}

/**
 * Gain atteint après un glissement vertical de `dy` pixels.
 *
 * `dy` est positif vers le bas en coordonnées écran, d'où la soustraction : un
 * doigt qui monte doit monter le gain.
 */
export function gainDepuisDeplacement(
  gainDepart: number,
  dy: number,
  hauteurUtile: number
): number {
  // Avant la mesure de la piste, tout déplacement diviserait par zéro.
  if (hauteurUtile <= 0) return gainDepart;
  const parPixel = (2 * GAIN_MAX) / hauteurUtile;
  const brut = gainDepart - dy * parPixel;
  return Math.min(GAIN_MAX, Math.max(-GAIN_MAX, Math.round(brut)));
}

export function libelleFrequence(hz: number): string {
  return hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
}
