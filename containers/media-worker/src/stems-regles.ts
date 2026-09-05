/**
 * Règles pures de la séparation en stems.
 *
 * Séparées de `stems.ts` parce que ce dernier importe `config`, qui exige des
 * variables d'environnement et fait échouer le chargement sous les tests. Même
 * raison que `reseau-regles.ts` côté application.
 */
import { STEM_TYPES, type StemType } from './fadr.ts';

/**
 * Clé R2 d'un stem, rangée dans un dossier voisin du morceau.
 *
 * Le type vient de Fadr et n'est pas contraint : on le normalise sévèrement
 * avant d'en faire un chemin. Un type contenant des séparateurs sortirait
 * sinon du dossier prévu.
 */
export function cleStem(cleSource: string, type: string): string {
  const point = cleSource.lastIndexOf('.');
  const base = point === -1 ? cleSource : cleSource.slice(0, point);
  const nom =
    type
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'stem';
  return `${base}.stems/${nom}.m4a`;
}

/** Stem dont descend un affinage, s'il a déjà été produit. */
export function parentPourType(
  stemType: StemType,
  existants: { id: string; type: string }[],
): string | null {
  const attendu = STEM_TYPES[stemType].parent;
  if (!attendu) return null;
  return existants.find((s) => s.type === attendu)?.id ?? null;
}

/** Fadr ne décrit aucun état d'échec : l'échéance est le seul juge. */
export function echeanceDepassee(debut: number, maintenant: number, delaiMax: number): boolean {
  return maintenant - debut > delaiMax;
}

