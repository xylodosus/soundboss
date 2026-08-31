import { createContext, useContext, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useNetworkState } from "expo-network";
import { supabase } from "./supabase";
import { doitRafraichirLaSession } from "./reseau-regles";

interface ContexteReseau {
  /** null tant que la première mesure n'est pas revenue. */
  enLigne: boolean | null;
}

const Contexte = createContext<ContexteReseau>({ enLigne: null });

export function FournisseurReseau({ children }: { children: React.ReactNode }) {
  const etatReseau = useNetworkState();
  const [etatApp, setEtatApp] = useState<AppStateStatus>(AppState.currentState);

  // `isInternetReachable` est plus fiable que `isConnected` : on peut être
  // associé à un Wi-Fi sans accès à Internet. On retient le plus prudent des
  // deux, et null tant qu'aucune mesure n'est disponible.
  const enLigne = etatReseau.isInternetReachable ?? etatReseau.isConnected ?? null;

  useEffect(() => {
    const abonnement = AppState.addEventListener("change", setEtatApp);
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (doitRafraichirLaSession(etatApp, enLigne)) {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  }, [etatApp, enLigne]);

  return <Contexte.Provider value={{ enLigne }}>{children}</Contexte.Provider>;
}

export function useReseau(): ContexteReseau {
  return useContext(Contexte);
}
