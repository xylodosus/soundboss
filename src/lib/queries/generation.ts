import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, utilisateurId } from "@/lib/supabase";

export type PisteGeneree = {
  url: string;
  titre: string | null;
  duree_secondes: number | null;
  taille_octets: number | null;
};

export type JobGeneration = {
  id: string;
  statut: string | null;
  created_at: string | null;
  input_params: { prompt?: string; title?: string; style?: string; instrumental?: boolean } | null;
  resultat: { pistes?: PisteGeneree[] } | null;
  message_erreur: string | null;
};

const CLEF = ["generations"] as const;

/**
 * Générations de l'utilisateur.
 *
 * Scrutée tant qu'une génération tourne : la fin arrive par un rappel de
 * Kie.ai vers le conteneur, pas vers l'application — sans cette scrutation
 * l'écran resterait muet jusqu'à sa réouverture.
 */
export function useGenerations(actif = true) {
  return useQuery({
    queryKey: CLEF,
    enabled: actif,
    refetchInterval: (requete) =>
      (requete.state.data ?? []).some((j) => j.statut === "queued" || j.statut === "processing")
        ? 5000
        : false,
    queryFn: async (): Promise<JobGeneration[]> => {
      const userId = await utilisateurId();
      const { data, error } = await supabase
        .from("ai_jobs")
        .select("id, statut, created_at, input_params, resultat, message_erreur")
        .eq("user_id", userId)
        .in("type", ["generation_musique", "generation_instrumental"])
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as JobGeneration[];
    },
  });
}

export function useDemanderGeneration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      prompt: string;
      customMode?: boolean;
      instrumental?: boolean;
      style?: string | null;
      titre?: string | null;
      duree?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("demander_generation", {
        p_prompt: v.prompt,
        p_custom_mode: v.customMode ?? false,
        p_instrumental: v.instrumental ?? false,
        p_style: v.style ?? undefined,
        p_titre: v.titre ?? undefined,
        p_duree: v.duree ?? undefined,
      });
      if (error) throw error;
      return data as { success: boolean; message: string; data?: Record<string, unknown> };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLEF }),
  });
}
