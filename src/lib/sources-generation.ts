/**
 * Audios proposés comme point de départ d'une reprise, dans l'onglet Création.
 *
 * Trois provenances se rejoignent ici : le morceau ouvert dans le labo, les
 * audios de la répétition en cours, et les fichiers audio du groupe. Toutes se
 * ramènent à une clé R2, seule chose dont la génération a besoin.
 */
export type OrigineSource = "labo" | "repetition" | "groupe" | "micro";

export type SourceGeneration = {
  cle: string;
  titre: string;
  origine: OrigineSource;
};

const LIBELLE_ORIGINE: Record<OrigineSource, string> = {
  labo: "Ouvert dans le labo",
  repetition: "Audio de la répétition",
  groupe: "Fichier du groupe",
  micro: "Enregistrement micro",
};

export function libelleOrigine(origine: OrigineSource): string {
  return LIBELLE_ORIGINE[origine];
}

export function sourcesDisponibles({
  labo,
  enregistrements = [],
  ressources = [],
}: {
  labo?: { cle: string; titre: string } | null;
  enregistrements?: { url: string; titre: string | null }[];
  ressources?: { url: string; nom: string; type: string }[];
}): SourceGeneration[] {
  const sortie: SourceGeneration[] = [];
  // Un même fichier peut apparaître dans plusieurs listes — l'audio ouvert dans
  // le labo est en général aussi un audio de la répétition. La première
  // provenance gagne, l'ordre décrit donc une priorité.
  const vues = new Set<string>();

  function ajouter(cle: string, titre: string, origine: OrigineSource) {
    if (!cle || vues.has(cle)) return;
    vues.add(cle);
    sortie.push({ cle, titre: titre.trim() || "Audio", origine });
  }

  if (labo) ajouter(labo.cle, labo.titre, "labo");
  for (const e of enregistrements) ajouter(e.url, e.titre ?? "Audio", "repetition");
  for (const r of ressources) {
    if (r.type !== "audio") continue;
    ajouter(r.url, r.nom, "groupe");
  }
  return sortie;
}
