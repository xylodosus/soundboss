# Edge functions

Relevé du projet distant `kgkghsvgwoltlnnrufop` au 24 septembre 2026. Ces trois
fonctions tournaient en production sans exister dans le dépôt : une perte du
projet Supabase les aurait emportées avec lui.

| Fonction | `verify_jwt` | Rôle |
|---|---|---|
| `send-push` | **false** | Reçoit `ff_enqueue_notif`, poste à l'API Expo |
| `get-signed-upload-url` | true | URL signée R2 en PUT |
| `get-signed-download-url` | true | URL signée R2 en GET |

`send-push` est la seule dont l'adresse soit publique : elle n'est pas appelée
par l'app mais par la base, qui ne porte pas de JWT. Son authentification tient
au seul en-tête `X-Push-Secret`, comparé à `PUSH_DISPATCH_SECRET`.

## Déploiement

```bash
npx supabase functions deploy send-push --no-verify-jwt
npx supabase functions deploy get-signed-upload-url
npx supabase functions deploy get-signed-download-url
```

⚠️ Sans `--no-verify-jwt`, `send-push` refuserait les appels de la base : la
chaîne de notifications tomberait en silence, les lignes continuant d'être
écrites dans `notifications` sans qu'aucun push ne parte.

## Secrets

Aucun n'est dans le dépôt. Ils se posent côté Supabase :

- `send-push` : `PUSH_DISPATCH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- les deux autres : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`, `R2_ENDPOINT` (facultatif), `SUPABASE_URL`, `SUPABASE_ANON_KEY`

La table `app_secrets` porte de son côté `push_dispatch_secret`,
`supabase_functions_url`, `media_worker_secret` et `media_worker_url`, sous une
RLS en `USING (false)` : seul le `service_role` la lit.

## Paiement Jèko

Trois fonctions ajoutées le 27 septembre 2026 pour l'achat de crédits.

| Fonction | `verify_jwt` | Rôle |
|---|---|---|
| `acheter-credits` | true | Ouvre l'intention et demande la page d'encaissement |
| `jeko-return` | **false** | Redirige le navigateur vers `soundboss://wallet` |
| `jeko-webhook` | **false** | Seul point capable de créditer un portefeuille |

### Le principe

Le **retour du navigateur ne prouve rien**. Le payeur contrôle son navigateur
et peut ouvrir l'adresse de succès sans avoir réglé. Seul `jeko-webhook`, sur
message signé HMAC-SHA256, crédite. L'écran d'arrivée interroge la base par
`etat_paiement`, jamais l'URL.

### Déploiement

```bash
npx supabase functions deploy acheter-credits
npx supabase functions deploy jeko-return  --no-verify-jwt
npx supabase functions deploy jeko-webhook --no-verify-jwt
```

⚠️ Sans `--no-verify-jwt`, ni le navigateur ni Jèko ne pourraient appeler : le
premier n'a pas de jeton, le second non plus.

### Secrets à poser côté Supabase

`JEKO_API_KEY`, `JEKO_API_KEY_ID`, `JEKO_STORE_ID`, `JEKO_WEBHOOK_SECRET`, et
`JEKO_BASE_URL` seulement si l'adresse diffère de `https://api.jeko.io`.

### À enregistrer chez Jèko

L'URL du webhook :
`https://<projet>.supabase.co/functions/v1/jeko-webhook`
