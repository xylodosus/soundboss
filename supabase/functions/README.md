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
