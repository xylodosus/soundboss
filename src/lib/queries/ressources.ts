import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Ressource = Database["public"]["Tables"]["ressources"]["Row"];

export const clefsRessources = {
  liste: (groupeId: string) => ["ressources", groupeId] as const,
};

export type RessourceAvecJointures = Ressource & {
  uploader: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  pupitre: { id: string; nom: string; couleur: string | null } | null;
  membreCible: {
    id: string;
    user: { id: string; prenom: string | null; nom: string | null } | null;
  } | null;
};

export function useRessources(groupeId: string, estGestionnaire: boolean) {
  return useQuery({
    queryKey: clefsRessources.liste(groupeId),
    queryFn: async (): Promise<RessourceAvecJointures[]> => {
      const userId = await utilisateurId();

      const { data: moi } = await supabase
        .from("groupe_membres")
        .select("id, role_id")
        .eq("groupe_id", groupeId)
        .eq("user_id", userId)
        .eq("statut", "actif")
        .maybeSingle();

      const conditions: string[] = [`partage_groupe_id.eq.${groupeId}`];

      if (estGestionnaire) {
        // Le chef/admin voit aussi les fichiers partagés à n'importe quel pupitre ou membre du groupe.
        const [{ data: roles }, { data: membresGroupe }] = await Promise.all([
          supabase.from("roles_pupitres").select("id").eq("groupe_id", groupeId),
          supabase.from("groupe_membres").select("id").eq("groupe_id", groupeId),
        ]);
        if (roles && roles.length > 0) {
          conditions.push(`partage_role_id.in.(${roles.map((r) => r.id).join(",")})`);
        }
        if (membresGroupe && membresGroupe.length > 0) {
          conditions.push(`partage_membre_id.in.(${membresGroupe.map((m) => m.id).join(",")})`);
        }
      } else {
        if (moi?.role_id) {
          conditions.push(`partage_role_id.eq.${moi.role_id}`);
        }
        if (moi) {
          conditions.push(`partage_membre_id.eq.${moi.id}`);
        }
      }

      const { data, error } = await supabase
        .from("ressources")
        .select(
          "*, uploader:users!ressources_uploaded_by_fkey(id, prenom, nom, avatar_url), pupitre:roles_pupitres(id, nom, couleur), membreCible:groupe_membres(id, user:users(id, prenom, nom))"
        )
        .or(conditions.join(","))
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []) as unknown as RessourceAvecJointures[];
    },
  });
}

export function useAjouterRessource(groupeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nom,
      type,
      url,
      format,
      tailleBytes,
      partageType,
      partageGroupeId,
      partageRoleId,
      partageMembreId,
      visibilite,
      dureeSecondes,
    }: {
      nom: string;
      type: Ressource["type"];
      url: string;
      format?: string | null;
      tailleBytes?: number | null;
      dureeSecondes?: number | null;
      partageType: Ressource["partage_type"];
      partageGroupeId?: string | null;
      partageRoleId?: string | null;
      partageMembreId?: string | null;
      visibilite?: Database["public"]["Enums"]["ressource_visibilite"];
    }) => {
      const userId = await utilisateurId();
      const { data, error } = await supabase
        .from("ressources")
        .insert({
          nom,
          description: null,
          type,
          url,
          format: format ?? null,
          taille_bytes: tailleBytes ?? null,
          duree_secondes: dureeSecondes ?? null,
          partage_type: partageType,
          partage_groupe_id: partageType === "groupe" ? partageGroupeId : null,
          partage_role_id: partageType === "role" ? partageRoleId : null,
          partage_membre_id: partageType === "membre" ? partageMembreId : null,
          visibilite: visibilite ?? "publique",
          uploaded_by: userId,
        })
        .select(
          "*, uploader:users!ressources_uploaded_by_fkey(id, prenom, nom, avatar_url), pupitre:roles_pupitres(id, nom, couleur), membreCible:groupe_membres(id, user:users(id, prenom, nom))"
        )
        .single();
      if (error) throw new Error(error.message ?? "Impossible d'ajouter le fichier.");
      return (data ?? null) as unknown as RessourceAvecJointures | null;
    },
    onSuccess: (nouvelle) => {
      if (nouvelle) {
        queryClient.setQueryData<RessourceAvecJointures[]>(
          clefsRessources.liste(groupeId),
          (anciens) => [nouvelle, ...(anciens ?? [])]
        );
      }
      queryClient.invalidateQueries({ queryKey: clefsRessources.liste(groupeId) });
    },
  });
}

export function useSupprimerRessource(groupeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ressourceId: string) => {
      const { error } = await supabase.from("ressources").delete().eq("id", ressourceId);
      if (error) throw new Error("Impossible de supprimer le fichier.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsRessources.liste(groupeId) }),
  });
}
