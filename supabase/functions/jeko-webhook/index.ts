// ============================================================================
// Edge Function : jeko-webhook
// ----------------------------------------------------------------------------
// Seul point du système capable de créditer un portefeuille.
//
// POURQUOI PAS LE RETOUR DU NAVIGATEUR
// Parce que le payeur contrôle son navigateur. Il peut ouvrir l'URL de succès
// sans avoir rien payé. Il ne peut pas, en revanche, fabriquer une signature
// HMAC calculée avec un secret qu'il n'a pas.
//
// TROIS PROPRIÉTÉS EXIGÉES PAR JÈKO, TRAITÉES ICI
//   - la signature porte sur le corps BRUT, pas sur le JSON reparsé ;
//   - les messages peuvent être rejoués, d'où l'idempotence assurée en base
//     par jeko_regler_paiement ;
//   - il faut répondre vite, et ne jamais rendre d'erreur pour un message
//     compris mais écarté, sans quoi Jèko le rejouerait indéfiniment.
//
// Déployée avec verify_jwt = false : Jèko n'a aucune raison de présenter un
// jeton Supabase. C'est la signature qui l'authentifie, et rien d'autre.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Comparaison à durée constante.
 *
 * Une comparaison ordinaire s'arrête au premier caractère qui diffère : le
 * temps de réponse laisse alors deviner la signature attendue, octet par
 * octet. Ici chaque caractère est examiné, quoi qu'il arrive.
 */
function memeSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Retrouve le montant, en centimes, dans le corps du message.
 *
 * Forme relevée sur un encaissement authentique :
 *
 *     { "amount": { "amount": 100, "currency": "XOF" },
 *       "fees":   { "amount": 100, "currency": "XOF" }, ... }
 *
 * `amount` est un objet, pas un nombre — et surtout pas `amountCents`, qui
 * n'existe que dans la requête sortante. Ne jamais retomber sur `fees`, qui a
 * exactement la même forme et peut porter la même valeur.
 *
 * Rend null quand le montant reste illisible. Null veut dire « on ne sait pas »,
 * pas « zéro » : la base ne comparera alors rien plutôt que de refuser un
 * paiement réel.
 */
function montantEnCentimes(corps: Record<string, unknown>): number | null {
  const bloc = corps.amount;
  if (!bloc || typeof bloc !== "object") return null;

  const { amount, currency } = bloc as { amount?: unknown; currency?: unknown };

  if (typeof currency === "string" && currency.toUpperCase() !== "XOF") {
    console.error("[jeko-webhook] devise inattendue", currency);
    return null;
  }

  const n = typeof amount === "string" ? Number(amount) : amount;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return Math.round(n);
  return null;
}

async function hmacHex(secret: string, corps: string): Promise<string> {
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(corps));
  return Array.from(new Uint8Array(signature))
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("JEKO_WEBHOOK_SECRET");

  if (!url || !serviceKey || !secret) {
    console.error("[jeko-webhook] configuration manquante");
    return new Response("misconfigured", { status: 500 });
  }

  // Corps BRUT : c'est sur lui que porte la signature. Le reparser puis le
  // re-sérialiser changerait les espaces et l'ordre des clés, et la
  // vérification échouerait sans raison visible.
  const brut = await req.text();
  const recue = req.headers.get("Jeko-Signature") ?? "";
  const attendue = await hmacHex(secret, brut);

  if (!recue || !memeSignature(recue.toLowerCase(), attendue)) {
    console.error("[jeko-webhook] signature invalide");
    return new Response("invalid signature", { status: 401 });
  }

  let corps: Record<string, unknown>;
  try {
    corps = JSON.parse(brut);
  } catch {
    console.error("[jeko-webhook] corps illisible");
    return new Response("bad json", { status: 400 });
  }

  // Les demandes de rattachement Service Provider arrivent sous enveloppe
  // { event, payload }. On ne les traite pas, mais on les accuse : rendre une
  // erreur les ferait rejouer sans fin.
  if (typeof corps.event === "string") {
    console.log("[jeko-webhook] evenement ignore", corps.event);
    return new Response("ok", { status: 200 });
  }

  const details = (corps.transactionDetails ?? {}) as Record<string, unknown>;
  const reference = typeof details.reference === "string" ? details.reference : null;
  const statut = typeof corps.status === "string" ? corps.status : null;
  const transactionId = typeof corps.id === "string" ? corps.id : null;
  const montant = montantEnCentimes(corps);

  if (montant === null) {
    // On ne sait pas lire le montant : le paiement passera quand même, mais on
    // veut la forme exacte du message pour rétablir le contrôle. Le corps ne
    // contient que des identifiants et des états, aucun secret.
    console.error("[jeko-webhook] montant introuvable, corps reçu :", brut);
  }

  // Une transaction encore en cours n'est pas une décision : on attend le
  // message définitif plutôt que de clore l'intention à tort.
  if (statut === "pending") {
    console.log("[jeko-webhook] en cours, ignore", reference);
    return new Response("ok", { status: 200 });
  }

  if (!reference) {
    // Un encaissement fait hors de SoundBoss (lien de paiement, caisse Jèko)
    // n'a pas notre référence. Ce n'est pas une anomalie.
    console.log("[jeko-webhook] transaction sans reference SoundBoss", transactionId);
    return new Response("ok", { status: 200 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("jeko_regler_paiement", {
    p_reference: reference,
    p_provider_tx_id: transactionId,
    p_status: statut,
    p_amount_cents: montant, // null = illisible, la base ne comparera pas
    p_failure_reason: statut === "success" ? null : `statut ${statut}`,
  });

  if (error) {
    // Erreur de notre côté : on rend une erreur pour que Jèko rejoue.
    console.error("[jeko-webhook] rpc", reference, error);
    return new Response("retry", { status: 500 });
  }

  console.log("[jeko-webhook]", reference, statut, (data as { code?: string })?.code ?? "");
  return new Response("ok", { status: 200 });
});
