export type DecisionGarde = "attendre" | "autorise" | "hors-ligne" | "connexion";

/**
 * Décide quoi afficher à l'entrée des onglets. Le cas qui motive cette
 * fonction : session absente **et** réseau coupé. Renvoyer au login serait
 * trompeur — l'utilisateur n'est pas déconnecté, il est injoignable.
 *
 * Quand l'état réseau est inconnu, on préfère le login : un utilisateur
 * réellement déconnecté doit pouvoir se connecter, et l'écran hors-ligne
 * l'enfermerait.
 */
export function decisionGarde({
  pret,
  aUneSession,
  enLigne,
}: {
  pret: boolean;
  aUneSession: boolean;
  enLigne: boolean | null;
}): DecisionGarde {
  if (!pret) return "attendre";
  if (aUneSession) return "autorise";
  if (enLigne === false) return "hors-ligne";
  return "connexion";
}
