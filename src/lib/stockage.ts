/**
 * Agrégation du stockage, sans accès réseau.
 *
 * Séparée des requêtes parce que celles-ci importent `supabase`, qui exige des
 * variables d'environnement et fait échouer le chargement sous les tests. Même
 * raison que `reseau-regles.ts` et `stems-regles.ts`.
 */
import { couleurs } from "@/lib/theme";

export type CategorieStockage = {
  cle: string;
  label: string;
  couleur: string;
  total: number;
  nb: number;
};

export type Stockage = { categories: CategorieStockage[]; total: number; nb: number };

/** Types de fichiers déposés, plus les deux familles propres à l'audio. */
const TYPES_FICHIERS: { cle: string; label: string; couleur: string }[] = [
  { cle: "image", label: "Images", couleur: "#34D399" },
  { cle: "audio", label: "Audio", couleur: couleurs.warmGold },
  { cle: "video", label: "Vidéos", couleur: "#60A5FA" },
  { cle: "pdf", label: "PDF", couleur: couleurs.danger },
  { cle: "partition", label: "Partitions", couleur: "#C084FC" },
  { cle: "autre", label: "Autres", couleur: couleurs.muted },
];

const CATEGORIE_ENREGISTREMENTS = {
  cle: "repetitions",
  label: "Audios de répétition",
  couleur: couleurs.terracotta,
};
const CATEGORIE_STEMS = { cle: "stems", label: "Pistes extraites", couleur: "#F472B6" };

/**
 * Agrège des tailles en catégories affichables.
 *
 * Exporté pour être testé : le calcul décidait jusqu'ici du seul écran de
 * stockage, et il ignorait silencieusement deux familles de fichiers entières.
 */
export function agreger(
  fichiers: { type: string | null; taille: number | null }[],
  enregistrements: { taille: number | null }[],
  stems: { taille: number | null }[]
): Stockage {
  const categories: CategorieStockage[] = TYPES_FICHIERS.map((t) => ({
    ...t,
    total: 0,
    nb: 0,
  }));
  const parCle = new Map(categories.map((c) => [c.cle, c]));

  for (const f of fichiers) {
    const cible = parCle.get(f.type ?? "") ?? parCle.get("autre")!;
    cible.total += f.taille ?? 0;
    cible.nb += 1;
  }

  const repetitions: CategorieStockage = { ...CATEGORIE_ENREGISTREMENTS, total: 0, nb: 0 };
  for (const e of enregistrements) {
    repetitions.total += e.taille ?? 0;
    repetitions.nb += 1;
  }

  const pistes: CategorieStockage = { ...CATEGORIE_STEMS, total: 0, nb: 0 };
  for (const s of stems) {
    pistes.total += s.taille ?? 0;
    pistes.nb += 1;
  }

  const toutes = [...categories, repetitions, pistes];
  return {
    categories: toutes,
    total: toutes.reduce((s, c) => s + c.total, 0),
    nb: toutes.reduce((s, c) => s + c.nb, 0),
  };
}

