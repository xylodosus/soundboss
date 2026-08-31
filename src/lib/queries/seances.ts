import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { reponseRpc, supabase } from "@/lib/supabase";
import { clefsProjets } from "./projets";

type Seance = Database["public"]["Tables"]["seances"]["Row"];
type Presence = Database["public"]["Tables"]["seances_presences"]["Row"];

export const clefsSeances = {
  liste: (groupeId: string) => ["seances", "liste", groupeId] as const,
  detail: (id: string) => ["seances", "detail", id] as const,
  presences: (seanceId: string) => ["seances", "presences", seanceId] as const,
  setlist: (seanceId: string) => ["seances", "setlist", seanceId] as const,
  enregistrements: (seanceId: string) => ["seances", "enregistrements", seanceId] as const,
  notes: (seanceId: string) => ["seances", "notes", seanceId] as const,
  stats: (groupeId: string) => ["seances", "stats", groupeId] as const,
  ecoutes: (enregistrementId: string) => ["seances", "ecoutes", enregistrementId] as const,
};

export type SeanceAvecGroupe = Seance & {
  groupe: Pick<
    Database["public"]["Tables"]["groupes"]["Row"],
    "id" | "nom" | "chef_id" | "photo_url"
  > | null;
  projet: Pick<Database["public"]["Tables"]["projets"]["Row"], "id" | "nom" | "affiche_url"> | null;
  presences: { count: number } | null;
};

export function useSeancesGroupe(groupeId: string) {
  return useQuery({
    queryKey: clefsSeances.liste(groupeId),
    queryFn: async (): Promise<SeanceAvecGroupe[]> => {
      const { data } = await supabase
        .from("seances")
        .select("*, groupe:groupes(id, nom, chef_id), presences:seances_presences(count)")
        .eq("groupe_id", groupeId)
        .order("date_seance", { ascending: false })
        .order("heure_debut", { ascending: false });
      return (data ?? []) as unknown as SeanceAvecGroupe[];
    },
  });
}

export function useSeance(id: string) {
  return useQuery({
    queryKey: clefsSeances.detail(id),
    queryFn: async (): Promise<SeanceAvecGroupe | null> => {
      const { data } = await supabase
        .from("seances")
        .select("*, groupe:groupes(id, nom, chef_id, photo_url), projet:projets(id, nom, affiche_url)")
        .eq("id", id)
        .maybeSingle();
      return (data ?? null) as SeanceAvecGroupe | null;
    },
  });
}

export type PresenceAvecMembre = Presence & {
  membre: {
    id: string;
    user: Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "prenom" | "nom" | "avatar_url"> | null;
    role: Pick<Database["public"]["Tables"]["roles_pupitres"]["Row"], "id" | "nom" | "couleur"> | null;
  } | null;
};

export function usePresencesSeance(seanceId: string) {
  return useQuery({
    queryKey: clefsSeances.presences(seanceId),
    queryFn: async (): Promise<PresenceAvecMembre[]> => {
      const { data } = await supabase
        .from("seances_presences")
        .select(
          "id, statut, heure_arrivee, notes, seance_id, membre_id, " +
            "membre:groupe_membres(id, user:users(id, prenom, nom, avatar_url), role:roles_pupitres(id, nom, couleur))"
        )
        .eq("seance_id", seanceId);
      return (data ?? []) as unknown as PresenceAvecMembre[];
    },
  });
}

export function useMonMembreId(groupeId: string) {
  return useQuery({
    queryKey: ["membre-id", groupeId],
    queryFn: async (): Promise<string | null> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return null;
      const { data } = await supabase
        .from("groupe_membres")
        .select("id")
        .eq("groupe_id", groupeId)
        .eq("user_id", userId)
        .eq("statut", "actif")
        .maybeSingle();
      return data?.id ?? null;
    },
  });
}

/* ============================================================
 * Mutations (RPC SECURITY DEFINER)
 * ============================================================ */

export function useCreerSeance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      projetId,
      seance,
    }: {
      groupeId?: string | null;
      projetId?: string | null;
      seance: {
        titre?: string | null;
        date_seance: string;
        heure_debut: string;
        heure_fin: string;
        lieu?: string | null;
        programme?: string | null;
        presence_obligatoire: boolean;
      };
    }) => {
      const { data, error } = await supabase.rpc("creer_seance", {
        p_groupe_id: groupeId ?? undefined,
        p_titre: seance.titre ?? undefined,
        p_date_seance: seance.date_seance,
        p_heure_debut: seance.heure_debut,
        p_heure_fin: seance.heure_fin,
        p_lieu: seance.lieu ?? undefined,
        p_description: seance.programme ?? undefined,
        p_projet_id: projetId ?? undefined,
        p_presence_obligatoire: seance.presence_obligatoire,
      });
      if (error) throw new Error(error.message);
      const r = reponseRpc(data);
      return (r.data?.seance as unknown as Seance | undefined)?.id ?? null;
    },
    onSuccess: (_d, v) => {
      if (v.groupeId) {
        queryClient.invalidateQueries({ queryKey: clefsSeances.liste(v.groupeId) });
      }
      queryClient.invalidateQueries({ queryKey: ["prochaines-seances"] });
      if (v.projetId) {
        queryClient.invalidateQueries({ queryKey: clefsProjets.seances(v.projetId) });
      }
    },
  });
}

export function useMettreAJourSeance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seanceId,
      groupeId,
      modifications,
    }: {
      seanceId: string;
      groupeId?: string | null;
      modifications: Partial<Pick<Seance, "statut" | "compte_rendu">>;
    }) => {
      const { error } = await supabase.from("seances").update(modifications).eq("id", seanceId);
      if (error) throw new Error("Impossible de modifier la répétition.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsSeances.detail(v.seanceId) });
      if (v.groupeId) {
        queryClient.invalidateQueries({ queryKey: clefsSeances.liste(v.groupeId) });
      }
      queryClient.invalidateQueries({ queryKey: ["prochaines-seances"] });
    },
  });
}

/** Lie (ou délie, projetId = null) une répétition à un projet. Chef/admin du groupe uniquement. */
export function useLierProjetSeance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seanceId,
      projetId,
      ancienProjetId,
    }: {
      seanceId: string;
      projetId: string | null;
      ancienProjetId?: string | null;
    }) => {
      const { error } = await supabase
        .from("seances")
        .update({ projet_id: projetId })
        .eq("id", seanceId);
      if (error) {
        throw new Error(
          projetId
            ? "Impossible de lier la répétition au projet."
            : "Impossible de délier la répétition."
        );
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsSeances.detail(v.seanceId) });
      if (v.ancienProjetId) {
        queryClient.invalidateQueries({ queryKey: clefsProjets.seances(v.ancienProjetId) });
      }
      if (v.projetId) {
        queryClient.invalidateQueries({ queryKey: clefsProjets.seances(v.projetId) });
      }
    },
  });
}

/** RSVP : le membre répond pour lui-même. */
export function useRsvp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      groupeId: string;
      statut: Database["public"]["Enums"]["presence_statut"];
    }) => {
      const arrive = v.statut === "present" || v.statut === "retard";
      const { data, error } = await supabase.rpc("rsvp_seance", {
        p_seance_id: v.seanceId,
        p_statut: v.statut,
        p_heure_arrivee: arrive ? new Date().toTimeString().slice(0, 8) : undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsSeances.presences(v.seanceId) });
      queryClient.invalidateQueries({ queryKey: clefsSeances.liste(v.groupeId) });
    },
  });
}

/** Le chef/admin saisit le statut d'un membre. */
export function useMettreAJourPresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      groupeId: string;
      membreId: string;
      statut: Database["public"]["Enums"]["presence_statut"];
    }) => {
      const { data: presence } = await supabase
        .from("seances_presences")
        .select("id")
        .eq("seance_id", v.seanceId)
        .eq("membre_id", v.membreId)
        .maybeSingle();

      const presenceId =
        presence?.id ??
        (
          await supabase
            .from("seances_presences")
            .insert({ seance_id: v.seanceId, membre_id: v.membreId, statut: "en_attente" })
            .select("id")
            .single()
        ).data?.id;

      if (!presenceId) throw new Error("Impossible de trouver la présence.");

      const { data, error } = await supabase.rpc("maj_presence", {
        p_presence_id: presenceId,
        p_statut: v.statut,
        p_heure_arrivee:
          v.statut === "present" || v.statut === "retard"
            ? new Date().toTimeString().slice(0, 8)
            : undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsSeances.presences(v.seanceId) });
      queryClient.invalidateQueries({ queryKey: clefsSeances.liste(v.groupeId) });
    },
  });
}

/* ============================================================
 * Setlist, enregistrements, notes, stats
 * ============================================================ */

export function useSetlistSeance(seanceId: string) {
  return useQuery({
    queryKey: clefsSeances.setlist(seanceId),
    queryFn: async () => {
      const { data } = await supabase
        .from("seance_setlist")
        .select("*, repertoire:repertoire(id, titre_morceau, tonalite, tempo)")
        .eq("seance_id", seanceId)
        .order("ordre");
      return (data ?? []) as unknown as (Database["public"]["Tables"]["seance_setlist"]["Row"] & {
        repertoire: { id: string; titre_morceau: string; tonalite: string | null; tempo: number | null } | null;
      })[];
    },
  });
}

export function useAjouterMorceauSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      titre: string;
      dureeMinutes?: number | null;
      tonalite?: string | null;
      tempo?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("ajouter_morceau_setlist", {
        p_seance_id: v.seanceId,
        p_titre: v.titre,
        p_duree_minutes: v.dureeMinutes ?? undefined,
        p_tonalite: v.tonalite ?? undefined,
        p_tempo: v.tempo ?? undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsSeances.setlist(v.seanceId) }),
  });
}

export function useSupprimerMorceauSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seanceId, itemId }: { seanceId: string; itemId: string }) => {
      const { error } = await supabase.from("seance_setlist").delete().eq("id", itemId);
      if (error) throw new Error("Impossible de supprimer le morceau du programme.");
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsSeances.setlist(v.seanceId) }),
  });
}

export function useEnregistrementsSeance(seanceId: string) {
  return useQuery({
    queryKey: clefsSeances.enregistrements(seanceId),
    queryFn: async () => {
      const { data } = await supabase
        .from("seance_enregistrements")
        .select("*, uploader:users(id, prenom, nom)")
        .eq("seance_id", seanceId)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as (Database["public"]["Tables"]["seance_enregistrements"]["Row"] & {
        uploader: { id: string; prenom: string | null; nom: string | null } | null;
      })[];
    },
  });
}

export function useAjouterEnregistrement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      url: string;
      titre?: string | null;
      // Sans durée, le seuil des 30 % est incalculable et l'écoute ne peut
      // jamais être comptabilisée : elle doit être fournie au dépôt.
      dureeSecondes?: number | null;
      /** Vide = audio destiné à tout le groupe. */
      pupitreIds?: string[];
    }) => {
      const { data, error } = await supabase.rpc("ajouter_enregistrement_seance", {
        p_seance_id: v.seanceId,
        p_url: v.url,
        p_titre: v.titre ?? undefined,
        p_duree_secondes: v.dureeSecondes ?? undefined,
        p_pupitre_ids: v.pupitreIds?.length ? v.pupitreIds : undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) =>
      queryClient.invalidateQueries({ queryKey: clefsSeances.enregistrements(v.seanceId) }),
  });
}

/** Pousse le cumul d'écoute. La RPC garde la valeur maximale. */
export function useEnregistrerEcoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { enregistrementId: string; secondes: number }) => {
      const { data, error } = await supabase.rpc("enregistrer_ecoute", {
        p_enregistrement_id: v.enregistrementId,
        p_secondes: v.secondes,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) =>
      queryClient.invalidateQueries({ queryKey: clefsSeances.ecoutes(v.enregistrementId) }),
  });
}

/**
 * Comptabilise une écoute : appelée quand une session de lecture franchit 30 %
 * de la durée. Distincte d'useEnregistrerEcoute, qui accumule les secondes.
 */
export function useValiderEcoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enregistrementId: string) => {
      const { data, error } = await supabase.rpc("valider_ecoute", {
        p_enregistrement_id: enregistrementId,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, enregistrementId) =>
      queryClient.invalidateQueries({ queryKey: clefsSeances.ecoutes(enregistrementId) }),
  });
}

/**
 * Qui a écouté cet audio. La RLS filtre déjà : un simple membre ne reçoit que
 * sa propre ligne, seul le chef ou un admin voit tout le groupe. Le drapeau
 * `actif` évite simplement une requête inutile côté membre.
 */
export function useEcoutesEnregistrement(enregistrementId: string, actif: boolean) {
  return useQuery({
    queryKey: clefsSeances.ecoutes(enregistrementId),
    enabled: actif && !!enregistrementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seance_ecoutes")
        .select("id, ecoutee, nombre_ecoutes, secondes_ecoutees, ecoutee_at, auditeur:users(id, prenom, nom, avatar_url)")
        .eq("enregistrement_id", enregistrementId)
        .eq("ecoutee", true)
        .order("nombre_ecoutes", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as {
        id: string;
        ecoutee: boolean;
        nombre_ecoutes: number;
        secondes_ecoutees: number;
        ecoutee_at: string | null;
        auditeur: {
          id: string;
          prenom: string | null;
          nom: string | null;
          avatar_url: string | null;
        } | null;
      }[];
    },
  });
}

export function useSupprimerEnregistrement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seanceId, id }: { seanceId: string; id: string }) => {
      const { data, error } = await supabase.rpc("supprimer_enregistrement_seance", {
        p_enregistrement_id: id,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) =>
      queryClient.invalidateQueries({ queryKey: clefsSeances.enregistrements(v.seanceId) }),
  });
}

export function useNotesSeance(seanceId: string) {
  return useQuery({
    queryKey: clefsSeances.notes(seanceId),
    queryFn: async () => {
      const { data } = await supabase
        .from("seance_notes")
        .select("*, user:users(id, prenom, nom, avatar_url)")
        .eq("seance_id", seanceId)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as (Database["public"]["Tables"]["seance_notes"]["Row"] & {
        user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
      })[];
    },
  });
}

export function useAjouterNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      type: Database["public"]["Enums"]["note_type"];
      contenu?: string | null;
      audioUrl?: string | null;
      timestampSecondes?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("ajouter_note_seance", {
        p_seance_id: v.seanceId,
        p_type: v.type,
        p_contenu: v.contenu ?? undefined,
        p_audio_url: v.audioUrl ?? undefined,
        p_timestamp_secondes: v.timestampSecondes ?? undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsSeances.notes(v.seanceId) }),
  });
}

export function useSupprimerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seanceId, noteId }: { seanceId: string; noteId: string }) => {
      const { data, error } = await supabase.rpc("supprimer_note_seance", { p_note_id: noteId });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: clefsSeances.notes(v.seanceId) }),
  });
}

export type StatsPresences = {
  groupe_id: string;
  totaux: {
    seances: number;
    presents: number;
    absents: number;
    retards: number;
    excuses: number;
    en_attente: number;
    taux_presence: number | null;
  };
  evolution: {
    mois: string;
    seances: number;
    presents: number;
    absents: number;
    retards: number;
    excuses: number;
    taux_presence: number | null;
  }[];
};

export function useStatistiquesPresences(groupeId: string) {
  return useQuery({
    queryKey: clefsSeances.stats(groupeId),
    queryFn: async (): Promise<StatsPresences | null> => {
      const { data, error } = await supabase.rpc("statistiques_presences_groupe", {
        p_groupe_id: groupeId,
      });
      if (error || !data) return null;
      const r = data as { success: boolean; data: StatsPresences | null };
      return r.success ? r.data : null;
    },
    enabled: !!groupeId,
  });
}

export type StatsPresencesMembre = {
  membre_id: string;
  totaux: {
    seances: number;
    presents: number;
    absents: number;
    retards: number;
    excuses: number;
    en_attente: number;
    taux_assiduite: number | null;
  };
  evolution: {
    mois: string;
    seances: number;
    present: number;
    absent: number;
    retard: number;
    excuse: number;
  }[];
};

export function useStatistiquesPresencesMembre(membreId: string, actif: boolean) {
  return useQuery({
    queryKey: ["seances", "stats-membre", membreId],
    queryFn: async (): Promise<StatsPresencesMembre | null> => {
      const { data, error } = await supabase.rpc("statistiques_presences_membre", {
        p_membre_id: membreId,
      });
      if (error || !data) return null;
      const r = data as { success: boolean; data: StatsPresencesMembre | null };
      return r.success ? r.data : null;
    },
    enabled: actif && !!membreId,
  });
}
