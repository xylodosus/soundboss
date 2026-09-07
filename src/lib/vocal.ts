/**
 * Règles du geste d'enregistrement d'une note vocale.
 *
 * Le contrat est celui que WhatsApp a imposé et que tout le monde connaît :
 * appui maintenu pour enregistrer, glissement vers la gauche pour annuler,
 * glissement vers le haut pour verrouiller et lâcher le doigt. Le relâchement
 * envoie — c'est ce qui rend le geste léger, et c'est aussi ce qui oblige à
 * écarter les appuis trop brefs.
 */

/** Distance en points au-delà de laquelle le geste est décidé. */
export const SEUIL_ANNULATION = 70;
export const SEUIL_VERROU = 70;

/** En deçà, l'appui est un accident : rien n'est envoyé. */
export const DUREE_MINIMALE_MS = 800;

export type EtatVocal = "repos" | "enregistre" | "verrouille";

export type IssueGeste = "rien" | "annuler" | "verrouiller";

/**
 * Ce que le déplacement du doigt décide, s'il décide quelque chose.
 *
 * L'axe dominant l'emporte : un mouvement en diagonale doit trancher, sinon un
 * geste approximatif déclencherait les deux à la fois — ou pire, l'annulation
 * alors que l'utilisateur visait le verrou.
 */
export function issueDuGeste(dx: number, dy: number): IssueGeste {
  const versLaGauche = -dx;
  const versLeHaut = -dy;
  if (versLaGauche >= SEUIL_ANNULATION && versLaGauche >= versLeHaut) return "annuler";
  if (versLeHaut >= SEUIL_VERROU && versLeHaut > versLaGauche) return "verrouiller";
  return "rien";
}

/** Progression 0→1 vers un seuil, pour l'estompage et le glissement de l'indice. */
export function progressionVers(distance: number, seuil: number): number {
  if (distance <= 0) return 0;
  return Math.min(1, distance / seuil);
}

export type IssueRelachement = "envoyer" | "trop-court";

export function issueAuRelachement(dureeMs: number): IssueRelachement {
  return dureeMs >= DUREE_MINIMALE_MS ? "envoyer" : "trop-court";
}

/** Chronomètre d'une note vocale : m:ss, sans heures, contrairement au labo. */
export function chronoVocal(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
