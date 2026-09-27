// ============================================================================
// Edge Function : acheter-credits
// ----------------------------------------------------------------------------
// Ouvre une intention de paiement et demande à Jèko une page d'encaissement.
//
// POURQUOI UNE FONCTION EDGE ET NON UN APPEL DEPUIS L'APP
// La clé d'API Jèko ne doit jamais quitter le serveur. Embarquée dans l'APK,
// elle permettrait à quiconque d'encaisser au nom de SoundBoss.
//
// CE QUE CETTE FONCTION NE FAIT PAS
// Créditer. Elle ouvre une intention `pending` et rend une URL. Le crédit
// n'arrive que par `jeko-webhook`, sur message signé.
//
// Secrets attendus : JEKO_API_KEY, JEKO_API_KEY_ID, JEKO_STORE_ID,
//                    JEKO_BASE_URL (facultatif), SUPABASE_URL,
//                    SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const METHODES = ["wave", "orange", "mtn", "moov", "djamo"] as const;
type Methode = (typeof METHODES)[number];

function reponse(statut: number, corps: unknown) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reponse(405, { erreur: "Méthode non autorisée" });

  const urlSupabase = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cle = Deno.env.get("JEKO_API_KEY");
  const cleId = Deno.env.get("JEKO_API_KEY_ID");
  const storeId = Deno.env.get("JEKO_STORE_ID");
  const baseJeko = Deno.env.get("JEKO_BASE_URL") ?? "https://api.jeko.io";

  if (!urlSupabase || !anon || !service || !cle || !cleId || !storeId) {
    console.error("[acheter-credits] configuration manquante");
    return reponse(500, { erreur: "Service de paiement indisponible" });
  }

  // L'appelant est un utilisateur authentifié : c'est son jeton qui décide de
  // qui achète, jamais un identifiant transmis dans le corps.
  const jeton = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const client = createClient(urlSupabase, anon);
  const { data: { user }, error: erreurAuth } = await client.auth.getUser(jeton);
  if (erreurAuth || !user) return reponse(401, { erreur: "Non autorisé" });

  let corps: { packId?: string; methode?: string };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { erreur: "Corps illisible" });
  }

  const packId = corps.packId;
  const methode = (corps.methode ?? "wave") as Methode;
  if (!packId) return reponse(400, { erreur: "Pack requis" });
  if (!METHODES.includes(methode)) return reponse(400, { erreur: "Moyen de paiement inconnu" });

  // L'intention est ouverte côté base, sous l'identité de l'appelant : le
  // montant et le nombre de crédits y sont figés.
  const clientUtilisateur = createClient(urlSupabase, anon, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  });
  const { data: ouverture, error: erreurOuverture } = await clientUtilisateur.rpc(
    "ouvrir_achat_credits",
    { p_pack_id: packId },
  );
  if (erreurOuverture) {
    console.error("[acheter-credits] ouverture", erreurOuverture);
    return reponse(500, { erreur: "Impossible d'ouvrir le paiement" });
  }
  const o = ouverture as { success: boolean; message: string; data?: Record<string, unknown> };
  if (!o?.success || !o.data) return reponse(400, { erreur: o?.message ?? "Pack indisponible" });

  const reference = String(o.data.reference);
  const montant = Number(o.data.montant);
  // XOF n'a pas de subdivision en usage, mais l'API compte en centimes et les
  // exige multiples de 100.
  const amountCents = Math.round(montant) * 100;

  const retour = `${urlSupabase}/functions/v1/jeko-return`;
  const demande = {
    amountCents,
    currency: "XOF",
    reference,
    storeId,
    paymentDetails: {
      type: "redirect",
      data: {
        paymentMethod: methode,
        successUrl: `${retour}?issue=ok&ref=${encodeURIComponent(reference)}`,
        errorUrl: `${retour}?issue=ko&ref=${encodeURIComponent(reference)}`,
      },
    },
  };

  let reponseJeko: Response;
  try {
    reponseJeko = await fetch(`${baseJeko}/partner_api/payment_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": cle,
        "X-API-KEY-ID": cleId,
      },
      body: JSON.stringify(demande),
    });
  } catch (e) {
    console.error("[acheter-credits] réseau", e);
    return reponse(502, { erreur: "L'opérateur de paiement est injoignable" });
  }

  const texte = await reponseJeko.text();
  if (!reponseJeko.ok) {
    console.error("[acheter-credits] jeko", reponseJeko.status, texte.slice(0, 300));
    // L'intention reste `pending` : aucun crédit n'a été promis, et le webhook
    // ne viendra pas.
    return reponse(502, { erreur: "L'opérateur a refusé la demande de paiement" });
  }

  let resultat: { id?: string; redirectUrl?: string; status?: string };
  try {
    resultat = JSON.parse(texte);
  } catch {
    console.error("[acheter-credits] réponse illisible", texte.slice(0, 300));
    return reponse(502, { erreur: "Réponse inattendue de l'opérateur" });
  }

  if (!resultat.redirectUrl) {
    console.error("[acheter-credits] pas de redirectUrl", texte.slice(0, 300));
    return reponse(502, { erreur: "L'opérateur n'a pas rendu de page de paiement" });
  }

  // Trace de l'identifiant opérateur, utile au rapprochement manuel.
  const admin = createClient(urlSupabase, service, { auth: { persistSession: false } });
  await admin
    .from("paiements")
    .update({ transaction_id: resultat.id ?? null, methode_paiement: methode })
    .eq("reference", reference);

  return reponse(200, {
    reference,
    redirectUrl: resultat.redirectUrl,
    montant,
    credits: o.data.credits,
  });
});
