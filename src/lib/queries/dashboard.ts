import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

export function useProchainesSeances() {
  return useQuery({
    queryKey: ["prochaines-seances"],
    queryFn: async () => {
      const userId = await utilisateurId();

      const { data: membreships } = await supabase
        .from("groupe_membres")
        .select("groupe_id")
        .eq("user_id", userId)
        .eq("statut", "actif");

      const { data: groupesChef } = await supabase
        .from("groupes")
        .select("id")
        .eq("chef_id", userId);

      const groupeIds = [
        ...new Set([
          ...(membreships ?? []).map((m) => m.groupe_id),
          ...(groupesChef ?? []).map((g) => g.id),
        ]),
      ].filter(Boolean);

      if (groupeIds.length === 0) return [];

      const { data } = await supabase
        .from("seances")
        .select("*, groupe:groupes(id, nom, photo_url), presences:seances_presences(count)")
        .in("groupe_id", groupeIds)
        .gte("date_seance", new Date().toISOString().slice(0, 10))
        .neq("statut", "annulee")
        .order("date_seance")
        .order("heure_debut")
        .limit(10);

      return (data ?? []) as unknown as (Database["public"]["Tables"]["seances"]["Row"] & {
        groupe: {
          id: string;
          nom: string;
          photo_url: string | null;
        } | null;
        presences: { count: number } | null;
      })[];
    },
  });
}

export function useStudiosRecommandes() {
  return useQuery({
    queryKey: ["studios-recommandes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select(
          "*, serviceVedette:studio_services!studio_services_studio_id_fkey(id, type_service, unite, prix, est_vedette)"
        )
        .eq("est_actif", true)
        .order("note_moyenne", { ascending: false })
        .limit(5);
      return (data ?? []) as unknown as (Database["public"]["Tables"]["studios"]["Row"] & {
        serviceVedette: Database["public"]["Tables"]["studio_services"]["Row"][] | null;
      })[];
    },
  });
}
