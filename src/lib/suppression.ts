/**
 * Ce qu'une suppression emporte, et comment le dire avant de la faire.
 *
 * Les pistes extraites forment un arbre : un affinage naît d'une piste, et
 * `parent_id` est en `on delete cascade`. Supprimer une piste emporte donc en
 * silence tout ce qui en descend. L'utilisateur doit le savoir avant, pas le
 * découvrir après.
 */
import { tailleLisible } from "@/lib/format";

export type NoeudStem = { id: string; parent_id?: string | null; taille_octets?: number | null };

/** Identifiants de tout ce qui descend d'une piste, elle non comprise. */
export function descendants<T extends NoeudStem>(stems: T[], id: string): string[] {
  const enfantsDe = new Map<string, string[]>();
  for (const s of stems) {
    if (!s.parent_id) continue;
    const liste = enfantsDe.get(s.parent_id) ?? [];
    liste.push(s.id);
    enfantsDe.set(s.parent_id, liste);
  }

  const sortie: string[] = [];
  // Parcours itératif et non récursif : une donnée venue de la base peut
  // toujours porter un cycle, et une pile d'appels n'en réchapperait pas.
  const vus = new Set<string>([id]);
  const aVoir = [id];
  while (aVoir.length > 0) {
    const courant = aVoir.pop()!;
    for (const enfant of enfantsDe.get(courant) ?? []) {
      if (vus.has(enfant)) continue;
      vus.add(enfant);
      sortie.push(enfant);
      aVoir.push(enfant);
    }
  }
  return sortie;
}

export function octetsDe<T extends NoeudStem>(stems: T[], ids: string[]): number {
  const cible = new Set(ids);
  return stems
    .filter((s) => cible.has(s.id))
    .reduce((total, s) => total + (s.taille_octets ?? 0), 0);
}

/** Avertissement affiché avant de supprimer une piste. */
export function resumeSuppressionStem(nbAffinages: number, octets: number): string {
  const poids = octets > 0 ? ` (${tailleLisible(octets)})` : "";
  if (nbAffinages === 0) {
    return `Cette piste sera définitivement supprimée${poids}.`;
  }
  const s = nbAffinages > 1 ? "s" : "";
  return `Cette piste et le${s} ${nbAffinages} affinage${s} qui en découle${s} seront définitivement supprimé${s}${poids}.`;
}

/** Avertissement affiché avant de supprimer tout l'arbre d'un enregistrement. */
export function resumeSuppressionArbre(nbPistes: number, octets: number): string {
  const poids = octets > 0 ? ` (${tailleLisible(octets)})` : "";
  const s = nbPistes > 1 ? "s" : "";
  return `${nbPistes} piste${s} extraite${s} seront définitivement supprimée${s}${poids}. L'audio d'origine est conservé.`;
}
