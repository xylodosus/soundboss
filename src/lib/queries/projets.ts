import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { reponseRpc, supabase, utilisateurId } from "@/lib/supabase";

type Projet = Database["public"]["Tables"]["projets"]["Row"];

export const clefsProjets = {
  listeGroupe: (groupeId: string) => ["projets", "groupe", groupeId] as const,
  listePerso: ["projets", "perso"] as const,
  detail: (id: string) => ["projets", "detail", id] as const,
  morceaux: (projetId: string) => ["projets", "morceaux", projetId] as const,
  seances: (projetId: string) => ["projets", "seances", projetId] as const,
  droits: (projetId: string) => ["projets", "droits", projetId] as const,
};

export type ProjetAvecMorceaux = Projet & { morceaux: { count: number } | null };

function useProjetsBase(key: readonly unknown[], filtre: Record<string, string>) {
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<ProjetAvecMorceaux[]> => {
      let requete = supabase.from("projets").select("*, morceaux:repertoire(count)");
      for (const [colonne, valeur] of Object.entries(filtre)) {
        requete = requete.eq(colonne, valeur as never);
      }
      const { data } = await requete.order("created_at", { ascending: false });
      return (data ?? []) as unknown as ProjetAvecMorceaux[];
    },
  });
}

export function useProjetsGroupe(groupeId: string) {
  return useProjetsBase(clefsProjets.listeGroupe(groupeId), { groupe_id: groupeId });
}

export function useProjetsPersonnels() {
  return useQuery({
    queryKey: clefsProjets.listePerso,
    queryFn: async (): Promise<ProjetAvecMorceaux[]> => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("projets")
        .select("*, morceaux:repertoire(count)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ProjetAvecMorceaux[];
    },
  });
}

export function useProjet(id: string) {
  return useQuery({
    queryKey: clefsProjets.detail(id),
    queryFn: async (): Promise<Projet | null> => {
      const { data } = await supabase.from("projets").select("*").eq("id", id).maybeSingle();
      return (data ?? null) as Projet | null;
    },
  });
}

export function useDroitsProjet(projetId: string) {
  return useQuery({
    queryKey: clefsProjets.droits(projetId),
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase.rpc("est_chef_ou_admin_du_projet", {
        p_projet_id: projetId,
      });
      return data ?? false;
    },
    enabled: !!projetId,
  });
}

export function useMorceauxProjet(projetId: string) {
  return useQuery({
    queryKey: clefsProjets.morceaux(projetId),
    queryFn: async () => {
      const { data } = await supabase
        .from("repertoire")
        .select("*")
        .eq("projet_id", projetId)
        .order("ordre_setlist", { ascending: true, nullsFirst: false })
        .order("created_at");
      return (data ?? []) as Database["public"]["Tables"]["repertoire"]["Row"][];
    },
  });
}

export function useSeancesProjet(projetId: string) {
  return useQuery({
    queryKey: clefsProjets.seances(projetId),
    queryFn: async () => {
      const { data } = await supabase
        .from("seances")
        .select("*")
        .eq("projet_id", projetId)
        .order("date_seance", { ascending: false });
      return (data ?? []) as Database["public"]["Tables"]["seances"]["Row"][];
    },
  });
}

/* ============================================================
 * Mutations (RPC)
 * ============================================================ */

export function useCreerProjet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projet,
      groupeId,
    }: {
      projet: {
        nom: string;
        categorie: Database["public"]["Enums"]["projet_categorie"];
        type_evenement?: Database["public"]["Enums"]["type_evenement"] | null;
        type_production?: Database["public"]["Enums"]["type_production"] | null;
        description?: string | null;
        date_debut?: string | null;
        date_fin?: string | null;
        date_realisation?: string | null;
        lieu_evenement?: string | null;
      };
      groupeId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("creer_projet", {
        p_nom: projet.nom,
        p_categorie: projet.categorie,
        p_type_evenement: projet.type_evenement ?? undefined,
        p_type_production: projet.type_production ?? undefined,
        p_description: projet.description ?? undefined,
        p_date_debut: projet.date_debut ?? undefined,
        p_date_fin: projet.date_fin ?? undefined,
        p_date_realisation: projet.date_realisation ?? undefined,
        p_lieu_evenement: projet.lieu_evenement ?? undefined,
        p_groupe_id: groupeId ?? undefined,
      });
      if (error) throw new Error(error.message);
      return reponseRpc(data).data?.projet as unknown as Projet | null;
    },
    onSuccess: (_d, v) => {
      if (v.groupeId) {
        queryClient.invalidateQueries({ queryKey: clefsProjets.listeGroupe(v.groupeId) });
      } else {
        queryClient.invalidateQueries({ queryKey: clefsProjets.listePerso });
      }
    },
  });
}

export function useModifierProjet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projetId, projet }: { projetId: string; projet: Partial<Projet> }) => {
      const { data, error } = await supabase.rpc("modifier_projet", {
        p_projet_id: projetId,
        p_nom: projet.nom ?? undefined,
        p_categorie: projet.categorie ?? undefined,
        p_type_evenement: projet.type_evenement ?? undefined,
        p_type_production: projet.type_production ?? undefined,
        p_description: projet.description ?? undefined,
        p_date_debut: projet.date_debut ?? undefined,
        p_date_fin: projet.date_fin ?? undefined,
        p_date_realisation: projet.date_realisation ?? undefined,
        p_lieu_evenement: projet.lieu_evenement ?? undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsProjets.detail(v.projetId) }),
  });
}

export function useSupprimerProjet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projetId, groupeId }: { projetId: string; groupeId?: string | null }) => {
      const { data, error } = await supabase.rpc("supprimer_projet", { p_projet_id: projetId });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => {
      queryClient.removeQueries({ queryKey: clefsProjets.detail(v.projetId) });
      if (v.groupeId) {
        queryClient.invalidateQueries({ queryKey: clefsProjets.listeGroupe(v.groupeId) });
      } else {
        queryClient.invalidateQueries({ queryKey: clefsProjets.listePerso });
      }
    },
  });
}

export function useAjouterMorceau() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projetId,
      titre,
      tonalite,
      tempo,
    }: {
      projetId: string;
      titre: string;
      tonalite?: string | null;
      tempo?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("ajouter_morceau_projet", {
        p_projet_id: projetId,
        p_titre_morceau: titre,
        p_tonalite: tonalite ?? undefined,
        p_tempo: tempo ?? undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsProjets.morceaux(v.projetId) });
      queryClient.invalidateQueries({ queryKey: clefsProjets.detail(v.projetId) });
    },
  });
}

export function useMajAvancement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projetId,
      morceauId,
      avancement,
    }: {
      projetId: string;
      morceauId: string;
      avancement: number;
    }) => {
      const { data, error } = await supabase.rpc("maj_avancement_morceau", {
        p_morceau_id: morceauId,
        p_avancement: avancement,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => {
      queryClient.setQueryData<Database["public"]["Tables"]["repertoire"]["Row"][]>(
        clefsProjets.morceaux(v.projetId),
        (anciens) =>
          anciens?.map((m) =>
            m.id === v.morceauId ? { ...m, avancement: v.avancement } : m
          )
      );
      queryClient.invalidateQueries({ queryKey: clefsProjets.morceaux(v.projetId) });
    },
  });
}

export function useSupprimerMorceau() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ morceauId, projetId }: { morceauId: string; projetId: string }) => {
      const { error } = await supabase.from("repertoire").delete().eq("id", morceauId);
      if (error) throw new Error("Impossible de supprimer le morceau.");
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsProjets.morceaux(v.projetId) }),
  });
}
