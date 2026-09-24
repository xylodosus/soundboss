/**
 * Ce qu'on dit à l'utilisateur avant de prélever ses crédits.
 *
 * Le tarif affiché ici n'engage rien : il est recalculé côté serveur au moment
 * du débit. Cet écran sert à demander un accord, pas à fixer un prix.
 */

export function accordCredits(cout: number): string {
  const s = cout > 1 ? "s" : "";
  return `Cette opération te coûtera ${cout} crédit${s}.`;
}

export function creditsManquants(cout: number, solde: number): number {
  return Math.max(0, cout - solde);
}

export function soldeInsuffisant(cout: number, solde: number): string {
  const manque = creditsManquants(cout, solde);
  const s = cout > 1 ? "s" : "";
  return (
    `Ton solde de crédits est insuffisant pour effectuer cette opération.` +
    ` Elle coûte ${cout} crédit${s}, il t'en reste ${solde}` +
    (manque > 0 ? ` — il en manque ${manque}.` : ".")
  );
}
