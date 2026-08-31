import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Retire les caractères qu'un système de fichiers refuse, et borne la longueur. */
export function nettoyerNom(nom: string): string {
  return nom.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "audio";
}

/**
 * Télécharge une URL dans le cache puis ouvre la feuille de partage système.
 * Retourne "partage" si la feuille s'est ouverte, "cache" si le partage est
 * indisponible sur l'appareil — dans ce cas le fichier est bien téléchargé.
 */
export async function telechargerEtPartager(
  url: string,
  nomFichier: string,
  mimeType?: string
): Promise<"partage" | "cache"> {
  const destination = new File(Paths.cache, `soundboss-${Date.now()}-${nettoyerNom(nomFichier)}`);
  await File.downloadFileAsync(url, destination);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destination.uri, { mimeType, dialogTitle: nomFichier });
    return "partage";
  }
  return "cache";
}
