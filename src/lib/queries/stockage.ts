import { useQuery } from "@tanstack/react-query";
import { supabase, utilisateurId } from "@/lib/supabase";
import { agreger, type Stockage } from "@/lib/stockage";

/**
 * Tailles des pistes d'un lot de générations.
 *
 * Le résultat d'un job est un JSONB, pas une ligne par fichier : une
 * génération rend deux pistes rangées dans `resultat.pistes`. Sans ce
 * dépliage, seize fichiers de R2 n'existaient pour aucun décompte.
 */
function pistesGenerees(
  jobs: { resultat: unknown }[] | null
): { taille: number | null }[] {
  const sortie: { taille: number | null }[] = [];
  for (const job of jobs ?? []) {
    const resultat = job.resultat as { pistes?: { taille_octets?: number | null }[] } | null;
    for (const piste of resultat?.pistes ?? []) {
      sortie.push({ taille: piste.taille_octets ?? null });
    }
  }
  return sortie;
}

export type { CategorieStockage, Stockage } from "@/lib/stockage";

/**
 * Stockage d'un groupe : fichiers partagés, audios de répétition, pistes
 * extraites et pièces jointes des discussions.
 *
 * Les pistes comptent pour le groupe : elles naissent d'un audio de répétition
 * qui lui appartient, et cinq à seize pistes par morceau pèsent bien plus que
 * le morceau lui-même.
 *
 * Les pièces jointes du chat aussi : elles occupent le même bucket R2 au nom
 * du même groupe. Elles vivent dans `messages` et non dans `ressources`, ce
 * qui les avait fait oublier de ce décompte.
 */
export function useStockageGroupe(groupeId: string, actif = true) {
  return useQuery({
    queryKey: ["stockage", "groupe", groupeId],
    enabled: actif && !!groupeId,
    queryFn: async (): Promise<Stockage> => {
      const [fichiers, enregistrements, stems, discussions, generations] = await Promise.all([
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
        // Un message supprimé n'est plus consultable : le compter reviendrait
        // à facturer un stockage que l'utilisateur croit avoir rendu.
        supabase
          .from("messages")
          .select("fichier_taille")
          .eq("groupe_id", groupeId)
          .not("fichier_url", "is", null)
          .not("est_supprime", "is", true),
        // Les pistes générées vivent dans un JSONB, pas dans une table de
        // fichiers : elles n'apparaissaient donc dans aucun décompte.
        supabase
          .from("ai_jobs")
          .select("resultat")
          .eq("groupe_id", groupeId)
          .eq("statut", "completed"),
      ]);

      return agreger({
        fichiers: (fichiers.data ?? []).map((f) => ({ type: f.type, taille: f.taille_bytes })),
        enregistrements: (enregistrements.data ?? []).map((e) => ({ taille: e.taille_octets })),
        stems: (stems.data ?? []).map((s) => ({ taille: s.taille_octets })),
        discussions: (discussions.data ?? []).map((m) => ({ taille: m.fichier_taille })),
        generations: pistesGenerees(generations.data),
      });
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
      const [fichiers, enregistrements, stems, generations] = await Promise.all([
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
        supabase
          .from("ai_jobs")
          .select("resultat")
          .eq("user_id", userId)
          .is("groupe_id", null)
          .eq("statut", "completed"),
      ]);

      return agreger({
        fichiers: (fichiers.data ?? []).map((f) => ({ type: f.type, taille: f.taille_bytes })),
        enregistrements: (enregistrements.data ?? []).map((e) => ({ taille: e.taille_octets })),
        stems: (stems.data ?? []).map((s) => ({ taille: s.taille_octets })),
        generations: pistesGenerees(generations.data),
      });
    },
  });
}
