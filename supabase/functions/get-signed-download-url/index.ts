// Edge function Supabase — URL signée R2 (GET) pour lire un fichier privé.
// Déployer : supabase functions deploy get-signed-download-url
// Variables : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
//             R2_ENDPOINT (optionnel : endpoint régional ou domaine personnalisé,
//             ex: https://<account>.eu.r2.cloudflarestorage.com)
//
// Relevé du projet distant au 24 septembre 2026 (version 11).
//
// ⚠️ Une URL signée l'est POUR UNE MÉTHODE : celle-ci ne vaut que pour un GET.
// Un HEAD sur ce lien reçoit un 403 de R2 — piège qui avait fait rejeter des
// liens parfaitement valides dans le pré-contrôle des reprises Suno.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

function reponse(statut: number, corps: unknown) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function endpointR2(): string {
  return (
    Deno.env.get("R2_ENDPOINT") ??
    `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
  );
}

Deno.serve(async (req) => {
  // Preflight CORS (le navigateur n'envoie pas l'Authorization sur OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Autorisation : requête authentifiée (session Supabase)
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const {
    data: { user },
    error: erreurAuth,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (erreurAuth || !user) {
    return reponse(401, { erreur: "Non autorisé" });
  }

  if (req.method !== "POST") {
    return reponse(405, { erreur: "Méthode non autorisée" });
  }

  try {
    const { key, expiresIn = 3600 } = await req.json();
    if (!key) {
      return reponse(400, { erreur: "Clé manquante" });
    }

    const client = new S3Client({
      region: "auto",
      endpoint: endpointR2(),
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    });

    const commande = new GetObjectCommand({
      Bucket: Deno.env.get("R2_BUCKET"),
      Key: key,
    });

    const url = await getSignedUrl(client, commande, { expiresIn });

    return reponse(200, { url });
  } catch (erreur) {
    console.error(erreur);
    return reponse(500, { erreur: "Erreur interne" });
  }
});
