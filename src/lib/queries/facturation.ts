import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useDialogue } from "@/lib/dialogue";
import { accordCredits, soldeInsuffisant } from "@/lib/facturation";

export type Devis = { cout: number; solde: number; suffisant: boolean };

async function demanderDevis(operation: "stems" | "generation", ref?: string): Promise<Devis> {
  const { data, error } = await supabase.rpc("devis_operation", {
    p_operation: operation,
    p_ref: ref ?? null,
  });
  if (error) throw error;
  const r = data as { success: boolean; message: string; data?: Devis } | null;
  if (!r?.success || !r.data) throw new Error(r?.message ?? "Tarif indisponible.");
  return r.data;
}

/**
 * Demande son accord à l'utilisateur avant une opération facturée.
 *
 * Rend `true` seulement si l'opération doit être lancée. Le devis affiché
 * n'engage rien : le serveur recalcule le tarif et revérifie le solde au
 * moment du débit. Cet écran sert à obtenir un accord, pas à fixer un prix —
 * un client modifié ne peut donc rien s'offrir.
 */
export function useConfirmerDepense() {
  const dialogue = useDialogue();
  const router = useRouter();
  const client = useQueryClient();

  return useCallback(
    async (operation: "stems" | "generation", ref?: string): Promise<boolean> => {
      let devis: Devis;
      try {
        devis = await demanderDevis(operation, ref);
      } catch (e) {
        await dialogue.erreur(e instanceof Error ? e.message : "Tarif indisponible.");
        return false;
      }

      if (!devis.suffisant) {
        const recharger = await dialogue.confirmer({
          titre: "Crédits insuffisants",
          message: soldeInsuffisant(devis.cout, devis.solde),
          boutonConfirmer: "Recharger",
          boutonAnnuler: "Annuler",
        });
        if (recharger) {
          // Le solde aura changé au retour : la page qui l'affiche doit le
          // relire plutôt que montrer l'ancien.
          client.invalidateQueries({ queryKey: ["wallet"] });
          router.push("/wallet");
        }
        return false;
      }

      return dialogue.confirmer({
        titre: "Confirmer la dépense",
        message: accordCredits(devis.cout),
        boutonConfirmer: "Payer",
        boutonAnnuler: "Annuler",
      });
    },
    [dialogue, router, client]
  );
}
