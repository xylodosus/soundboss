import type { AppStateStatus } from "react-native";

/**
 * Le rafraîchissement de jeton ne doit tourner que si l'app est au premier plan
 * ET connectée. Hors ligne, un rafraîchissement échoue et @supabase/auth-js
 * efface la session de SecureStore quand le jeton est réellement expiré — la
 * reconnexion devient alors obligatoire. On s'abstient tant que l'état réseau
 * est inconnu (null), par prudence.
 *
 * Règle isolée du fournisseur : elle ne dépend ni d'expo-network ni du client
 * Supabase, et reste donc testable sans environnement natif.
 */
export function doitRafraichirLaSession(
  etatApp: AppStateStatus,
  enLigne: boolean | null
): boolean {
  return etatApp === "active" && enLigne === true;
}
