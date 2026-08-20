import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Dossier = Database["public"]["Tables"]["dossiers_personnels"]["Row"];
type Ressource = Database["public"]["Tables"]["ressources"]["Row"];

/** Dossiers par défaut créés pour chaque utilisateur. */
export const DOSSIERS_PAR_DEFAUT = [
  "Mes documents",
  "Mes loops",
  "Mes partitions",
  "Mes audios",
  "Mes styles",
] as const;

export const clefsDossiers = {
  liste: ["personnel", "dossiers"] as const,
  fichiers: (dossierId: string | null) => ["personnel", "fichiers", dossierId ?? "sans-dossier"] as const,
};

export type DossierAvecCompte = Dossier & { nbFichiers: number };

/** Crée les dossiers par défaut s'ils manquent, puis retourne les dossiers de l'utilisateur. */
export function useDossiersPersonnels() {
  return useQuery({
    queryKey: clefsDossiers.liste,
    queryFn: async (): Promise<DossierAvecCompte[]> => {
      const userId = await utilisateurId();

      const { data: existants } = await supabase
        .from("dossiers_personnels")
        .select("id, nom")
        .eq("user_id", userId);

      const nomsExistants = new Set((existants ?? []).map((d) => d.nom));
      const manquants = DOSSIERS_PAR_DEFAUT.filter((nom) => !nomsExistants.has(nom));
      if (manquants.length > 0) {
        await supabase.from("dossiers_personnels").insert(
          manquants.map((nom) => ({ user_id: userId, nom }))
        );
      }

      const { data: dossiers } = await supabase
        .from("dossiers_personnels")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const { data: fichiers } = await supabase
        .from("ressources")
        .select("id, dossier_id")
        .eq("partage_type", "personnel")
        .eq("partage_user_id", userId);

      const comptes = new Map<string, number>();
      for (const f of fichiers ?? []) {
        if (f.dossier_id) comptes.set(f.dossier_id, (comptes.get(f.dossier_id) ?? 0) + 1);
      }

      return (dossiers ?? []).map((d) => ({ ...d, nbFichiers: comptes.get(d.id) ?? 0 }));
    },
  });
}

export function useCreerDossier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nom: string) => {
      const userId = await utilisateurId();
      const { error } = await supabase.from("dossiers_personnels").insert({ user_id: userId, nom: nom.trim() });
      if (error) throw new Error("Impossible de créer le dossier.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsDossiers.liste }),
  });
}

export function useSupprimerDossier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dossierId: string) => {
      const { error } = await supabase.from("dossiers_personnels").delete().eq("id", dossierId);
      if (error) throw new Error("Impossible de supprimer le dossier.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsDossiers.liste });
      queryClient.invalidateQueries({ queryKey: ["personnel", "fichiers"] });
    },
  });
}

export type FichierPersonnel = Ressource;

export function useFichiersPersonnels(dossierId: string | null) {
  return useQuery({
    queryKey: clefsDossiers.fichiers(dossierId),
    queryFn: async (): Promise<FichierPersonnel[]> => {
      const userId = await utilisateurId();
      let requete = supabase
        .from("ressources")
        .select("*")
        .eq("partage_type", "personnel")
        .eq("partage_user_id", userId)
        .order("created_at", { ascending: false });

      if (dossierId) {
        requete = requete.eq("dossier_id", dossierId);
      } else {
        requete = requete.is("dossier_id", null);
      }

      const { data, error } = await requete;
      if (error) throw error;
      return (data ?? []) as FichierPersonnel[];
    },
  });
}

/** Supprime un fichier personnel (restreint à son propriétaire). */
export function useSupprimerFichierPersonnel(dossierId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ressourceId: string) => {
      const userId = await utilisateurId();
      const { error } = await supabase
        .from("ressources")
        .delete()
        .eq("id", ressourceId)
        .eq("partage_user_id", userId);
      if (error) throw new Error("Impossible de supprimer le fichier.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsDossiers.fichiers(dossierId) });
      queryClient.invalidateQueries({ queryKey: clefsDossiers.liste });
    },
  });
}

/** Ajoute un fichier personnel dans un dossier (le fichier est déjà sur R2). */
export function useAjouterFichierPersonnel(dossierId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nom,
      type,
      url,
      format,
      tailleBytes,
    }: {
      nom: string;
      type: Ressource["type"];
      url: string;
      format?: string | null;
      tailleBytes?: number | null;
    }) => {
      const userId = await utilisateurId();
      const { error } = await supabase.from("ressources").insert({
        nom,
        description: null,
        type,
        url,
        format: format ?? null,
        taille_bytes: tailleBytes ?? null,
        partage_type: "personnel",
        partage_user_id: userId,
        dossier_id: dossierId,
        visibilite: "publique",
        uploaded_by: userId,
      });
      if (error) throw new Error("Impossible d'ajouter le fichier.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clefsDossiers.fichiers(dossierId) });
      queryClient.invalidateQueries({ queryKey: clefsDossiers.liste });
    },
  });
}
