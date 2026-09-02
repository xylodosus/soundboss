# Lots E4 & E5 — Stems (Fadr) et génération musicale (Kie.ai / Suno)

**Goal:** Séparer un enregistrement en pistes isolées travaillables dans le labo,
et générer des maquettes musicales. Deux intégrations externes payantes, donc
deux exigences nouvelles pour ce projet : des clés qui ne doivent jamais toucher
le client, et une dépense qui ne doit jamais filer.

---

## Contrats vérifiés dans la documentation

**Fadr** (`https://api.fadr.com`, `Authorization: Bearer <clé>`), en cinq temps :

| # | Requête | Corps | Réponse |
|---|---|---|---|
| 1 | `POST /assets/upload2` | `{ name, extension }` | `{ url, s3Path }` |
| 2 | `PUT <url signée>` | octets, `Content-Type` obligatoire | — |
| 3 | `POST /assets` | `{ name, extension, group, s3Path }` | `{ asset }` avec `_id` |
| 4 | `POST /assets/analyze/stem` | `{ _id }` | `{ task }` avec `_id` |
| 5 | `POST /tasks/query` | `{ _ids: [taskId] }` | `{ tasks }` |

Puis `GET /assets/{id}` pour lire `metaData.stemType`, et
`GET /assets/download/{id}/hq` qui rend `{ url }`. Scrutation recommandée
**toutes les 5 secondes**. La tâche produit cinq stems — voix, batterie, basse,
mélodies, instrumental — plus des MIDI et une détection de tonalité et de tempo.

Abonnement **Fadr Plus, 10 $/mois**, incluant 10 $ d'usage API mensuel.

**Kie.ai / Suno** (`https://api.kie.ai`, `Authorization: Bearer <clé>`) :
`POST /api/v1/generate` avec `{ prompt, customMode, instrumental, model, callBackUrl }`,
et en mode personnalisé `style`, `title`, `duration`. Rend `{ data: { taskId } }`.
La fin arrive **par rappel HTTP** sur `callBackUrl` — `callbackType: "complete"` —
avec `audio_url`, `duration`, `title`. Une scrutation est possible en repli.

---

## Trois contraintes que ces contrats imposent

**Les clés ne peuvent pas vivre dans l'app.** Un client mobile est lisible : une
clé embarquée dans un bundle est une clé publique. Les deux intégrations vivent
donc dans le **conteneur média**, qui a déjà R2, Supabase, une adresse HTTPS
publique et l'habitude des travaux longs. Le rappel de Kie.ai a d'ailleurs
besoin de cette adresse publique — l'app n'en a aucune.

**Cinq stems ne tiennent pas en mémoire.** Un morceau de cinq minutes décodé
pèse 103 Mo (mesuré au lot E1, Pocophone F1). Cinq stems joués ensemble, c'est
515 Mo : intenable, et tout l'intérêt des stems est de les jouer **ensemble**
pour en couper un.

Le conteneur les réencodera donc en **mono à 22 050 Hz** avant de les déposer
dans R2. Un stem tombe alors à ~26 Mo décodé, et les cinq à ~130 Mo — l'ordre de
grandeur d'un seul morceau aujourd'hui. La perte est réelle et assumée : isoler
une ligne de basse ou couper la voix pour travailler un pupitre ne demande ni
stéréo ni bande passante complète. C'est un outil de répétition, pas un
mastering.

**La dépense doit être bornée avant le premier appel.** Rien n'empêche
aujourd'hui un testeur de lancer trente séparations dans l'après-midi. Ce n'est
pas encore un système de facturation — ce sera l'objet d'un lot ultérieur, une
fois le coût réel mesuré — mais un simple compteur journalier par personne,
vérifié côté serveur, qui refuse au-delà d'un seuil.

---

## Ce que l'utilisateur doit faire lui-même

Les secrets ne transitent jamais par la conversation, comme pour
`MEDIA_WORKER_SECRET` et les clés R2.

1. Souscrire **Fadr Plus** et relever la clé d'API.
2. Acheter des crédits **Kie.ai** et relever la clé d'API.
3. Les poser en variables d'environnement du conteneur, côté Bunny :
   `FADR_API_KEY` et `KIE_API_KEY`.
4. Poser l'adresse publique du conteneur en `PUBLIC_BASE_URL` — Kie.ai en a
   besoin pour rappeler.

Tant qu'une clé manque, la fonctionnalité correspondante reste **inerte** et le
dit clairement, comme le déclencheur d'analyse l'a fait tant que le conteneur
n'existait pas.

---

## Ordre d'exécution

**E4 d'abord.** Les stems alimentent le labo, qui existe déjà et attend de quoi
travailler. E5 est indépendant et ne sert aucune fonctionnalité existante.

### E4 — Stems

- [ ] **Migration** : table `enregistrement_stems` (id, enregistrement_id, type,
      url R2, taille), colonnes de suivi sur `seance_enregistrements`
      (`stems_statut`, `stems_tache_id`, `stems_erreur`), et table
      `quotas_ia` (utilisateur, jour, service, compteur).
- [ ] **`containers/media-worker/src/fadr.ts`** : client typé des cinq requêtes,
      avec tests sur le parsing des réponses et la logique de scrutation.
- [ ] **`POST /jobs/stems`** dans le conteneur : télécharge depuis R2, pousse
      vers Fadr, scrute toutes les 5 s, récupère chaque stem, le réencode en
      mono 22 050 Hz, le dépose dans R2, écrit en base.
- [ ] **RPC `demander_stems`** en `SECURITY DEFINER` : vérifie le quota, marque
      l'enregistrement, appelle le conteneur par `pg_net` comme le fait déjà
      `trg_audio_depose`.
- [ ] **Labo** : chargement des stems au lieu du mixage, une piste par stem avec
      volume et coupure, lecture synchronisée sur un seul point de départ.
- [ ] **Comparer** la tonalité et le tempo rendus par Fadr à ceux de notre
      détection, sur les mêmes morceaux. C'est une validation gratuite.

### E5 — Génération

- [ ] **Migration** : table `generations_ia` (demandeur, groupe, invite, statut,
      tâche, url, durée).
- [ ] **`containers/media-worker/src/suno.ts`** + `POST /jobs/generer` et
      `POST /callbacks/suno` — ce dernier **non authentifié par le secret
      partagé** puisque Kie.ai l'appelle : il valide plutôt le `taskId` contre la
      base et ignore tout ce qui ne correspond à aucune demande en cours.
- [ ] **Écran de génération** : invite, style, durée, instrumental, et la liste
      des générations passées.

---

## Vérification

- [ ] Une clé absente laisse la fonctionnalité inerte, sans erreur ni plantage
- [ ] Le quota refuse la demande au-delà du seuil, et le dit
- [ ] Cinq stems chargés ensemble tiennent sur le Pocophone F1
- [ ] Aucune clé n'apparaît dans le dépôt, ni dans un bundle client
