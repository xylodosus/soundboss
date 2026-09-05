import { useQuery } from "@tanstack/react-query";
import { supabase, utilisateurId } from "@/lib/supabase";
import { agreger, type Stockage } from "@/lib/stockage";

export type { CategorieStockage, Stockage } from "@/lib/stockage";

/**
 * Stockage d'un groupe : fichiers partagés, audios de répétition et pistes
 * extraites de ces audios.
 *
 * Les pistes comptent pour le groupe : elles naissent d'un audio de répétition
 * qui lui appartient, et cinq à seize pistes par morceau pèsent bien plus que
 * le morceau lui-même.
 */
export function useStockageGroupe(groupeId: string, actif = true) {
  return useQuery({
    queryKey: ["stockage", "groupe", groupeId],
    enabled: actif && !!groupeId,
    queryFn: async (): Promise<Stockage> => {
      const [fichiers, enregistrements, stems] = await Promise.all([
        supabase
          .from("ressources")
          .select("type, taille_bytes")
          .eq("partage_type", "groupe")
          .eq("partage_groupe_id", groupeId),
        supabase
          .from("seance_enregistrements")
          .select("taille_octets, seances!inner(groupe_id)")
          .eq("seances.groupe_id", groupeId),
        supabase
          .from("enregistrement_stems")
          .select("taille_octets, seance_enregistrements!inner(seance_id, seances!inner(groupe_id))")
          .eq("seance_enregistrements.seances.groupe_id", groupeId),
      ]);

      return agreger(
        (fichiers.data ?? []).map((f) => ({ type: f.type, taille: f.taille_bytes })),
        (enregistrements.data ?? []).map((e) => ({ taille: e.taille_octets })),
        (stems.data ?? []).map((s) => ({ taille: s.taille_octets }))
      );
    },
  });
}

/** Stockage personnel : fichiers propres et répétitions sans groupe. */
export function useStockagePersonnel(actif = true) {
  return useQuery({
    queryKey: ["stockage", "perso"],
    enabled: actif,
    queryFn: async (): Promise<Stockage> => {
      const userId = await utilisateurId();
      const [fichiers, enregistrements, stems] = await Promise.all([
        supabase
          .from("ressources")
          .select("type, taille_bytes")
          .eq("partage_type", "personnel")
          .eq("partage_user_id", userId),
        supabase
          .from("seance_enregistrements")
          .select("taille_octets, seances!inner(user_id, groupe_id)")
          .is("seances.groupe_id", null)
          .eq("seances.user_id", userId),
        supabase
          .from("enregistrement_stems")
          .select(
            "taille_octets, seance_enregistrements!inner(seances!inner(user_id, groupe_id))"
          )
          .is("seance_enregistrements.seances.groupe_id", null)
          .eq("seance_enregistrements.seances.user_id", userId),
      ]);

      return agreger(
        (fichiers.data ?? []).map((f) => ({ type: f.type, taille: f.taille_bytes })),
        (enregistrements.data ?? []).map((e) => ({ taille: e.taille_octets })),
        (stems.data ?? []).map((s) => ({ taille: s.taille_octets }))
      );
    },
  });
}
