/**
 * Au-delà de cet écart entre deux relevés de position, on considère que
 * l'utilisateur a déplacé la barre plutôt qu'écouté. Le lecteur relève sa
 * position environ chaque seconde ; 3 s laissent de la marge aux à-coups
 * sans laisser passer un saut délibéré.
 */
export const SAUT_MAX_SECONDES = 3;

/**
 * Secondes à ajouter au cumul entre deux relevés. Retourne 0 sur un retour en
 * arrière ou un bond en avant : seul le temps réellement joué doit compter,
 * sans quoi glisser la barre à 30 % validerait l'écoute sans rien entendre.
 */
export function deltaEcoute(positionPrecedente: number, positionActuelle: number): number {
  const delta = positionActuelle - positionPrecedente;
  if (delta <= 0) return 0;
  if (delta > SAUT_MAX_SECONDES) return 0;
  return delta;
}

/** Une écoute compte à partir de 30 % de la durée totale réellement jouée. */
export function estEcoutee(secondesEcoutees: number, dureeTotale: number | null): boolean {
  if (!dureeTotale || dureeTotale <= 0) return false;
  return secondesEcoutees >= Math.ceil(dureeTotale * 0.3);
}
