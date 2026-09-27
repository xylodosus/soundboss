// ============================================================================
// Edge Function : jeko-return
// ----------------------------------------------------------------------------
// Ramène l'utilisateur dans l'application après son passage chez l'opérateur.
//
// POURQUOI CE DÉTOUR
// Jèko exige des URL de retour en HTTPS et n'accepte pas un schéma applicatif.
// Une Edge Function est en HTTPS partout ; elle se contente de répondre par une
// redirection vers `soundboss://`, que le système remet à l'application. Le
// navigateur ne rend aucune page : il suit l'en-tête `Location`, donc aucune
// politique de sécurité de contenu ne s'applique.
//
// CE QUE CE RETOUR N'EST PAS
// Une preuve de paiement. Il ne fait que rediriger, sans rien écrire : le
// payeur peut ouvrir cette URL à la main. Le portefeuille ne bouge que sur un
// message signé par Jèko, traité par jeko-webhook. L'écran d'arrivée interroge
// la base via `etat_paiement`, jamais l'URL.
//
// Déployée avec verify_jwt = false : c'est un navigateur qui arrive ici, au
// retour d'un site tiers, sans en-tête d'autorisation.
// ============================================================================

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      },
    });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const entrante = new URL(req.url);
  const reference = entrante.searchParams.get("ref") ?? "";

  // « retour » dit exactement ce qui s'est passé : l'opérateur a rendu la main
  // sans erreur. Il ne dit pas que l'argent est arrivé — seul le webhook le
  // sait. Nommer cette issue « succès » induirait l'écran en erreur.
  const issue = entrante.searchParams.get("issue") === "ok" ? "retour" : "interrompu";

  const qs = new URLSearchParams({ paiement: issue });
  if (reference) qs.set("ref", reference);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `soundboss://wallet?${qs.toString()}`,
      "Cache-Control": "no-store",
    },
  });
});
