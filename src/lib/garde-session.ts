export type DecisionGarde =
  | "attendre"
  | "autorise"
  | "hors-ligne"
  | "connexion"
  | "onboarding";

/** État de connaissance du profil, distinct de son contenu. */
export type EtatProfil = "inconnu" | "echec" | "incomplet" | "complet";

/**
 * Décide quoi afficher à l'entrée des onglets.
 *
 * Deux cas motivent cette fonction, et tous deux se traduisaient auparavant par
 * un écran trompeur :
 *
 * — session absente **et** réseau coupé : renvoyer au login laisserait croire à
 *   une déconnexion, alors que l'utilisateur est seulement injoignable ;
 * — profil **illisible** faute de réseau : c'est le bug constaté le 31/08, où
 *   l'app renvoyait au choix du pays. Un profil qu'on n'a pas pu lire n'est pas
 *   un profil incomplet. Ne jamais conclure de l'absence d'information.
 *
 * Quand l'état réseau est inconnu, on préfère le login : un utilisateur
 * réellement déconnecté doit pouvoir se reconnecter, et l'écran hors-ligne
 * l'enfermerait.
 */
export function decisionGarde({
  pret,
  aUneSession,
  enLigne,
  profil,
}: {
  pret: boolean;
  aUneSession: boolean;
  enLigne: boolean | null;
  profil: EtatProfil;
}): DecisionGarde {
  if (!pret) return "attendre";
  if (!aUneSession) return enLigne === false ? "hors-ligne" : "connexion";

  if (profil === "inconnu") return "attendre";
  // Échec de lecture : on ne sait rien du profil. L'envoyer à l'onboarding lui
  // ferait ressaisir des informations qu'il a déjà données.
  if (profil === "echec") return "hors-ligne";
  if (profil === "incomplet") return "onboarding";
  return "autorise";
}
