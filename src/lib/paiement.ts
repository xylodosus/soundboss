/**
 * Retour de l'opérateur de paiement, côté application.
 *
 * ⚠️ Rien de ce qui arrive par l'URL ne prouve un paiement. Le payeur contrôle
 * son navigateur et peut ouvrir l'adresse de succès sans avoir rien réglé.
 * Ces fonctions servent à savoir **quoi demander à la base**, jamais à décider
 * qu'un paiement a abouti.
 */

export type IssueRetour = "retour" | "interrompu" | "inconnue";

export type RetourPaiement = { issue: IssueRetour; reference: string | null };

/** Lit le lien profond rendu par l'opérateur : `soundboss://wallet?...`. */
export function lireRetour(url: string | null | undefined): RetourPaiement {
  if (!url) return { issue: "inconnue", reference: null };
  try {
    const params = new URL(url).searchParams;
    const brut = params.get("paiement");
    const issue: IssueRetour =
      brut === "retour" ? "retour" : brut === "interrompu" ? "interrompu" : "inconnue";
    return { issue, reference: params.get("ref") };
  } catch {
    return { issue: "inconnue", reference: null };
  }
}

/** Statuts rendus par `etat_paiement`. */
export type StatutPaiement = "pending" | "completed" | "failed" | "refunded";

/** Intervalle entre deux interrogations, en millisecondes. */
export const ATTENTE_MS = 2000;

/**
 * Nombre d'interrogations avant d'abandonner.
 *
 * Le webhook arrive peu après le retour du navigateur, mais rien ne le
 * garantit à la seconde. Trente secondes couvrent largement le cas normal ;
 * au-delà, mieux vaut rendre la main que faire tourner un écran d'attente.
 */
export const ESSAIS_MAX = 15;

/**
 * Faut-il continuer d'interroger la base ?
 *
 * `pending` n'est pas une réponse : c'est l'absence de réponse. Tout autre
 * statut est définitif.
 */
export function doitAttendre(statut: StatutPaiement | null, essais: number): boolean {
  if (essais >= ESSAIS_MAX) return false;
  return statut === null || statut === "pending";
}

export function messageIssue(statut: StatutPaiement | null, credits: number): string {
  if (statut === "completed") {
    const s = credits > 1 ? "s" : "";
    return `Paiement confirmé. ${credits} crédit${s} ajouté${s} à ton solde.`;
  }
  if (statut === "failed") return "Le paiement n'a pas abouti. Rien ne t'a été débité.";
  // Ni confirmé ni refusé : l'opérateur n'a pas encore tranché. Annoncer un
  // échec ici ferait croire à une perte alors que l'argent peut arriver.
  return "Paiement en cours de vérification. Ton solde se mettra à jour dès confirmation.";
}
