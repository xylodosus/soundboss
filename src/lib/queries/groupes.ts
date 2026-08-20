import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { reponseRpc, supabase, utilisateurId } from "@/lib/supabase";

type Groupe = Database["public"]["Tables"]["groupes"]["Row"];
type Membre = Database["public"]["Tables"]["groupe_membres"]["Row"];
type Pupitre = Database["public"]["Tables"]["roles_pupitres"]["Row"];

export const clefsGroupes = {
  liste: ["groupes", "liste"] as const,
  detail: (id: string) => ["groupes", "detail", id] as const,
  membres: (id: string) => ["groupes", "membres", id] as const,
  pupitres: (id: string) => ["groupes", "pupitres", id] as const,
  invitations: (id: string) => ["groupes", "invitations", id] as const,
};

type InvitationGroupe = Database["public"]["Tables"]["invitations_groupe"]["Row"];

export function useInvitationsGroupe(groupeId: string, actif: boolean) {
  return useQuery({
    queryKey: clefsGroupes.invitations(groupeId),
    queryFn: async (): Promise<InvitationGroupe[]> => {
      const { data, error } = await supabase
        .from("invitations_groupe")
        .select("*")
        .eq("groupe_id", groupeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvitationGroupe[];
    },
    enabled: actif && !!groupeId,
  });
}

/** Génère un code d'invitation (48 h) ; le code n'est retourné qu'une fois. */
export function useGenererInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupeId: string) => {
      const { data, error } = await supabase.rpc("generer_code_invitation", {
        p_groupe_id: groupeId,
      });
      if (error) throw new Error("Impossible de générer le code.");
      const r = reponseRpc(data);
      return r.data as { invitation_id: string; code: string; expire_at: string } | null;
    },
    onSuccess: (_d, groupeId) => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.invitations(groupeId) });
    },
  });
}

export function useRetirerInvitation(groupeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc("retirer_invitation", {
        p_invitation_id: invitationId,
      });
      if (error) throw new Error("Impossible de révoquer l'invitation.");
      reponseRpc(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsGroupes.invitations(groupeId) }),
  });
}

export type ResultatRejoindre = { groupe_id: string; groupe_nom: string };

/** Rejoint un groupe via un code d'invitation (6 chiffres, 48 h). */
export function useRejoindreParCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("rejoindre_par_code", { p_code: code });
      if (error) throw new Error("Impossible de rejoindre le groupe.");
      const r = reponseRpc(data);
      if (!r.success) throw new Error(r.message ?? "Code invalide.");
      return r.data as ResultatRejoindre;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsGroupes.liste }),
  });
}

export type GroupeAvecRole = Groupe & {
  monRole: "chef" | "admin" | "membre" | "invite";
};

export function useMesGroupes() {
  return useQuery({
    queryKey: clefsGroupes.liste,
    queryFn: async (): Promise<GroupeAvecRole[]> => {
      const userId = await utilisateurId();

      const { data: membreships } = await supabase
        .from("groupe_membres")
        .select("groupe:groupes(*), est_admin")
        .eq("user_id", userId)
        .eq("statut", "actif");

      const { data: groupesChef } = await supabase
        .from("groupes")
        .select("*")
        .eq("chef_id", userId);

      const parId = new Map<string, GroupeAvecRole>();
      for (const m of membreships ?? []) {
        if (!m.groupe) continue;
        parId.set(m.groupe.id, {
          ...m.groupe,
          monRole: m.groupe.chef_id === userId ? "chef" : m.est_admin ? "admin" : "membre",
        });
      }
      for (const g of groupesChef ?? []) {
        if (!parId.has(g.id)) parId.set(g.id, { ...g, monRole: "chef" });
      }

      return [...parId.values()].sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? "")
      );
    },
  });
}

export function useGroupe(id: string) {
  return useQuery({
    queryKey: clefsGroupes.detail(id),
    queryFn: async (): Promise<GroupeAvecRole | null> => {
      const userId = await utilisateurId();
      const { data: groupe } = await supabase
        .from("groupes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!groupe) return null;

      const { data: moi } = await supabase
        .from("groupe_membres")
        .select("est_admin")
        .eq("groupe_id", id)
        .eq("user_id", userId)
        .eq("statut", "actif")
        .maybeSingle();

      const monRole: GroupeAvecRole["monRole"] =
        groupe.chef_id === userId ? "chef" : moi?.est_admin ? "admin" : moi ? "membre" : "invite";
      return { ...groupe, monRole };
    },
  });
}

export function useMembresGroupe(id: string) {
  return useQuery({
    queryKey: clefsGroupes.membres(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("groupe_membres")
        .select(
          "*, user:users(id, prenom, nom, avatar_url), role:roles_pupitres(id, nom, couleur, ordre)"
        )
        .eq("groupe_id", id)
        .order("date_adhesion");
      return (data ?? []) as unknown as (Membre & {
        user: {
          id: string;
          prenom: string | null;
          nom: string | null;
          avatar_url: string | null;
        } | null;
        role: Pupitre | null;
      })[];
    },
  });
}

export function usePupitresGroupe(id: string) {
  return useQuery({
    queryKey: clefsGroupes.pupitres(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("roles_pupitres")
        .select("*")
        .eq("groupe_id", id)
        .order("ordre");
      return (data ?? []) as Pupitre[];
    },
  });
}

/* ============================================================
 * Mutations
 * ============================================================ */

export function useCreerGroupe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupe: {
      nom: string;
      type_groupe: Groupe["type_groupe"];
      genre_musical?: string | null;
      ville?: string | null;
      description?: string | null;
      photo_url?: string | null;
      est_prive: boolean;
    }) => {
      const userId = await utilisateurId();
      const { data: cree, error } = await supabase
        .from("groupes")
        .insert({ ...groupe, chef_id: userId })
        .select("id")
        .single();
      if (error) throw new Error("Impossible de créer le groupe.");
      const { error: erreurMembre } = await supabase
        .from("groupe_membres")
        .insert({ groupe_id: cree.id, user_id: userId, statut: "actif" });
      if (erreurMembre) throw new Error("Groupe créé mais impossible de t'y ajouter.");
      return cree.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.liste });
    },
  });
}

export function useModifierGroupe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      modifications,
    }: {
      groupeId: string;
      modifications: Partial<
        Pick<Groupe, "nom" | "type_groupe" | "genre_musical" | "ville" | "description" | "photo_url" | "est_prive" | "accepte_nouveaux_membres">
      >;
    }) => {
      const { error } = await supabase.from("groupes").update(modifications).eq("id", groupeId);
      if (error) throw new Error("Impossible de modifier le groupe.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.detail(v.groupeId) });
      queryClient.invalidateQueries({ queryKey: clefsGroupes.liste });
    },
  });
}

export function useRejoindreGroupe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupeId }: { groupeId: string }) => {
      const userId = await utilisateurId();
      const { error } = await supabase
        .from("groupe_membres")
        .insert({ groupe_id: groupeId, user_id: userId, statut: "actif" });
      if (error) throw new Error("Impossible de rejoindre le groupe.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsGroupes.liste }),
  });
}

export function useMettreAJourMembre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membreId,
      groupeId,
      modifications,
    }: {
      membreId: string;
      groupeId: string;
      modifications: Partial<Pick<Membre, "role_id" | "statut" | "notes_chef">>;
    }) => {
      const { error } = await supabase
        .from("groupe_membres")
        .update(modifications)
        .eq("id", membreId);
      if (error) throw new Error("Impossible de modifier le membre.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.membres(v.groupeId) });
    },
  });
}

/** Nommer/révoquer un admin (RPC : chef uniquement). */
export function useNommerAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ membreId, estAdmin }: { membreId: string; estAdmin: boolean }) => {
      const { data, error } = await supabase.rpc("nommer_admin", {
        p_membre_id: membreId,
        p_est_admin: estAdmin,
      });
      if (error) throw new Error(error.message);
      const r = data as { success: boolean; message: string };
      if (!r.success) throw new Error(r.message);
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.membres(v.membreId) });
      queryClient.invalidateQueries({ queryKey: clefsGroupes.liste });
    },
  });
}

export function useAjouterPupitre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      nom,
      couleur,
    }: {
      groupeId: string;
      nom: string;
      couleur?: string | null;
    }) => {
      const { data: pupitres } = await supabase
        .from("roles_pupitres")
        .select("ordre")
        .eq("groupe_id", groupeId)
        .order("ordre", { ascending: false })
        .limit(1);
      const { error } = await supabase.from("roles_pupitres").insert({
        groupe_id: groupeId,
        nom,
        couleur: couleur ?? null,
        ordre: (pupitres?.[0]?.ordre ?? 0) + 1,
      });
      if (error) throw new Error("Impossible d'ajouter le pupitre.");
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsGroupes.pupitres(v.groupeId) }),
  });
}

export function useModifierPupitre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      pupitreId,
      modifications,
    }: {
      groupeId: string;
      pupitreId: string;
      modifications: Partial<Pick<Pupitre, "nom" | "couleur" | "ordre">>;
    }) => {
      const { error } = await supabase
        .from("roles_pupitres")
        .update(modifications)
        .eq("id", pupitreId);
      if (error) throw new Error("Impossible de modifier le pupitre.");
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsGroupes.pupitres(v.groupeId) }),
  });
}

export function useSupprimerPupitre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupeId, pupitreId }: { groupeId: string; pupitreId: string }) => {
      const { error } = await supabase.from("roles_pupitres").delete().eq("id", pupitreId);
      if (error) throw new Error("Impossible de supprimer le pupitre.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsGroupes.pupitres(v.groupeId) });
      queryClient.invalidateQueries({ queryKey: clefsGroupes.membres(v.groupeId) });
    },
  });
}
