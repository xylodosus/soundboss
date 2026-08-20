"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface ContexteSession {
  session: Session | null;
  pret: boolean;
}

const Contexte = createContext<ContexteSession>({ session: null, pret: false });

export function FournisseurSession({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession);
    });

    return () => abonnement.subscription.unsubscribe();
  }, []);

  return (
    <Contexte.Provider value={{ session, pret }}>{children}</Contexte.Provider>
  );
}

export function useSession(): ContexteSession {
  return useContext(Contexte);
}
