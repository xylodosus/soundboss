import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

export type VoieTelechargement = "bibliotheque" | "partage";

/**
 * Seul l'audio passe par la médiathèque. La restriction est délibérée : élargir
 * aux images et vidéos obligerait à déclarer READ_MEDIA_IMAGES et
 * READ_MEDIA_VIDEO, soit un accès en lecture à toute la médiathèque de
 * l'utilisateur — disproportionné pour un bouton de téléchargement.
 */
const TYPES_MEDIATHEQUE = ["audio/"];

/**
 * Décide comment livrer le fichier à l'utilisateur.
 *
 * Sur Android, un vrai téléchargement vers les dossiers publics est possible et
 * correspond à ce que promet le bouton. Sur iOS il n'existe aucun dossier
 * utilisateur : la feuille de partage, avec son « Enregistrer dans Fichiers »,
 * EST la voie normale — ce n'est pas un pis-aller.
 *
 * La médiathèque Android n'accepte que des médias : un PDF y serait refusé,
 * d'où le repli sur le partage. Idem si la permission est refusée — mieux vaut
 * une feuille de partage qu'un échec sec.
 */
export function voieTelechargement(
  plateforme: string,
  mimeType: string | undefined,
  permissionAccordee: boolean
): VoieTelechargement {
  if (plateforme !== "android" || !permissionAccordee || !mimeType) return "partage";
  return TYPES_MEDIATHEQUE.some((t) => mimeType.startsWith(t)) ? "bibliotheque" : "partage";
}

/** Retire les caractères qu'un système de fichiers refuse, et borne la longueur. */
export function nettoyerNom(nom: string): string {
  return nom.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "audio";
}

/**
 * Télécharge une URL dans le cache, puis la livre selon la plateforme :
 * enregistrement réel dans la médiathèque Android, feuille de partage sur iOS.
 *
 * Retourne "telecharge" quand le fichier est dans les dossiers de l'appareil,
 * "partage" quand la feuille s'est ouverte, "cache" quand ni l'un ni l'autre
 * n'était possible — le fichier est alors bien téléchargé, mais hors de portée.
 */
export async function telechargerEtPartager(
  url: string,
  nomFichier: string,
  mimeType?: string
): Promise<"telecharge" | "partage" | "cache"> {
  const destination = new File(Paths.cache, `soundboss-${Date.now()}-${nettoyerNom(nomFichier)}`);
  await File.downloadFileAsync(url, destination);

  let permission = false;
  if (Platform.OS === "android") {
    // writeOnly : l'app enregistre, elle n'a aucun besoin de lire la
    // médiathèque. Demander moins, c'est une invite moins intrusive.
    const reponse = await MediaLibrary.requestPermissionsAsync(true);
    permission = reponse.granted;
  }

  if (voieTelechargement(Platform.OS, mimeType, permission) === "bibliotheque") {
    await MediaLibrary.createAssetAsync(destination.uri);
    return "telecharge";
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destination.uri, { mimeType, dialogTitle: nomFichier });
    return "partage";
  }
  return "cache";
}
