// Edge function `send-push` — relevé du projet distant au 24 septembre 2026.
//
// Déployée le 20 août 2026, jamais versionnée. Appelée par ff_enqueue_notif,
// jamais par l'app : `verify_jwt` vaut false — l'adresse est publique — et
// l'authentification tient au seul en-tête X-Push-Secret.
//
// Secrets attendus dans l'environnement de la fonction :
//   PUSH_DISPATCH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Déploiement : npx supabase functions deploy send-push --no-verify-jwt
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

interface Payload {
  user_ids: string[];
  canal: string;
  titre: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST requis", { status: 405 });

  // Auth interne : seul ff_enqueue_notif (qui détient le secret) peut appeler.
  const secret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (!secret || req.headers.get("X-Push-Secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const { user_ids, canal, titre, body, data } = payload;
  if (!user_ids?.length || !titre || !body) return json({ error: "missing fields" }, 400);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // 1. Tokens ACTIFS des destinataires.
  const { data: tokens, error } = await supa
    .from("device_token")
    .select("expo_token, user_id")
    .in("user_id", user_ids)
    .eq("est_actif", true);
  if (error) return json({ error: "token fetch failed", detail: error.message }, 500);
  if (!tokens?.length) return json({ sent: 0, message: "no active tokens" }, 200);

  // 2. Badge = nombre de notifications NON LUES par destinataire.
  const badgeByUser = new Map<string, number>();
  const tokenUserIds = [...new Set(tokens.map((t) => t.user_id))];
  const { data: unread } = await supa
    .from("notifications")
    .select("user_id")
    .in("user_id", tokenUserIds)
    .eq("est_lue", false);
  (unread ?? []).forEach((n: { user_id: string }) =>
    badgeByUser.set(n.user_id, (badgeByUser.get(n.user_id) ?? 0) + 1));

  // 3. Messages Expo (channelId Android = 'default' ; badge = non-lus).
  const messages = tokens.map((t) => ({
    to: t.expo_token,
    title: titre,
    body,
    sound: "default" as const,
    channelId: "default",
    badge: badgeByUser.get(t.user_id) ?? 1,
    data: { ...(data ?? {}), canal },
  }));

  // 4. Envoi par lots de 100 ; collecte des tokens révoqués.
  const invalid: string[] = [];
  let sent = 0;
  for (let i = 0; i < messages.length; i += CHUNK) {
    const batch = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });
      const jr = await res.json();
      const results = jr?.data ?? [];
      results.forEach((r: any, idx: number) => {
        if (r.status === "ok") sent++;
        else if (
          r.status === "error" &&
          (r.details?.error === "DeviceNotRegistered" ||
            r.details?.error === "InvalidCredentials")
        ) {
          invalid.push(batch[idx].to);
        }
      });
    } catch (e) {
      console.error("[send-push] batch failed", e);
    }
  }

  // 5. Désactiver (soft) les tokens révoqués.
  if (invalid.length) {
    await supa
      .from("device_token")
      .update({ est_actif: false })
      .in("expo_token", invalid);
  }

  console.log(
    `[send-push] canal=${canal} tokens=${tokens.length} sent=${sent} invalid=${invalid.length}`,
  );
  return json({ sent, invalid_deactivated: invalid.length }, 200);
});

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json" },
  });
}
