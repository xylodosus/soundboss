import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type RessourceEquipe = Database["public"]["Tables"]["bibliotheque_ressources"]["Row"];
export type TypeRessource = Database["public"]["Enums"]["bibliotheque_type"];

export const clefsRessourcesEquipe = {
  liste: ["bibliotheque", "ressources"] as const,
};

/** Toutes les ressources de la bibliothèque SoundBoss (RLS : connecté uniquement). */
export function useRessourcesEquipe() {
  return useQuery({
    queryKey: clefsRessourcesEquipe.liste,
    queryFn: async (): Promise<RessourceEquipe[]> => {
      const { data, error } = await supabase
        .from("bibliotheque_ressources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RessourceEquipe[];
    },
  });
}

/**
 * Filtre les ressources selon le profil du musicien :
 * une ressource étiquetée n'est visible que si l'un de ses tags correspond
 * à ses instruments ou genres musicaux ; sans étiquette, elle est visible par tous.
 */
export function ressourcesPourProfil(
  ressources: RessourceEquipe[],
  instruments: string[] | null,
  genres: string[] | null
): RessourceEquipe[] {
  const profil = new Set<string>(
    [...(instruments ?? []), ...(genres ?? [])].map((t) => t.toLowerCase().trim())
  );
  return ressources.filter((r) => {
    if (r.tags.length === 0) return true;
    return r.tags.some((t) => profil.has(t.toLowerCase().trim()));
  });
}
