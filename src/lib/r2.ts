import { supabase } from "./supabase";
import { compresserImage } from "./image";

/**
 * Upload direct mobile → Cloudflare R2 via les edge functions Supabase
 * (mêmes fonctions que le web : get-signed-upload-url / get-signed-download-url).
 * 1. Compression des images (expo-image-manipulator)
 * 2. POST { dossier, contentType } avec JWT → { url, key }
 * 3. PUT du Blob vers l'URL signée
 */

const URL_FONCTIONS = `${process.env.EXPO_PUBLIC_SUPABASE_URL!}/functions/v1`;

export interface ReponseTeleversement {
  url: string;
  key: string;
}

async function autorisation(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expirée. Reconnecte-toi.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function televerserFichier(
  fichier: { uri: string; name: string; type: string },
  dossier: string
): Promise<ReponseTeleversement> {
  const fichierFinal = await compresserImage(fichier);
  const entetes = await autorisation();

  // 1. URL d'upload signée
  const reponse = await fetch(`${URL_FONCTIONS}/get-signed-upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...entetes },
    body: JSON.stringify({
      dossier,
      contentType: fichierFinal.type || "application/octet-stream",
    }),
  });

  if (!reponse.ok) {
    throw new Error(
      reponse.status === 404
        ? "La fonction d'upload n'est pas déployée sur Supabase."
        : "Impossible d'obtenir une URL d'upload. Réessaie."
    );
  }

  const donnees: ReponseTeleversement = await reponse.json();

  // 2. PUT direct vers R2
  const blob = await (await fetch(fichierFinal.uri)).blob();
  const upload = await fetch(donnees.url, {
    method: "PUT",
    headers: { "Content-Type": fichierFinal.type || "application/octet-stream" },
    body: blob,
  });

  if (!upload.ok) {
    throw new Error("L'envoi du fichier a échoué. Réessaie.");
  }

  return donnees;
}

/** URL de lecture signée pour une clé R2 (null si vide/échec). */
export async function urlLectureR2(cle: string): Promise<string | null> {
  if (!cle) return null;
  if (cle.startsWith("http")) return cle;
  try {
    const entetes = await autorisation();
    const reponse = await fetch(`${URL_FONCTIONS}/get-signed-download-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entetes },
      body: JSON.stringify({ key: cle }),
    });
    if (!reponse.ok) return null;
    const donnees = (await reponse.json()) as { url?: string };
    return donnees.url ?? null;
  } catch {
    return null;
  }
}
