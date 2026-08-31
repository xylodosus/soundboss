/** Champs de projet que la RPC accepte de vider (nom est NOT NULL en base). */
export const CHAMPS_EFFACABLES = [
  "description",
  "lieu_evenement",
  "date_debut",
  "date_fin",
  "date_realisation",
] as const;

export type ChampEffacable = (typeof CHAMPS_EFFACABLES)[number];

type Valeurs = Partial<Record<ChampEffacable, unknown>>;

function estVide(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/**
 * Liste les champs qui portaient une valeur et n'en portent plus.
 *
 * `modifier_projet` interprète NULL comme « garde la valeur actuelle » — c'est
 * ce qui permet de ne transmettre que les champs modifiés. Vider un champ
 * demande donc de le nommer explicitement, sans quoi l'ancienne valeur survit.
 */
export function champsAEffacer(avant: Valeurs, apres: Valeurs): ChampEffacable[] {
  return CHAMPS_EFFACABLES.filter((champ) => !estVide(avant[champ]) && estVide(apres[champ]));
}
