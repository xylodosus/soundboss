export interface AuteurMessage {
  id: string;
  prenom: string | null;
  nom: string | null;
}

/** Nom affiché au-dessus d'une bulle : « Prénom Nom », sinon « Membre ». */
export function nomAuteur(user: AuteurMessage | null | undefined): string {
  const complet = `${user?.prenom ?? ""} ${user?.nom ?? ""}`.trim();
  return complet || "Membre";
}

/**
 * Un en-tête (avatar + nom) n'est affiché qu'au début d'une série : premier
 * message, changement d'auteur, ou nouveau jour. Les messages consécutifs d'un
 * même auteur restent nus, pour ne pas alourdir la conversation.
 */
export function debutDeSerie(
  message: { user_id: string | null },
  precedent: { user_id: string | null } | null,
  nouveauJour: boolean
): boolean {
  if (nouveauJour) return true;
  if (!precedent) return true;
  return precedent.user_id !== message.user_id;
}
