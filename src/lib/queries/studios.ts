import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Studio = Database["public"]["Tables"]["studios"]["Row"];

export const clefsStudios = {
  catalogue: ["studios", "catalogue"] as const,
  detail: (id: string) => ["studios", "detail", id] as const,
  services: (id: string) => ["studios", "services", id] as const,
  avis: (id: string) => ["studios", "avis", id] as const,
  conflits: (id: string, jour: string | null) => ["studios", "conflits", id, jour] as const,
  mesReservations: ["studios", "mes-reservations"] as const,
};

export type StudioService = Database["public"]["Tables"]["studio_services"]["Row"];

const LIBELLES_SERVICE: Record<string, string> = {
  repetition: "Répétition",
  enregistrement: "Enregistrement",
  production_single: "Production single",
  production_album: "Production album",
  mixage: "Mixage",
  mastering: "Mastering",
};

const LIBELLES_UNITE: Record<string, string> = {
  heure: "par heure",
  bloc_4h: "4 heures",
  titre: "par titre",
};

/** « Répétition · 4 heures ». */
export function libelleService(service: StudioService): string {
  return `${LIBELLES_SERVICE[service.type_service] ?? service.type_service} · ${LIBELLES_UNITE[service.unite] ?? service.unite}`;
}

/** Libellé court pour les cartes : « 4 h », « /h », « /titre ». */
export function libelleUniteCourt(unite: StudioService["unite"]): string {
  if (unite === "bloc_4h") return "4 h";
  if (unite === "heure") return "/h";
  return "/titre";
}

export function useServicesStudio(studioId: string) {
  return useQuery({
    queryKey: clefsStudios.services(studioId),
    queryFn: async (): Promise<StudioService[]> => {
      const { data, error } = await supabase
        .from("studio_services")
        .select("*")
        .eq("studio_id", studioId)
        .eq("actif", true)
        .order("prix", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StudioService[];
    },
    enabled: !!studioId,
  });
}

export type StudioAvecVedette = Studio & {
  serviceVedette: StudioService[] | null;
};

const SELECT_STUDIO_VEDETTE =
  "*, serviceVedette:studio_services!studio_services_studio_id_fkey(id, type_service, unite, prix, est_vedette)";

export function useCatalogueStudios() {
  return useQuery({
    queryKey: clefsStudios.catalogue,
    queryFn: async (): Promise<StudioAvecVedette[]> => {
      const { data } = await supabase
        .from("studios")
        .select(SELECT_STUDIO_VEDETTE)
        .eq("est_actif", true)
        .order("note_moyenne", { ascending: false });
      return (data ?? []) as unknown as StudioAvecVedette[];
    },
  });
}

export function useStudio(id: string) {
  return useQuery({
    queryKey: clefsStudios.detail(id),
    queryFn: async (): Promise<StudioAvecVedette | null> => {
      const { data } = await supabase
        .from("studios")
        .select(SELECT_STUDIO_VEDETTE)
        .eq("id", id)
        .maybeSingle();
      return (data ?? null) as unknown as StudioAvecVedette | null;
    },
  });
}

/** Service mis en avant d'un studio (ou null). */
export function vedetteDe(studio: StudioAvecVedette | null | undefined): StudioService | null {
  return studio?.serviceVedette?.find((s) => s.est_vedette) ?? null;
}

/** Le propriétaire met en avant l'un de ses services (un seul par studio). */
export function useMettreEnAvantService(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error: retire } = await supabase
        .from("studio_services")
        .update({ est_vedette: false })
        .eq("studio_id", studioId);
      if (retire) throw new Error("Impossible de mettre à jour la mise en avant.");
      const { error } = await supabase
        .from("studio_services")
        .update({ est_vedette: true })
        .eq("id", serviceId);
      if (error) throw new Error("Impossible de mettre à jour la mise en avant.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsStudios.services(studioId) });
      queryClient.invalidateQueries({ queryKey: clefsStudios.detail(studioId) });
      queryClient.invalidateQueries({ queryKey: clefsStudios.catalogue });
    },
  });
}

export function useAvisStudio(studioId: string) {
  return useQuery({
    queryKey: clefsStudios.avis(studioId),
    queryFn: async () => {
      const { data } = await supabase
        .from("avis_studios")
        .select("*, user:users(prenom, nom)")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as (Database["public"]["Tables"]["avis_studios"]["Row"] & {
        user: { prenom: string | null; nom: string | null } | null;
      })[];
    },
  });
}

export function useConflitsReservations(studioId: string, jour: string | null) {
  return useQuery({
    queryKey: clefsStudios.conflits(studioId, jour),
    queryFn: async () => {
      if (!jour) return [];
      const { data } = await supabase
        .from("reservations")
        .select("id, date_debut, date_fin, statut")
        .eq("studio_id", studioId)
        .in("statut", ["pending", "confirmed", "in_progress"])
        .gte("date_debut", `${jour}T00:00:00`)
        .lte("date_debut", `${jour}T23:59:59`);
      return (data ?? []) as Database["public"]["Tables"]["reservations"]["Row"][];
    },
    enabled: !!jour,
  });
}

export function useMesReservations() {
  return useQuery({
    queryKey: clefsStudios.mesReservations,
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("reservations")
        .select("*, studio:studios(nom, adresse, ville)")
        .eq("client_id", userId)
        .order("date_debut", { ascending: false });
      return (data ?? []) as unknown as (Database["public"]["Tables"]["reservations"]["Row"] & {
        studio: { nom: string; adresse: string; ville: string } | null;
      })[];
    },
  });
}

export function useCreerReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studioId,
      serviceId,
      quantite,
      dateDebut,
      dateFin,
      prixTotal,
      caution,
      nombrePersonnes,
      groupeId,
    }: {
      studioId: string;
      serviceId: string | null;
      quantite: number;
      dateDebut: string;
      dateFin: string;
      prixTotal: number;
      caution: number | null;
      nombrePersonnes: number | null;
      groupeId: string | null;
    }) => {
      const userId = await utilisateurId();

      // Paiement simulé puis réservation
      const { data: paiement } = await supabase
        .from("paiements")
        .insert({
          payeur_id: userId,
          type: "reservation_studio",
          montant_total: prixTotal,
          methode_paiement: "mobile_money",
          statut: "completed",
          metadata: { simulation: true },
        })
        .select("id")
        .single();

      const { data: reservation, error } = await supabase
        .from("reservations")
        .insert({
          studio_id: studioId,
          service_id: serviceId,
          quantite,
          client_id: userId,
          groupe_id: groupeId,
          date_debut: dateDebut,
          date_fin: dateFin,
          prix_total: prixTotal,
          caution: caution,
          nombre_personnes: nombrePersonnes,
          statut: "confirmed",
          paiement_statut: "completed",
        })
        .select("id")
        .single();

      if (error) {
        if (paiement?.id) {
          await supabase.from("paiements").delete().eq("id", paiement.id);
        }
        throw new Error("Impossible de réserver ce créneau.");
      }

      return reservation.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsStudios.mesReservations });
      queryClient.invalidateQueries({ queryKey: ["prochaines-seances"] });
    },
  });
}

export function useAnnulerReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ statut: "cancelled" })
        .eq("id", reservationId)
        .eq("statut", "pending");
      if (error) throw new Error("Impossible d'annuler la réservation.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsStudios.mesReservations }),
  });
}
