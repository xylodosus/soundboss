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
      "Ce morceau est reconnu comme un enregistrement connu, et la reprise en est refusée. Essaie avec une création du groupe ou une idée enregistrée au micro.",
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
