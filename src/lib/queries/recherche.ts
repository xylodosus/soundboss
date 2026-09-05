import { useQuery } from "@tanstack/react-query";
import { supabase, utilisateurId } from "@/lib/supabase";

export type TypeResultat = "audio" | "fichier" | "projet";

export type ResultatRecherche = {
  id: string;
  type: TypeResultat;
  titre: string;
  sousTitre?: string | null;
  /** Séance d'où provient un audio, pour ouvrir la bonne page. */
  seanceId?: string | null;
  /** Clé R2 et métadonnées d'un fichier, pour l'ouvrir sur place. */
  cle?: string | null;
  format?: string | null;
  tailleOctets?: number | null;
};

/** Deux caractères suffisent rarement à distinguer quoi que ce soit. */
export const LONGUEUR_MIN = 2;

/** Échappe les jokers de PostgREST : un « % » saisi doit chercher un « % ». */
function motif(terme: string): string {
  return `%${terme.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

const LIMITE = 20;

/**
 * Recherche dans un groupe : audios de répétition, fichiers partagés, projets.
 *
 * Trois requêtes plutôt qu'une vue : les tables n'ont ni les mêmes colonnes ni
 * les mêmes règles de visibilité, et la RLS de chacune s'applique d'elle-même.
 */
export function useRechercheGroupe(groupeId: string, terme: string) {
  const actif = terme.trim().length >= LONGUEUR_MIN && !!groupeId;
  return useQuery({
    queryKey: ["recherche", "groupe", groupeId, terme.trim()],
    enabled: actif,
    queryFn: async (): Promise<ResultatRecherche[]> => {
      const m = motif(terme.trim());

      const [audios, fichiers, projets] = await Promise.all([
        supabase
          .from("seance_enregistrements")
          .select("id, titre, seance_id, seances!inner(id, groupe_id, date_seance)")
          .eq("seances.groupe_id", groupeId)
          .ilike("titre", m)
          .limit(LIMITE),
        supabase
          .from("ressources")
          .select("id, nom, type, url, format, taille_bytes")
          .eq("partage_type", "groupe")
          .eq("partage_groupe_id", groupeId)
          .ilike("nom", m)
          .limit(LIMITE),
        supabase
          .from("projets")
          .select("id, nom, statut")
          .eq("groupe_id", groupeId)
          .ilike("nom", m)
          .limit(LIMITE),
      ]);

      return [
        ...versAudios(audios.data),
        ...versFichiers(fichiers.data),
        ...versProjets(projets.data),
      ];
    },
  });
}

/** Recherche dans l'espace personnel : fichiers et projets de l'utilisateur. */
export function useRecherchePersonnelle(terme: string) {
  const actif = terme.trim().length >= LONGUEUR_MIN;
  return useQuery({
    queryKey: ["recherche", "perso", terme.trim()],
    enabled: actif,
    queryFn: async (): Promise<ResultatRecherche[]> => {
      const m = motif(terme.trim());
      const userId = await utilisateurId();

      const [fichiers, projets] = await Promise.all([
        supabase
          .from("ressources")
          .select("id, nom, type, url, format, taille_bytes")
          .eq("partage_type", "personnel")
          .eq("partage_user_id", userId)
          .ilike("nom", m)
          .limit(LIMITE),
        supabase
          .from("projets")
          .select("id, nom, statut")
          .eq("user_id", userId)
          .ilike("nom", m)
          .limit(LIMITE),
      ]);

      return [...versFichiers(fichiers.data), ...versProjets(projets.data)];
    },
  });
}

type LigneAudio = { id: string; titre: string | null; seance_id: string };
type LigneFichier = {
  id: string;
  nom: string;
  type: string | null;
  url: string | null;
  format: string | null;
  taille_bytes: number | null;
};
type LigneProjet = { id: string; nom: string; statut: string | null };

function versAudios(lignes: unknown): ResultatRecherche[] {
  return ((lignes ?? []) as LigneAudio[]).map((a) => ({
    id: a.id,
    type: "audio" as const,
    titre: a.titre ?? "Audio",
    sousTitre: "Audio de répétition",
    seanceId: a.seance_id,
  }));
}

function versFichiers(lignes: unknown): ResultatRecherche[] {
  return ((lignes ?? []) as LigneFichier[]).map((f) => ({
    id: f.id,
    type: "fichier" as const,
    titre: f.nom,
    sousTitre: f.format ? f.format.toUpperCase() : "Fichier",
    cle: f.url,
    format: f.format,
    tailleOctets: f.taille_bytes,
  }));
}

function versProjets(lignes: unknown): ResultatRecherche[] {
  return ((lignes ?? []) as LigneProjet[]).map((p) => ({
    id: p.id,
    type: "projet" as const,
    titre: p.nom,
    sousTitre: "Projet",
  }));
}
