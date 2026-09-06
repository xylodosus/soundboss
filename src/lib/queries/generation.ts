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
  user_id: string | null;
  groupe_id: string | null;
  lu_at: string | null;
  input_params: {
    prompt?: string;
    title?: string;
    style?: string;
    instrumental?: boolean;
    sourceUrl?: string;
  } | null;
  resultat: { pistes?: PisteGeneree[] } | null;
  message_erreur: string | null;
};

const CLEF = (groupeId?: string | null) => ["generations", groupeId ?? "perso"] as const;

/**
 * Générations de l'utilisateur.
 *
 * Scrutée tant qu'une génération tourne : la fin arrive par un rappel de
 * Kie.ai vers le conteneur, pas vers l'application — sans cette scrutation
 * l'écran resterait muet jusqu'à sa réouverture.
 */
export function useGenerations(groupeId?: string | null, actif = true) {
  return useQuery({
    queryKey: CLEF(groupeId),
    enabled: actif,
    refetchInterval: (requete) =>
      (requete.state.data ?? []).some((j) => j.statut === "queued" || j.statut === "processing")
        ? 5000
        : false,
    queryFn: async (): Promise<JobGeneration[]> => {
      const colonnes =
        "id, statut, created_at, user_id, groupe_id, lu_at, input_params, resultat, message_erreur";
      let requete = supabase
        .from("ai_jobs")
        .select(colonnes)
        .in("type", ["generation_musique", "generation_instrumental"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (groupeId) {
        // Une génération de groupe appartient au groupe : la RLS laisse passer
        // celles de tous ses membres, pas seulement les siennes.
        requete = requete.eq("groupe_id", groupeId);
      } else {
        // Espace perso : ses propres générations, hors groupe.
        requete = requete.eq("user_id", await utilisateurId()).is("groupe_id", null);
      }

      const { data, error } = await requete;
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
      groupeId?: string | null;
      /** Clé R2 de l'audio à reprendre. Absente, c'est une création. */
      sourceUrl?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("demander_generation", {
        p_prompt: v.prompt,
        p_custom_mode: v.customMode ?? false,
        p_instrumental: v.instrumental ?? false,
        p_style: v.style ?? undefined,
        p_titre: v.titre ?? undefined,
        p_duree: v.duree ?? undefined,
        p_groupe_id: v.groupeId ?? undefined,
        p_source_url: v.sourceUrl ?? undefined,
      });
      if (error) throw error;
      return data as { success: boolean; message: string; data?: Record<string, unknown> };
    },
    onSuccess: (_r, v) => client.invalidateQueries({ queryKey: CLEF(v.groupeId) }),
  });
}

/** Retire la pastille « non lu » d'une génération, pour son demandeur seul. */
export function useMarquerGenerationLue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.rpc("marquer_generation_lue", { p_job_id: jobId });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["generations"] }),
  });
}
