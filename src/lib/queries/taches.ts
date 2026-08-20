import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Tache = Database["public"]["Tables"]["taches"]["Row"];
export type StatutTache = Database["public"]["Enums"]["tache_statut"];
export type PrioriteTache = Database["public"]["Enums"]["priorite"];
export type AssignationType = Database["public"]["Enums"]["assignation_type"];

export const clefsTaches = {
  liste: (projetId: string) => ["taches", "liste", projetId] as const,
};

export type TacheAvecAssignations = Tache & {
  membre: {
    id: string;
    user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  } | null;
  pupitre: { id: string; nom: string | null; couleur: string | null } | null;
};

export function useTachesProjet(projetId: string) {
  return useQuery({
    queryKey: clefsTaches.liste(projetId),
    queryFn: async (): Promise<TacheAvecAssignations[]> => {
      const { data } = await supabase
        .from("taches")
        .select(
          "*, membre:groupe_membres(id, user:users(id, prenom, nom, avatar_url)), pupitre:roles_pupitres(id, nom, couleur)"
        )
        .eq("projet_id", projetId)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as TacheAvecAssignations[];
    },
    enabled: !!projetId,
  });
}

export type DonneesTache = {
  titre: string;
  description?: string | null;
  assignationType: AssignationType;
  assignationMembreId?: string | null;
  assignationRoleId?: string | null;
  priorite: PrioriteTache;
  dateEcheance?: string | null;
};

export function useCreerTache(projetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: DonneesTache) => {
      const userId = await utilisateurId();
      const { error } = await supabase.from("taches").insert({
        projet_id: projetId,
        titre: v.titre,
        description: v.description ?? null,
        assignation_type: v.assignationType,
        assignation_membre_id: v.assignationMembreId ?? null,
        assignation_role_id: v.assignationRoleId ?? null,
        priorite: v.priorite,
        date_echeance: v.dateEcheance ?? null,
        creee_par: userId,
        statut: "todo",
      });
      if (error) throw new Error("Impossible de créer la tâche.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsTaches.liste(projetId) }),
  });
}

export function useModifierTache(projetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tacheId,
      tache,
    }: {
      tacheId: string;
      tache: DonneesTache;
    }) => {
      const { error } = await supabase
        .from("taches")
        .update({
          titre: tache.titre,
          description: tache.description ?? null,
          assignation_type: tache.assignationType,
          assignation_membre_id: tache.assignationMembreId ?? null,
          assignation_role_id: tache.assignationRoleId ?? null,
          priorite: tache.priorite,
          date_echeance: tache.dateEcheance ?? null,
        })
        .eq("id", tacheId);
      if (error) throw new Error("Impossible de modifier la tâche.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsTaches.liste(projetId) }),
  });
}

/** Change le statut d'une tâche (todo / en_cours / terminee / annulee). */
export function useChangerStatutTache(projetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tacheId,
      statut,
    }: {
      tacheId: string;
      statut: StatutTache;
    }) => {
      const userId = await utilisateurId();
      const modifications: Partial<Database["public"]["Tables"]["taches"]["Update"]> = {
        statut,
        date_completion: statut === "terminee" ? new Date().toISOString() : null,
        completee_par: statut === "terminee" ? userId : null,
      };
      const { error } = await supabase
        .from("taches")
        .update(modifications)
        .eq("id", tacheId);
      if (error) throw new Error("Impossible de mettre à jour la tâche.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsTaches.liste(projetId) }),
  });
}

export function useSupprimerTache(projetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tacheId: string) => {
      const { error } = await supabase.from("taches").delete().eq("id", tacheId);
      if (error) throw new Error("Impossible de supprimer la tâche.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsTaches.liste(projetId) }),
  });
}
