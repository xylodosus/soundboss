/**
 * Signe et libellé d'une ligne de portefeuille.
 *
 * `wallet_transactions.credits` est toujours **positif** : c'est le `type` qui
 * dit le sens. La page affichait « +1 » sur un débit parce qu'elle cherchait
 * le signe dans une valeur qui n'en porte pas.
 */
export type TypeTransaction =
  | "achat"
  | "debit"
  | "remboursement"
  | "bonus"
  | "ajustement_admin";

/** Seul le débit retire des crédits ; tout le reste en ajoute. */
export function estDebit(type: string | null | undefined): boolean {
  return type === "debit";
}

/** Montant signé, quel que soit le signe stocké. */
export function montantTransaction(
  type: string | null | undefined,
  credits: number | null | undefined
): number {
  const n = Math.abs(credits ?? 0);
  // `-1 * 0` vaut -0 en JavaScript : inoffensif à l'affichage, mais Object.is
  // le distingue de 0 et JSON le sérialise en 0. On rend un vrai zéro.
  if (n === 0) return 0;
  return estDebit(type) ? -n : n;
}

export function formatMontantTransaction(
  type: string | null | undefined,
  credits: number | null | undefined
): string {
  const n = montantTransaction(type, credits);
  // Le zéro ne prend pas de signe : « +0 » se lirait comme un gain.
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}
