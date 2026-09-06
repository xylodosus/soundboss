/**
 * Traduction des échecs de génération.
 *
 * Les messages de Kie.ai sont en anglais et techniques. Les afficher tels quels
 * laisserait l'utilisateur devant « This audio matches an existing recording in
 * our catalog » sans savoir quoi faire — alors que la conduite à tenir est
 * simple et se dit en une phrase.
 */
const TRADUCTIONS: { motif: RegExp; message: string }[] = [
  {
    // Constaté le 6 septembre : Suno refuse toute source dont l'empreinte
    // correspond à un enregistrement de son catalogue. La reprise ne vaut donc
    // que pour du matériel original.
    motif: /matches an existing recording|existing recording in our catalog/i,
    message:
      "Cet audio a été rejeté au titre des droits d'auteur : il correspond à un enregistrement existant. Rien ne t'a été facturé. Essaie avec une création du groupe ou une idée enregistrée au micro.",
  },
  {
    // Second refus de Suno, distinct du précédent : il ne porte pas sur
    // l'enregistrement mais sur le texte chanté. Une reprise de cantique
    // populaire échoue ici même chantée par une voix originale.
    motif: /copyrighted lyrics|copyright.*lyrics/i,
    message:
      "Cet audio a été rejeté au titre des droits d'auteur : les paroles chantées appartiennent à une œuvre protégée. Rien ne t'a été facturé. Essaie avec un texte original.",
  },
  {
    motif: /insufficient credits/i,
    message: "Le service de génération n'a plus de crédit. Préviens l'administrateur.",
  },
  {
    motif: /lien signé de la source|n'est pas accessible/i,
    message: "L'audio source n'a pas pu être lu. Réessaie dans un instant.",
  },
  {
    motif: /prend anormalement longtemps|timeout/i,
    message: "La génération a mis trop de temps. Réessaie.",
  },
];

export function messageErreurGeneration(brut: string | null | undefined): string {
  if (!brut) return "La génération n'a pas abouti.";
  const trouvee = TRADUCTIONS.find((t) => t.motif.test(brut));
  return trouvee ? trouvee.message : brut;
}

export type TonGeneration = "attente" | "succes" | "echec";

/** Étiquette d'état d'une génération, telle qu'affichée sur la pastille. */
export function etatGeneration(
  statut: string | null | undefined,
  nbPistes: number
): { libelle: string; ton: TonGeneration } {
  if (statut === "queued") return { libelle: "En file", ton: "attente" };
  if (statut === "processing") return { libelle: "En cours", ton: "attente" };
  if (statut === "failed") return { libelle: "Échec", ton: "echec" };
  if (statut === "completed") {
    // Une demande rend deux versions, mais rien ne garantit qu'elles arrivent
    // toutes les deux : l'étiquette dit ce qui est réellement écoutable.
    if (nbPistes === 0) return { libelle: "Aucune version", ton: "echec" };
    return {
      libelle: `${nbPistes} version${nbPistes > 1 ? "s" : ""}`,
      ton: "succes",
    };
  }
  return { libelle: "En cours", ton: "attente" };
}

/**
 * Générations à faire figurer dans la liste.
 *
 * Un échec n'a pas sa place dans l'historique : dans un groupe, il s'afficherait
 * à tous les membres alors qu'il ne concerne que son auteur, et il y resterait.
 * Il n'est donc montré qu'à son demandeur, et seulement tant qu'il ne l'a pas
 * vu. La ligne survit en base, où elle sert au suivi des coûts.
 */
export function generationsVisibles<
  T extends { statut: string | null; user_id: string | null; lu_at: string | null },
>(generations: T[], moi: string | null): T[] {
  return generations.filter((g) => {
    if (g.statut !== "failed") return true;
    return moi !== null && g.user_id === moi && !g.lu_at;
  });
}
