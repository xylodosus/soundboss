import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Compression d'image avant upload R2 (équivalent mobile de src/lib/image.ts web).
 * - Redimensionne à 1600 px max sur le plus grand côté
 * - Ré-encode en WebP qualité 0.82 (repli JPEG si WebP indisponible)
 * - Retourne le fichier original si la compression ne gagne rien
 */

const TAILLE_MAX = 1600;
const QUALITE = 0.82;
const SEUIL_COMPRESSION = 250 * 1024; // fichiers < 250 Ko : inchangés

export interface FichierImage {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

function nomSansExtension(nom: string): string {
  const dernierPoint = nom.lastIndexOf(".");
  return dernierPoint > 0 ? nom.slice(0, dernierPoint) : nom;
}

export async function compresserImage(fichier: FichierImage): Promise<FichierImage> {
  if (!fichier.type.startsWith("image/")) return fichier;
  if (fichier.size !== undefined && fichier.size <= SEUIL_COMPRESSION) return fichier;

  try {
    const contexte = ImageManipulator.manipulate(fichier.uri);
    contexte.resize({ width: TAILLE_MAX });
    const image = await contexte.renderAsync();

    const resultat = await image.saveAsync({
      format: SaveFormat.WEBP,
      compress: QUALITE,
    });
    image.release();

    // Repli : si le WebP n'a rien gagné, garder l'original
    if (!resultat.uri) return fichier;

    return {
      uri: resultat.uri,
      name: `${nomSansExtension(fichier.name)}.webp`,
      type: "image/webp",
    };
  } catch {
    return fichier;
  }
}
