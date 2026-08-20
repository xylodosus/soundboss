import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Utilisateur = Database["public"]["Tables"]["users"]["Row"];

export const clefsProfil = {
  profil: ["profil"] as const,
  packs: ["wallet", "packs"] as const,
  transactions: ["wallet", "transactions"] as const,
  notifications: ["notifications"] as const,
  jobs: ["jobs-ia"] as const,
};

export function useProfil() {
  return useQuery({
    queryKey: clefsProfil.profil,
    queryFn: async (): Promise<Utilisateur | null> => {
      const userId = await utilisateurId();
      const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
      return (data ?? null) as Utilisateur | null;
    },
  });
}

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as Database["public"]["Tables"]["wallets"]["Row"] | null;
    },
  });
}

export function usePacksCredits() {
  return useQuery({
    queryKey: clefsProfil.packs,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_packs")
        .select("*")
        .eq("est_actif", true)
        .order("ordre");
      return (data ?? []) as Database["public"]["Tables"]["credit_packs"]["Row"][];
    },
  });
}

export function useTransactionsWallet() {
  return useQuery({
    queryKey: clefsProfil.transactions,
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*, pack:credit_packs(nom)")
        .eq("wallet_id", (
          await supabase.from("wallets").select("id").eq("user_id", userId).maybeSingle()
        ).data?.id ?? "")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as (Database["public"]["Tables"]["wallet_transactions"]["Row"] & {
        pack: { nom: string } | null;
      })[];
    },
  });
}

export function useAcheterPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packId, credits, prix }: { packId: string; credits: number; prix: number }) => {
      const userId = await utilisateurId();
      const { data, error } = await supabase.rpc("crediter_wallet", {
        p_user_id: userId,
        p_credits: credits,
        p_type: "achat" as const,
        p_pack_id: packId,
        p_description: `Achat pack (${prix} FCFA) — simulation`,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: clefsProfil.transactions });
    },
  });
}

export function useMettreAJourProfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modifications: Partial<Utilisateur>) => {
      const userId = await utilisateurId();
      const { error } = await supabase.from("users").update(modifications).eq("id", userId);
      if (error) throw new Error("Impossible de mettre à jour le profil.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsProfil.profil }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: clefsProfil.notifications,
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Database["public"]["Tables"]["notifications"]["Row"][];
    },
  });
}

export function useNonLues() {
  return useQuery({
    queryKey: ["non-lues"],
    queryFn: async () => {
      const userId = await utilisateurId();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("est_lue", false);
      return count ?? 0;
    },
  });
}

export function useMarquerNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, tout }: { ids?: string[]; tout?: boolean }) => {
      const userId = await utilisateurId();
      let requete = supabase.from("notifications").update({ est_lue: true });
      if (tout) {
        requete = requete.eq("user_id", userId).is("est_lue", false);
      } else if (ids?.length) {
        requete = requete.in("id", ids);
      } else {
        return;
      }
      const { error } = await requete;
      if (error) throw new Error("Impossible de marquer comme lu.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsProfil.notifications });
      queryClient.invalidateQueries({ queryKey: ["non-lues"] });
    },
  });
}

export function useJobsIA() {
  return useQuery({
    queryKey: clefsProfil.jobs,
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("ai_jobs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Database["public"]["Tables"]["ai_jobs"]["Row"][];
    },
  });
}

/** Récupération du profil pour la garde d'authentification. */
export async function obtenirProfilComplet(): Promise<Utilisateur | null> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return null;
  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  return (data ?? null) as Utilisateur | null;
}

/**
 * Un profil est « complet » quand l'onboarding est terminé.
 * Sur mobile, l'onboarding valide le pays (étape 1) — prénom/nom viennent
 * de l'inscription. Même philosophie que le middleware web (profil incomplet
 * → wizard), adaptée aux étapes mobiles.
 */
export function profilEstComplet(profil: Utilisateur | null | undefined): boolean {
  if (!profil) return false;
  return Boolean(profil.pays && profil.pays.trim().length > 0);
}
