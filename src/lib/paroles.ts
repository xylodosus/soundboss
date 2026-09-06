/**
 * Longueur d'un chant d'après ses paroles.
 *
 * Avec voix, Suno s'arrête quand le texte est épuisé : un couplet de quatre
 * lignes rend une quinzaine de secondes, que l'on ait demandé trois minutes ou
 * non. Le même morceau en instrumental atteint bien la durée voulue. Autant
 * prévenir avant de lancer plutôt que de laisser constater après.
 */

/** Balises de structure Suno, libellées en français, insérées en anglais. */
export const BALISES: { libelle: string; balise: string }[] = [
  { libelle: "Intro", balise: "[Intro]" },
  { libelle: "Couplet", balise: "[Verse]" },
  { libelle: "Refrain", balise: "[Chorus]" },
  { libelle: "Pont", balise: "[Bridge]" },
  { libelle: "Instrumental", balise: "[Instrumental Break]" },
  { libelle: "Final", balise: "[Outro]" },
];

/**
 * Ordre de grandeur d'une ligne chantée, en secondes. Approximation assumée :
 * elle sert à alerter, pas à promettre une durée.
 */
export const SECONDES_PAR_LIGNE = 5;

/** Lignes réellement chantées : ni balises, ni indications entre parenthèses. */
export function lignesChantees(paroles: string): number {
  return paroles
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("[") && !l.startsWith("(")).length;
}

export function dureeParolesEstimee(paroles: string): number {
  return lignesChantees(paroles) * SECONDES_PAR_LIGNE;
}

/**
 * Vrai quand les paroles ne peuvent visiblement pas porter la durée demandée.
 *
 * Le seuil est large : on n'alerte que sur un écart franc, pour ne pas harceler
 * quelqu'un dont le texte est simplement un peu court.
 */
export function parolesTropCourtes(paroles: string, duree: number | null): boolean {
  if (duree === null) return false;
  return dureeParolesEstimee(paroles) < duree * 0.6;
}

/** Ajoute une balise en fin de texte, sur sa propre ligne. */
export function ajouterBalise(paroles: string, balise: string): string {
  if (paroles.trim().length === 0) return `${balise}\n`;
  return `${paroles.replace(/\n+$/, "")}\n\n${balise}\n`;
}
