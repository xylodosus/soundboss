import { useCallback, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import {
  ATTENTE_MS,
  doitAttendre,
  lireRetour,
  messageIssue,
  type StatutPaiement,
} from "@/lib/paiement";

/** Moyens de paiement acceptés par l'opérateur en Côte d'Ivoire. */
export const MOYENS = [
  { id: "wave", nom: "Wave" },
  { id: "orange", nom: "Orange Money" },
  { id: "mtn", nom: "MTN MoMo" },
  { id: "moov", nom: "Moov Money" },
  { id: "djamo", nom: "Djamo" },
] as const;

export type Moyen = (typeof MOYENS)[number]["id"];

export type Resultat = { statut: StatutPaiement | null; message: string; credits: number };

const RETOUR_APP = "soundboss://wallet";

function attendre(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function etatPaiement(reference: string): Promise<{ statut: StatutPaiement | null; credits: number }> {
  const { data, error } = await supabase.rpc("etat_paiement", { p_reference: reference });
  if (error) return { statut: null, credits: 0 };
  const r = data as { success: boolean; data?: { statut: StatutPaiement; credits: number } } | null;
  if (!r?.success || !r.data) return { statut: null, credits: 0 };
  return { statut: r.data.statut, credits: r.data.credits ?? 0 };
}

/**
 * Achat d'un pack de crédits, du bouton jusqu'au solde.
 *
 * ⚠️ Le retour du navigateur ne crédite rien et ne prouve rien : le payeur
 * peut ouvrir l'adresse de succès sans avoir réglé. On interroge donc la base,
 * qui n'est écrite que par le webhook signé de l'opérateur.
 */
export function useAchatCredits() {
  const client = useQueryClient();
  const [enCours, setEnCours] = useState<string | null>(null);

  const acheter = useCallback(
    async (packId: string, moyen: Moyen): Promise<Resultat> => {
      setEnCours(packId);
      try {
        const { data, error } = await supabase.functions.invoke("acheter-credits", {
          body: { packId, methode: moyen },
        });
        if (error) throw new Error("Impossible d'ouvrir le paiement.");
        const ouverture = data as { redirectUrl?: string; reference?: string } | null;
        if (!ouverture?.redirectUrl || !ouverture.reference) {
          throw new Error("L'opérateur n'a pas rendu de page de paiement.");
        }

        const resultat = await WebBrowser.openAuthSessionAsync(
          ouverture.redirectUrl,
          RETOUR_APP
        );

        // L'utilisateur a fermé le navigateur : on ne conclut rien. Le
        // paiement a pu aboutir malgré tout, le webhook tranchera.
        const retour =
          resultat.type === "success" ? lireRetour(resultat.url) : { issue: "inconnue" as const };

        if (retour.issue === "interrompu") {
          return { statut: "failed", message: messageIssue("failed", 0), credits: 0 };
        }

        // Le webhook arrive peu après la redirection, mais rien ne le garantit
        // à la seconde : on interroge la base jusqu'à ce qu'elle tranche.
        let statut: StatutPaiement | null = null;
        let credits = 0;
        for (let essais = 0; doitAttendre(statut, essais); essais += 1) {
          if (essais > 0) await attendre(ATTENTE_MS);
          const etat = await etatPaiement(ouverture.reference);
          statut = etat.statut;
          credits = etat.credits;
        }

        client.invalidateQueries({ queryKey: ["wallet"] });
        return { statut, message: messageIssue(statut, credits), credits };
      } finally {
        setEnCours(null);
      }
    },
    [client]
  );

  return { acheter, enCours };
}
