// Edge function Supabase — génère une URL signée R2 (PUT) pour un upload direct.
// Déployer : supabase functions deploy get-signed-upload-url
// Variables : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
//             R2_ENDPOINT (optionnel : endpoint régional ou domaine personnalisé,
//             ex: https://<account>.eu.r2.cloudflarestorage.com)
//
// Relevé du projet distant au 24 septembre 2026 (version 12).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
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
    const { dossier, contentType = "application/octet-stream", expiresIn = 600 } = await req.json();

    const cle = `${dossier ?? "uploads"}/${user.id}/${crypto.randomUUID()}`;

    const client = new S3Client({
      region: "auto",
      endpoint: endpointR2(),
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
      // Pas de checksum CRC32 : évite les headers x-amz-checksum-* qui
      // compliquent le preflight CORS des uploads navigateur → R2
      requestChecksumCalculation: "WHEN_REQUIRED",
    });

    const commande = new PutObjectCommand({
      Bucket: Deno.env.get("R2_BUCKET"),
      Key: cle,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, commande, { expiresIn });

    return reponse(200, { url, key: cle });
  } catch (erreur) {
    console.error(erreur);
    return reponse(500, { erreur: "Erreur interne" });
  }
});
