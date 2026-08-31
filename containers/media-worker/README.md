# Service de traitement média

Ce qu'un runtime edge ne peut pas faire, faute de binaires : `ffmpeg` et
`ffprobe`. C'est toute la raison d'être de ce conteneur.

## Ce qu'il apporte

| Traitement | Sans lui |
|---|---|
| Pics de waveform → `<base>.peaks.json` dans R2 | le lecteur affiche une barre de progression classique |
| Remux ADTS → M4A | un enregistrement audio brut n'est pas navigable (pas de seek) |
| Normalisation loudness (−16 LUFS) | volume inégal d'une prédication à l'autre |
| BPM via `aubiotrack` → colonne `bpm` | le tempo reste à saisir à la main |
| Sonde de durée fiable | l'edge `probe-media-duration` retombe sur sa sonde JS (lecture d'en-têtes par requêtes HTTP Range) — moins précise, mais fonctionnelle |

La vidéo ne dépend pas de ce service : c'est Bunny Stream qui transcode.

## Endpoints

| Route | Auth | Rôle |
|---|---|---|
| `GET /health` | aucune | sonde de la plateforme |
| `POST /jobs/analyze` `{ media_id }` | `Authorization: Bearer <MEDIA_WORKER_SECRET>` | analyse un média. **Répond 202 immédiatement** et traite en arrière-plan |

`/jobs/analyze` attend un `media_id` **uuid** (`seance_enregistrements.id`).
Il répond avant d'avoir fini : remuxer ou normaliser une heure
d'audio dépasserait le délai d'attente de l'appelant. Le résultat s'observe en
base (`seance_enregistrements.analyzed_at`), pas dans la réponse.

Le traitement est **idempotent** : un média déjà analysé est ignoré.

## Variables d'environnement

```
MEDIA_WORKER_SECRET          secret partagé attendu en Authorization: Bearer
R2_ACCOUNT_ID                <compte Cloudflare de SoundBoss>
R2_ACCESS_KEY_ID             jeton API R2
R2_SECRET_ACCESS_KEY         idem
R2_BUCKET_NAME               soundboss-media
SUPABASE_URL                 https://kgkghsvgwoltlnnrufop.supabase.co
SUPABASE_SERVICE_ROLE_KEY    clé service-role (contourne la RLS)
```

Optionnelles :

```
PORT                              80 (convention Bunny Magic Containers)
R2_ENDPOINT                       endpoint S3 complet. Défaut : juridiction par
                                  défaut (sans `.eu`), comme les edge functions.
                                  Ne renseigner `.eu` que pour un bucket créé en
                                  juridiction Union européenne — l'emplacement
                                  géographique ne suffit pas à l'exiger.
MAX_FILE_BYTES                    1500000000 — au-delà, le job est refusé
DELETE_SOURCE_AFTER_PROCESSING    false — garder le fichier source
ENABLE_WAVEFORM                   true
WAVEFORM_PEAKS                    1000
ENABLE_LOUDNESS_NORMALIZATION     false — DESTRUCTIF, voir plus bas
LOUDNESS_TARGET_LUFS              -16
LOUDNESS_TOLERANCE_LU             2      — 99 = mesurer sans réencoder
LOUDNESS_AAC_BITRATE              64k    — débit du réencodage
```

**Mesurer avant de normaliser.** Une tolérance volontairement énorme (`99`)
relève la sonie de chaque fichier dans `metadata.loudness_lufs` sans qu'aucun
réencodage ne puisse se déclencher : l'écart entre les valeurs dit si la
normalisation vaut la peine. Sur le corpus Cevlord, mesuré le 25 août 2026,
l'amplitude atteignait **17,5 LU** — de −26,5 à −9,0 LUFS — soit un rapport de
l'ordre de sept en sonie perçue d'un sermon à l'autre.

**Le débit décide si la normalisation allège ou alourdit.** Les sermons du
corpus sont des mp3 à ~92 kbps. Réencoder à 128 kbps les ferait passer de 419 à
581 Mo : on paierait une perte de génération **pour grossir**. À 64 kbps, l'AAC
vaut au moins le mp3 à 92 pour de la parole, et le total tombe à 291 Mo. D'où
ce défaut. Pour de la musique, ou par prudence, `96k` reste proche du débit
d'origine.

⚠️ **La normalisation loudness réencode le fichier.** Elle est livrée
désactivée. À n'activer qu'après vérification sur un fichier témoin.

## Déploiement sur Bunny Magic Containers

Bunny ne stocke pas l'image : il la tire depuis un registre. Celui de ce
service est **GitHub Container Registry** (`ghcr.io`), pas Docker Hub — ce
README a longtemps décrit Docker Hub, ce qui a coûté un déploiement : le push
réussissait sur `docker.io` pendant que Bunny continuait de tirer l'ancienne
image depuis `ghcr.io`, sans le moindre message d'erreur. L'image ne contient
aucun secret — ils arrivent par variables d'environnement à l'exécution —
seulement le code du service.

1. S'authentifier et publier. Le jeton GitHub doit porter la portée
   **`write:packages`** ; un jeton `repo` seul renvoie `denied` :
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u <compte> --password-stdin
   cd containers/media-worker
   docker build -t ghcr.io/<compte>/cevlord-media-worker:2 .
   docker push  ghcr.io/<compte>/cevlord-media-worker:2
   ```
   Le paquet doit être **public** côté GitHub, ou Bunny ne pourra pas le tirer.
   **Incrémenter le tag à chaque publication** (`:2`, `:3`…). Bunny met les
   images en cache : republier sous le même tag donne des redéploiements qui ne
   prennent pas, difficiles à diagnostiquer.

   ⚠️ **Publier ne suffit pas** : il faut ensuite pointer l'application Bunny
   sur le nouveau tag. Et rien ne signale qu'une image n'a pas été prise —
   `/health` ne renvoie pas de version. Le seul contrôle fiable est
   d'observer une sortie que seule la nouvelle image sait produire : après un
   changement de `LOUDNESS_AAC_BITRATE`, normaliser un fichier témoin et
   mesurer le débit du résultat.

   ⚠️ Sur un Mac Apple Silicon, ajouter `--platform linux/amd64` : une image
   `arm64` ne démarre pas côté Bunny. (Machine de développement actuelle :
   `x86_64`, donc rien à faire.)
2. Créer l'application dans Bunny → Magic Containers, image ci-dessus,
   **port 80**.
3. Renseigner les variables d'environnement (tableau ci-dessus).
4. Relever l'URL publique de l'application.
5. Ajouter côté **Supabase → Edge Functions → Secrets** :
   ```
   MEDIA_WORKER_URL     <url publique du service>
   MEDIA_WORKER_SECRET  <même valeur que dans le conteneur>
   MEDIA_BASE_URL       https://cevlord-media.cevlord.workers.dev
   ```
   `MEDIA_BASE_URL` sert à l'edge `probe-media-duration` pour signer les URL R2
   de son repli JS. Sans elle, le repli ne peut pas lire les fichiers.

Le `HEALTHCHECK` du Dockerfile interroge `/health` toutes les 30 s : Bunny
redémarre le conteneur de lui-même s'il cesse de répondre.

## Purge des orphelins

`POST /jobs/reap` supprime de R2 les médias que la base a désignés comme
purgeables, puis les marque. **La base décide, le worker exécute** : il ne
choisit rien, il ne détient que les identifiants R2. `?dry_run=1` liste sans
rien supprimer — à faire systématiquement d'abord.

⚠️ **Aucun cron n'appelle cet endpoint.** Rien ne se purge tout seul ; la
suppression sur R2 est irréversible et le CDN sert en `immutable`, un geste
explicite vaut mieux qu'un automatisme qui s'exécute un jour où personne ne
regarde.

⚠️ **Piège corrigé le 25 août 2026.** `ff_mark_media_purged` mettait
`file_path` à NULL, alors que la colonne porte une contrainte NOT NULL : le
marquage échouait à chaque appel. Le défaut est resté invisible jusqu'au
premier usage réel, parce que la suppression R2, elle, réussissait — les objets
disparaissaient et les lignes restaient éternellement « à purger ». Un second
passage aurait retenté de supprimer des objets déjà absents, et aurait effacé
un fichier vivant si son chemin avait entre-temps été réutilisé. Le chemin est
désormais conservé dans `metadata.chemin_purge` plutôt qu'effacé.

Leçon générale : ici, la réussite d'une étape ne dit rien de la suivante.
Contrôler l'état FINAL — objets absents de R2 **et** lignes marquées — plutôt
que le code de retour de l'appel.

## Vérification locale

```bash
npm install
npm test          # 38 tests : conteneur, loudness, waveform, purge
npm run typecheck

docker build -t cevlord-media-worker:test .
docker run --rm -p 8099:80 \
  -e MEDIA_WORKER_SECRET=test-secret \
  -e R2_ACCOUNT_ID=x -e R2_ACCESS_KEY_ID=x -e R2_SECRET_ACCESS_KEY=x \
  -e R2_BUCKET_NAME=cevlord-media \
  -e SUPABASE_URL=https://example.invalid -e SUPABASE_SERVICE_ROLE_KEY=x \
  cevlord-media-worker:test

curl http://127.0.0.1:8099/health                      # {"ok":true}
curl -X POST http://127.0.0.1:8099/jobs/analyze        # 401 sans secret
```

Validé le 22/08 : image construite, `ffmpeg` et `ffprobe` 8.1.2 présents,
`/health` à 200, `/jobs/analyze` à 401 sans secret et 400 sur `media_id`
invalide.

## Points de vigilance

**Ordre des traitements.** La normalisation *supersède* le remux — réencoder
produit déjà un M4A navigable, enchaîner les deux serait un double traitement.
Les pics sont calculés sur le fichier **final**, pour que la waveform affichée
corresponde à ce qui est réellement joué.

**Jamais d'écriture sur la source.** Un fichier dérivé porte toujours une clé
différente de l'original. Écraser serait irréversible, et le Worker sert les
médias en `Cache-Control: immutable` : le CDN continuerait de diffuser les
anciens octets pendant que la base annonce le nouveau fichier.

**Purge.** `/jobs/reap` ne décide rien : il demande à la base la liste des
médias purgeables (`ff_list_purgeable_media`) et ne pose la pierre tombale
qu'après une suppression R2 réussie. Tant que `ff_scan_orphan_media` n'existe
pas — elle est différée, cf. §6.3 du plan de portage — rien n'est jamais marqué
orphelin automatiquement : la purge ne trouve que ce qu'un humain a demandé via
`purge_requested_at`.

**Adaptations Cevlord** par rapport à la version Klezis : `paroles` → `parole`,
`duree_audio_secondes` → `duree_audio`, `duree_video_secondes` → `duree_video`.
Les liens vers le média (`audio_media_id`, `video_media_id`) portent le même nom
des deux côtés.

## Adaptation à SoundBoss (31/08/2026)

Ce service vient d'un autre projet. Ce qui a changé :

- `db.ts` cible **`seance_enregistrements`** (identifiant `uuid`) et non plus
  `media_files` (`id` numérique, `metadata` jsonb). Chaque information a sa
  colonne : `peaks_url`, `bpm`, `duree_secondes`, `taille_octets`, `analyzed_at`.
- **`patchMedia` n'écrit plus `updated_at`** : cette colonne n'existe pas ici,
  PostgREST rejetterait la requête.
- **Le reaper est retiré** (`/jobs/reap`, `reap.ts`) : il reposait sur une notion
  de média purgeable (`deleted_at`) absente de ce schéma. Récupérable dans
  l'historique git si un besoin de purge apparaît.
- **Détection de tempo ajoutée** via `aubiotrack`. Attention : le paquet Alpine
  `aubio` ne fournit pas de commande `aubio` à sous-commandes, seulement les
  anciens binaires séparés. `aubiotrack` imprime les instants de battement, pas
  un BPM — celui-ci est déduit de la médiane des intervalles.
- La **tonalité n'est pas détectée** : aubio ne sait pas le faire, il faudrait
  Essentia et une base Debian. Elle arrive avec les stems, via Fadr.
