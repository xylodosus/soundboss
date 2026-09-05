# SoundBoss Mobile — Plan de développement (Expo SDK 54)

> Fichier de suivi du développement mobile. Source de référence :
> `../dev_plan.md` (web), `../architecture_groupe.md`, `../screens/` (mockups).
> App : **SoundBoss** — thème sombre par défaut (palette web), police
> **Plus Jakarta Sans**. Backend : Supabase (projet `kgkghsvgwoltlnnrufop`),
> stockage Cloudflare R2 (mêmes edge functions que le web).

## 1. Contexte & Stack

- **Expo SDK 54** — React Native 0.81, expo-router (file-based), New Architecture.
- **Supabase JS** (`@supabase/supabase-js`) — auth + PostgREST + Realtime (chat).
- **TanStack Query v5** — data fetching + cache.
- **expo-secure-store** — persistance session (tokens).
- **expo-image-manipulator** — compression des images avant upload R2.
- **expo-image-picker / expo-document-picker** — sélection média.
- **expo-audio** — notes vocales + enregistrements.
- **expo-notifications** — push notifications (inscription du token).
- **expo-linear-gradient, expo-image, @expo/vector-icons** — design.
- **@expo-google-fonts/plus-jakarta-sans** — police app.

## 2. Design system (hérité du web)

| Token | Valeur |
|---|---|
| charcoal | `#141110` |
| charcoalLight | `#1C1816` |
| warmGold | `#FBBF24` |
| deepGold | `#B45309` |
| terracotta | `#C65D3B` |
| terracottaLight | `#E07A56` |
| cream | `#F5F0EB` |
| muted | `#A8A29E` |

- Thème **sombre par défaut** (`userInterfaceStyle: "dark"`), mode clair plus tard.
- Police : Plus Jakarta Sans (400/500/600/700/800), titres bold/extrabold.
- Cards `borderRadius 20`, boutons `pill`, badges `pill`, grille 4/8 px.

## 3. Avancement des étapes

| # | Étape | Statut |
|---|---|---|
| 0 | Scaffold Expo SDK 54 + deps + config (app.json, plugins) | ✅ fait |
| 1 | Thème + client Supabase (SecureStore) + types régénérés | ✅ fait |
| 2 | Composants UI (Button, Input, Card, Badge, Avatar, EmptyState…) | ✅ fait |
| 3 | Auth : connexion, inscription, onboarding 3 étapes | ✅ fait |
| 4 | Tabs + Accueil (dashboard, notifications, prochaines séances) | ✅ fait |
| 5 | Groupes : liste, création (photo), détail + onglets, membres, pupitres | ✅ fait |
| 6 | Projets : onglet groupe + perso, répertoire + avancement (slider) | ✅ fait |
| 7 | Séances : planification, RSVP, setlist, enregistrements, notes, stats | ✅ fait |
| 8 | Chat temps réel (+ par pupitre), marquage lu | ✅ fait |
| 9 | Fichiers / médiathèque (upload R2 compressé) | ✅ fait |
| 10 | Studios : catalogue, fiche, réservation | ✅ fait |
| 11 | Wallet + Profil + Notifications + Paramètres | ✅ fait |
| 12 | Push notifications (expo-notifications, tokens, rappels) | ✅ fait (client + serveur) |
| 13 | Mode clair + i18n (fr/en/wo/ln) | ⏳ à faire |
| 14 | Offline-first + EAS build | 🟡 Android + iOS livrés, offline à faire |
| 15 | Invitations par code, dossiers perso, bibliothèque ressources | ✅ fait |
| 16 | Monétisation crédits (IA / Labo Audio, quotas, masterclass) | ⏳ à faire |

### ✅ Améliorations transverses (session 16/08)

- **Boîtes de dialogue custom** : `BoiteDialogue` + `FournisseurDialogue`/`useDialogue`
  (`confirmer` / `succes` / `erreur`) — utilisées partout (suppressions, envois…).
- **Liaison projets ↔ répétitions** : badge projet sur la séance, « Lier à un
  projet » (chef/admin), création de répétition liée depuis un projet, page de
  détail des **répétitions personnelles** (`/seances/[id]`).
- **Tâches de projet** : CRUD (modal), statuts À faire/En cours/Faite,
  assignation membre/pupitre, échéances (tri en retard/bientôt), priorités.
- **Date/heure pickers** aux couleurs du design (`ChampDatePicker`,
  `@react-native-community/datetimepicker`) dans toutes les modales de création.
- **Répertoire de projet** : slider d'avancement précis (icône edit/save,
  mise à jour optimiste du cache).
- **Stockage du groupe** : onglet « Stockage » (chef seul) avec donut SVG des
  tailles par type + total Mo.
- **Réglages divers** : bouton « Ajouter » uniformisé (pilule jaune), clavier
  chat corrigé (Android edge-to-edge / iOS safe area), publication Realtime
  activée (elle était vide), erreurs PostgREST ne sont plus avalées.
### ✅ Nouveautés (session 17-20/08)

- **Invitations par code** (`app/rejoindre.tsx`, `src/components/groupe/invitation-groupe.tsx`) :
  code à 6 chiffres généré par le chef/admin, valable 48 h, partage natif
  (`Share`), révocation, deep link `soundboss://rejoindre?code=123456`,
  RPC `rejoindre_par_code`.
- **Fichiers personnels & dossiers** (`src/lib/queries/dossiers.ts`,
  `src/components/personnel/onglet-fichiers-personnels.tsx`) : 5 dossiers créés
  par défaut (Mes documents / loops / partitions / audios / styles), CRUD
  dossier, upload R2, réutilisation de `ModalDetailFichier`.
- **Bibliothèque de ressources SoundBoss** (`src/lib/queries/ressources-equipe.ts`,
  `src/components/ressources/onglet-ressources.tsx`) : table
  `bibliotheque_ressources`, filtrage automatique selon les instruments et
  genres du musicien (ressource sans étiquette = visible par tous).
- **Polish UI** : squelettes animés `Shimmer` (reanimated + gradient),
  `Drapeau` + `PaysCard` (21 pays africains à l'inscription), `BoutonDore`,
  `ModalChoix`, `LecteurAudioModal`.

## 4. Détail des étapes

### ✅ Étape 0 — Scaffold
- `npx create-expo-app mobile --template default@sdk-54` ; template nettoyé.
- Dépendances : supabase-js, secure-store, image-manipulator, image-picker,
  document-picker, audio, notifications, linear-gradient, react-query,
  plus-jakarta-sans. `app.json` : slug `soundboss`, scheme `soundboss`,
  sombre par défaut, plugins secure-store / notifications / audio / pickers.

### ✅ Étape 1 — Fondations
- `src/lib/theme.ts` : palette + espacements + rayons (design system).
- `src/lib/supabase.ts` : client RN (SecureStore, autoRefresh, URL polyfill).
- `src/lib/database.types.ts` : types générés depuis la base (copie web).
- `src/lib/r2.ts` + `src/lib/image.ts` : upload R2 (edge functions + JWT) +
  compression (manipulator, WebP 1600 px / repli original).
- `src/lib/format.ts` : dates FR, FCFA, libellés (projets, statuts, présence).

### ✅ Étape 2 — Composants UI
- `Button` (primary/secondary/ghost, loading), `Input`, `TextArea`,
  `Screen` (SafeArea + padding), `Card`, `Badge`, `Avatar` (initiales),
  `VisuelGroupe` (expo-image + URL signée), `EmptyState`, `SectionHeader`,
  `ListRow`, `Toggle`, `FAB`.

### ✅ Étape 3 — Auth
- `/connexion` (email+mdp, téléphone+OTP), `/inscription`, `/mot-de-passe-oublie`,
  erreurs traduites (`erreurs.ts`), garde de session dans `_layout` racine.
- `/onboarding` : 3 étapes (identité → profil musical → rôle), sauvegarde
  par étape (mêmes champs que le web).

### ✅ Étape 4 — Accueil (tabs)
- 5 tabs : Accueil, Groupes, Projets, Studios, Profil (icônes lucide via
  vector-icons, active warmGold).
- Accueil : salutation, badge notifications, mes groupes (cartes), prochaines
  répétitions (+ mon RSVP), studios recommandés.

### ✅ Étape 5 — Groupes
- Liste (badge Chef/Admin/Membre), création (formulaire + photo compressée R2),
  détail : header (photo, type, ville, membres) + onglets segments :
  Membres (par pupitre, rôle, gestion admin par le chef), Pupitres (CRUD,
  création en modal), Projets, Répétitions, Fichiers, Chat, **Stockage
  (chef seul)**.

### ✅ Étape 6 — Projets
- Onglet Projets du groupe + `/projets` perso (solo) : carte (statut,
  catégorie événement/production, type, dates).
- Détail : avancement global (moyenne du répertoire), répertoire avec
  **slider d'avancement précis** (0-100, icône edit/save, cache optimiste),
  ajout morceau (+ tonalité/tempo), **Tâches** (modal, statuts, assignation
  membre/pupitre, échéances, priorités), **répétitions liées** (création
  d'une répétition liée en modal, badge projet sur la séance, détail des
  répétitions personnelles `/seances/[id]`). RPC `creer/modifier/supprimer_projet`,
  `ajouter_morceau_projet`, `maj_avancement_morceau`.

### ✅ Étape 7 — Répétitions
- Onglet Répétitions (à venir / historique) + planification (chef/admin,
  RPC `creer_seance`) + **panneau stats d'assiduité** (totaux, taux de
  présence, courbes 6 mois via `statistiques_presences_groupe`).
- Détail : RSVP 4 statuts (`rsvp_seance`), saisie chef (`maj_presence`),
  compteurs, **setlist** ordonnée (ajout/retrait + tonalité/tempo),
  **enregistrements audio** (upload R2 + lecteur expo-audio), **notes écrites**
  (timestamp passage), compte-rendu.
- ✅ Note vocale sur séance (`ModalEnregistrement`, expo-audio → R2).
- Feuille de présence : les simples membres voient la liste en lecture seule ;
  saisie réservée au chef/admin (swipe).

### ✅ Étape 8 — Chat
- `/groupes/[id]/chat` : Realtime `postgres_changes` sur `messages` (publication
  `supabase_realtime` activée + REPLICA IDENTITY FULL), bulles (moi à droite,
  avatars), dates groupées, sélecteur de discussion **chat général / par
  pupitre** (membre : général + son pupitre uniquement ; chef : tous), envoi
  texte + fichier/image (limite 32 Mo) + **note vocale** (expo-audio → R2),
  marquage lu (`messages_lus`).
- ✅ **Réponses** : swipe du message vers la droite (ou menu long-press) →
  barre « Réponse à … », `parent_message_id` (récupéré en requête séparée —
  embedding self-référentiel indisponible côté PostgREST).
- ✅ **Mentions @** : bouton @ → liste des membres de la discussion (tous en
  général, membres du pupitre en chat de pupitre), insertion `@Prénom Nom`,
  stockage des ids dans `mentions`, surlignage doré dans les bulles.
- ✅ **Édition** (envoyeur, 30 min, indicateur « modifié ») et **suppression**
  (envoyeur ou chef/admin, suppression réelle — la suppression douce est
  bloquée par la RLS car la nouvelle ligne doit rester visible).

### ✅ Étape 9 — Fichiers
- Médiathèque du groupe : cible groupe/pupitre/membre (premier pupitre/membre
  présélectionné), upload fichier ou image (compressée → R2), **vue grille**
  (vignettes réelles images, tuiles vidéo/audio/PDF), **modal de détail**
  (aperçu, lecture vidéo expo-video, écoute audio, téléchargement via
  expo-file-system/sharing), suppression (uploader ou chef/admin).
- ✅ Lecteur audio intégré des fichiers (`useLecteurAudio`).
- ✅ Le chef/admin voit les fichiers partagés aux pupitres/membres
  (`est_gestionnaire_ressource` en base + filtre client).
- ✅ **Onglet Stockage** (chef seul) : donut SVG des tailles par type + total Mo.
- ✅ Corrections : embedding `uploader` désambiguïsé (double FK vers users),
  `taille_bytes` désormais remplie à l'upload, cache mis à jour
  immédiatement après envoi.

### ✅ Étape 10 — Studios
- Catalogue (filtres ville/type/tarif), fiche (photos, équipements, avis),
  réservation (créneaux, conflits, paiement simulé), mes réservations
  (annulation si pending).

### ✅ Étape 11 — Wallet / Profil
- Wallet : solde, packs, achat simulé (`crediter_wallet`), historique.
- Profil : carte + édition, notifications (marquer lu), paramètres (langue,
  devise, toggles), jobs IA (historique).

### ✅ Étape 12 — Push notifications (client)
- `src/lib/push.tsx` : `FournisseurPush` monté dans `app/_layout.tsx`.
  Permissions + canal Android `default` (importance MAX, couleur warmGold),
  `getExpoPushTokenAsync` avec le `projectId` EAS, upsert dans la table
  **`device_token`** (`user_id`, `expo_token`, `platform`, `device_label`,
  `app_version`, `last_seen_at`, `est_actif`) — conflit sur `user_id,expo_token`.
- Navigation depuis une notification : `addNotificationResponseReceivedListener`
  + `getLastNotificationResponseAsync` (lancement à froid), via `data.url`.
#### Chaîne serveur (déployée le 20/08, **non versionnée dans le dépôt**)

> Relevé via le MCP Supabase le 21/08. `send-push` et les triggers n'existent
> que sur le projet distant : à exporter dans `supabase/` un jour.

1. **10 triggers** `AFTER INSERT/UPDATE` appellent `ff_enqueue_notif()` :
   `trg_message_envoye` (+ réponse au parent), `trg_seance_creee`,
   `trg_projet_cree`, `trg_projet_termine`, `trg_ressource_ajoutee`,
   `trg_enregistrement_ajoute`, `trg_setlist_ajoute`, `trg_groupe_membre_ajoute`,
   `trg_groupe_admin_nomme`, `trg_ressource_equipe_publiee`,
   `trigger_notify_ai_job_termine`.
2. **`ff_enqueue_notif(dest[], canal, titre, body, lien_url)`** (SECURITY DEFINER) :
   insère une ligne dans `notifications` par destinataire, lit
   `push_dispatch_secret` et `supabase_functions_url` dans la table
   **`app_secrets`**, puis `net.http_post` vers `/send-push` avec l'en-tête
   `X-Push-Secret`. Les destinataires viennent de `membres_actifs_groupe()` ou
   `membres_du_pupitre()`, l'émetteur étant retiré du lot.
3. **Edge function `send-push`** (`verify_jwt: false`, protégée par le secret
   d'en-tête) : lit les `device_token` où `est_actif`, calcule le **badge =
   nombre de notifications non lues** par utilisateur, envoie à l'API Expo par
   **lots de 100**, et repasse `est_actif = false` sur les tokens rejetés en
   `DeviceNotRegistered` / `InvalidCredentials`.
4. **`app_secrets`** : RLS actif, politiques `USING (false)` — inaccessible aux
   utilisateurs authentifiés, seul le `service_role` la lit. ✅ vérifié.
5. 🔒 **Correctif du 21/08** : `ff_enqueue_notif` était exécutable par `anon`
   (droit hérité de `PUBLIC`), permettant à quiconque détenant la clé anon —
   publique, embarquée dans l'APK/IPA — d'envoyer un push au contenu arbitraire
   à n'importe quel utilisateur via `/rest/v1/rpc/ff_enqueue_notif`.
   Migrations `revoke_ff_enqueue_notif_from_public_roles` puis
   `revoke_ff_enqueue_notif_from_public`. ACL désormais
   `{postgres=X/postgres, service_role=X/postgres}`.
   ⚠️ Piège : `REVOKE … FROM anon, authenticated` **ne suffit pas**, le droit
   vient de `PUBLIC` — toujours révoquer `FROM PUBLIC` et revérifier avec
   `has_function_privilege()`, le `success: true` d'une migration ne prouve rien.
   Les triggers ne sont pas affectés : ils sont `SECURITY DEFINER` et
   appartiennent à `postgres`, qui conserve `EXECUTE`.

Le `data.url` posé par les triggers (`/groupes/<id>/chat`,
`/groupes/<id>/seances/<id>`) correspond aux routes qu'ouvre `push.tsx`.
✅ Testé et fonctionnel sur Android.

### ⏳ Étape 13 — Mode clair & i18n
- ThemeProvider light/dark, strings fr/en/wo/ln.

### 🟡 Étape 14 — Offline & build
- ✅ **EAS** : `eas.json` avec 3 profils (`development` client de dev,
  `preview` APK interne, `production` app-bundle), chacun sur son canal.
- ✅ **iOS / TestFlight (21/08)** : App ID `com.soundboss.app` créé, credentials
  EAS générés (certificat de distribution, profil de provisioning, **clé APNs**),
  build `production` 1.0.0 (build 1) soumis et distribué aux testeurs internes.
  Entitlements vérifiés dans l'IPA : `aps-environment: production`,
  `beta-reports-active: true`, `get-task-allow: false`.
  Config iOS préparée dans `app.json` : chaînes de permission en français
  (micro, photos), `NSCameraUsageDescription` retirée (caméra non utilisée),
  `ITSAppUsesNonExemptEncryption: false`, `autoIncrement` sur le profil
  production (évite le rejet pour numéro de build dupliqué).
  ⏳ Reste à confirmer : réception d'un push sur un iPhone TestFlight.
- ✅ **expo-updates** : plugin + `runtimeVersion: appVersion` + URL
  `u.expo.dev/cc17c254-…` dans `app.json` ; `google-services.json` en place ;
  bundle `com.soundboss.app` (iOS + Android).
- ⏳ **Offline-first** : pas encore de persistance React Query
  (`@tanstack/query-async-storage-persister` + `persistQueryClient`). Le
  `gcTime: 24 h` est déjà posé dans `app/_layout.tsx`, il manque le persister.

## 4 bis. Monétisation par crédits (modèle pay-as-you-go)

> Cible ouest-africaine : petites dépenses en mobile money (Wave, Orange
> Money, MTN MoMo), pas d'abonnement. Les crédits s'achètent par packs et se
> consomment par opération. Infrastructure déjà en base : `credit_packs`,
> `credit_tarifs`, `wallets`, `wallet_transactions`, `paiements`,
> `revenus_plateforme`, `ai_jobs`, `ai_creations`, `ressources_traitees`.

> **Statut au 20/08 — non implémenté.** Seuls existent : l'achat de packs dans
> `app/wallet.tsx` (`crediter_wallet`, paiement simulé), l'historique des
> transactions et l'écran `app/profil/jobs-ia.tsx` (lecture seule). **Aucune
> fonctionnalité ne consomme de crédits** : pas de Labo Audio / IA, pas de
> grille tarifaire affichée, pas de quota de stockage payant, pas de
> masterclass. C'est le principal chantier restant (étape 16).

**Fonctionnalités payantes proposées**

1. **IA musicale & Labo Audio** (cœur) — tarif par opération (`ai_jobs` /
   `ressources_traitees`) : grille indicative — analyse BPM/tonalité = 1-2
   crédits (prix d'appel), détection d'accords = 3-5, audio→MIDI = 5-8,
   séparation stems = 15-20, mastering = 10-15, pitch/time-stretch = 5-10,
   génération musique/paroles/instrumental/cover = 30-50, cover art = 10.
2. **Stockage des groupes** — quota gratuit par groupe (ex. 500 Mo), puis
   paliers payants (ex. 1 Go = 20 crédits). L'onglet Stockage (chef) affiche
   déjà la consommation.
3. **Masterclass / formations** — achat à l'unité en crédits (accès à vie),
   pas d'abonnement.
4. **Fonctions « pro » à la carte** — limite de groupes gratuits (ex. 3,
   puis X crédits par groupe supplémentaire), export PDF des rapports /
   partitions, stats d'assiduité avancées (export), visuels premium.

**À garder gratuits (rétention)**
- Chat / messagerie (cœur réseau), notifications push & rappels,
  réservations studios (commission via `paiements` à la place),
  marketplace (commission de vente via `revenus_plateforme`).

**Mécaniques adaptées au marché**
- Packs petits (500-2 000 FCFA) payables en mobile money, en 1 clic.
- Crédits de bienvenue + parrainage + bonus hebdo ; crédits valables
  longtemps, affichage du coût avant chaque action + confirmation
  (les boîtes de dialogue custom existent déjà).
- Grille tarifaire claire dans l'app ; packs étudiants/promos week-end.

## 4 ter. Reporté au lot D

- **Téléchargement natif Android** : le bouton Télécharger ouvre aujourd'hui la
  feuille de partage système sur les deux plateformes. Décision du 31/08 :
  garder le partage sur iOS (où aucun dossier utilisateur n'existe) et écrire
  réellement dans Téléchargements sur Android — via `expo-media-library` ou le
  Storage Access Framework, donc une dépendance native de plus.

## 4 quater. Labo audio — mesure de faisabilité (31 août 2026)

Mesuré sur **Pocophone F1 (2018)**, build preview, `react-native-audio-api@0.12.0`,
sur `06 – Special Moments.mp3` : 307 s annoncés en base, 11,7 Mo sur disque.

| Voie | Temps | Mémoire | Résultat |
|---|---|---|---|
| `decodeAudioData(url)` natif | 5292 / 5905 / 5673 ms | 103,2 Mo | 306,8 s, 2 canaux, 44 100 Hz |
| `decodeAudioData(url, 22050)` | 5427 / 6474 ms | 51,6 Mo | 306,8 s, 2 canaux, 22 050 Hz |
| `StreamerNode({ streamPath })` | — | — | **muet, écourté, ferme l'app** |

Trois enseignements :

1. **Le décodage complet tient**, y compris trois fois de suite sur un appareil
   de 2018. Écart de durée avec la base : 0,2 s — rien n'est tronqué.
2. **Rééchantillonner ne fait pas gagner de temps.** L'hypothèse de départ était
   qu'un contexte à 22 050 Hz décoderait plus vite ; c'est l'inverse, le
   rééchantillonnage coûte au moins ce qu'il économise. Le levier ne sert qu'à
   diviser la mémoire par deux, et reste disponible si des appareils à 2 Go
   remontent des fermetures.
3. **`StreamerNode` est inexploitable en 0.12.0** avec une URL R2 signée. Peu
   importe : n'étendant pas `AudioBufferBaseSourceNode`, il n'a ni `playbackRate`
   ni `detune`, donc il n'aurait jamais porté le labo.

**Correctif du 31 août, après essai à l'oreille :** décoder à la fréquence du
*fichier* fait jouer trop vite. `getComputedPlaybackRateValue` ne renvoie que
`playbackRate * detune`, sans terme de rapport de fréquences : l'index de lecture
avance d'un échantillon du tampon par image de sortie du contexte. Un fichier à
44 100 Hz dans un contexte à 48 000 Hz sortait donc 1,088x trop vite, soit un
demi-ton et demi trop haut. Il faut décoder à `contexte.sampleRate`.

Décision : **tampon décodé à la fréquence du contexte, un seul vivant à la fois**,
gardé en cache d'une ouverture à l'autre pour éviter de repayer les cinq secondes,
et relâché à l'ouverture d'un autre morceau ou au passage en arrière-plan.
Le vrai coût n'est pas la mémoire mais les ~5,5 s d'attente à la première
ouverture, qui imposent un état de chargement explicite et interdisent de faire
du labo le geste d'écoute par défaut.

## 4 quinquies. Détection de tonalité — confrontation à l'oreille (1er sept. 2026)

Profils de Krumhansl-Schmuckler dans le conteneur, comparés au relevé du chef
de groupe.

| Morceau | Réel | Détecté | Confiance | |
|---|---|---|---|---|
| HOSANNA reprise | Sol majeur | Sol majeur | 0,062 | exact |
| DEBOUT | Mi majeur | Mi majeur | 0,062 | exact |
| ABBA | Ré majeur | Ré majeur | 0,097 | exact |
| JE VEUX VIVRE | Do puis Do# majeur | Sol# majeur | 0,090 | faux |
| Audio du micro (7 s) | Sol mineur | Sol majeur | 0,216 | mode faux |

**Trois exactes sur quatre vrais morceaux.** Le raté module en cours de route :
aucune détection à réponse unique ne peut avoir raison sur une pièce qui change
de tonalité, et Sol# est la dominante de Do#, pas une valeur au hasard.

Tempo : 96/96, 130/132, 124/126, 170/173 — moins de 2 % d'écart.

**La confiance, en revanche, ne prédit rien.** Les deux valeurs les plus basses
correspondent à des réponses justes, la plus haute à une fausse. Le bandeau
« détection incertaine » sous 0,05 aurait donc désigné les bonnes réponses et
laissé passer les mauvaises : il a été retiré. La colonne reste alimentée, mais
aucune décision ne s'y appuie tant qu'elle n'est pas calibrée sur plus de
matière.

Décision : **on garde la détection maison**, Fadr réservé aux stems.

## 4 sexies. Lot E3 — égaliseur graphique (2 sept. 2026)

Dix bandes par octave — 31, 62, 125, 250, 500, 1K, 2K, 4K, 8K, 16K — insérées
entre la source et le gain de sortie. Première en `lowshelf`, dernière en
`highshelf`, les huit autres en `peaking` (Q = 1).

Gain limité à ±15 dB alors que le natif accepte ±40 : au-delà, un égaliseur ne
corrige plus, il détruit.

Rendu en SVG (tracé, tiges, pastilles, graduations) mais **gestes pris par des
vues natives superposées** : un PanResponder sur un élément SVG se négocie mal,
et les poignées de la boucle A/B avaient déjà coûté trois tentatives sur ce
terrain. Chaque colonne est saisissable sur toute sa hauteur — viser une
pastille de neuf pixels au pouce serait intenable.

Le contournement met les bandes à plat au lieu de démonter la chaîne :
débrancher des nœuds en cours de lecture produit un claquement.

Le volume de sortie (±12 dB) pilote le `GainNode` terminal, converti en gain
linéaire : +6 dB double l'amplitude.

Les extrêmes sont en plateau et non en cloche — relever la brillance doit
relever tout ce qui est au-dessus de 12 kHz, pas creuser une bosse autour.

La chaîne reste montée même à plat : un biquad coûte quelques multiplications
par échantillon, bien moins que de recâbler le graphe à chaque réglage. Le gain
s'écrit à chaud, donc aucune coupure — contrairement au tempo, qui peut franchir
la frontière de `pitchCorrection` et impose alors un nœud neuf.

Le clic du métronome reste branché sur la destination : il traverse la boucle de
travail sans être filtré avec elle.

## 4 septies. Échec de build iOS — SDK trop ancien pour audio-api (2 sept. 2026)

```
use of undeclared identifier 'AVAudioSessionModeDualRoute'
use of undeclared identifier 'AVAudioSessionCategoryOptionFarFieldInput'
```

`react-native-audio-api` garde ces deux symboles par `@available(iOS 26.2, *)`
dans `ios/audioapi/ios/system/AudioSessionManager.mm`. Le piège : `@available`
protège l'**exécution**, jamais la **compilation** — le symbole doit exister
dans le SDK contre lequel on compile, quelle que soit la version visée à
l'exécution.

L'image `auto` d'EAS choisit `macos-sequoia-15.6-xcode-26.0` pour un projet
SDK 54, et le SDK iOS 26.0 ne déclare pas ces symboles. Correctif : épingler
`macos-sequoia-15.6-xcode-26.2`, la **première** image dont le SDK les contient.
Pas la plus récente : s'éloigner davantage de l'image testée par Expo pour le
SDK 54 ajouterait du risque sans rien résoudre.

Android n'était pas touché — ce code est spécifique à iOS, ce qui explique que
tous les builds preview soient passés.

Repli si Xcode 26.2 cassait autre chose : patcher le fichier pour retirer les
deux branches, que le labo n'utilise pas.

## 4 octies. Tonalité par tranches (5 sept. 2026)

Confrontation à l'oreille sur six morceaux, après le relevé du chef de groupe :

| Morceau | Réel | Détecté | |
|---|---|---|---|
| HOSANNA reprise | Sol majeur | Sol majeur | exact |
| DEBOUT | Mi majeur | Mi majeur | exact |
| ABBA | Ré majeur | Ré majeur | exact |
| HOSANNA.wma | Mi → **Fa#** majeur | Fa# majeur | la seconde des deux |
| JE VEUX VIVRE | Do → Do# majeur | Sol# majeur | faux |

**Quatre exactes sur quatre morceaux qui ne modulent pas ; les deux seuls
échecs sont les deux qui modulent.** Ce n'est pas une faiblesse diffuse de la
méthode mais une limite nommée : une case unique ne peut pas décrire une pièce
qui change de tonalité. Un tiers du corpus le fait — le gospel monte volontiers
d'un ton au dernier refrain.

Le conteneur accumule désormais le chromagramme **par tranches de 30 s** et
détecte sur chacune. Un seul parcours du signal sert les deux usages :
additionnées, les tranches donnent la tonalité dominante ; séparées, la
chronologie, écrite en JSONB dans `tonalite_sections`.

Deux règles de lissage, qui ne sont pas cosmétiques : une tranche muette hérite
de la précédente (un pont sans harmonie suspend la tonalité, il ne la change
pas), et une tonalité isolée entre deux voisines identiques est écartée — une
modulation dure, c'est ce qui la distingue d'un accord de passage mal
interprété.

Côté labo, la tonalité d'origine **suit la section jouée** et le résumé annonce
la modulation (« Mi majeur, puis Fa# majeur à 3:00 »). Une correction manuelle
l'emporte et fige l'origine.

Le JSONB est **validé** à la lecture, jamais converti de force : la colonne peut
contenir un schéma d'une version antérieure du conteneur.

**Absorption des dominantes (5 sept., après mesure).** La première chronologie
produisait des sections parasites. Sur cinq morceaux dont la tonalité était
relevée à l'oreille :

| Morceau | Réel | Chronologie brute |
|---|---|---|
| HOSANNA reprise | Sol | ~~Ré~~ → Sol |
| ABBA | Ré | Ré → ~~La~~ → Ré |
| DEBOUT | Mi | Mi → ~~Si~~ → ~~Si min~~ → Mi |
| HOSANNA.wma | Mi → Fa# | Mi → ~~Si~~ → ~~Do#~~ → Fa# |
| JE VEUX VIVRE | Do → Do# | ~~Sol~~ → ~~Sol#~~ → Do# |

**Les huit sections parasites étaient toutes exactement la dominante d'une
vraie tonalité.** Aucune exception. Quand l'harmonie s'installe sur le cinquième
degré pendant une minute, une tranche de trente secondes y voit une tonalité à
part entière.

La confiance ne permet pas de les écarter : une parasite à 0,155 dépassait une
vraie à 0,11. C'est la troisième fois que cet indicateur se révèle inutilisable.

Règle retenue : absorber une section dans sa voisine quand elle en est la
dominante, en privilégiant la voisine la plus sûre. Risque assumé — effacer une
modulation réelle vers la dominante — écarté par le répertoire : les deux
modulations relevées montent d'un demi-ton et d'un ton, jamais d'une quinte.

Résultat après redéploiement : les quatre morceaux stables rendent **une seule
section**, et HOSANNA.wma rend exactement Mi puis Fa#. JE VEUX VIVRE garde une
première section fausse (Sol au lieu de Do) : Sol est bien la dominante de Do,
mais aucune section en Do n'a jamais été détectée, donc rien ne peut l'absorber.

**Correctif des bornes.** La première version attribuait les tranches absorbées
à la section *précédente*. Sur HOSANNA.wma, la région en Do# — dominante de Fa#
— revenait donc à Mi, et la modulation était annoncée à 4:00 au lieu de 2:30.
Une section absorbée rejoint désormais les bornes de celle qui l'absorbe.

**Validation finale, six morceaux confrontés à l'oreille du chef de groupe :**

| Morceau | Réel | Détecté | |
|---|---|---|---|
| HOSANNA reprise | Sol | Sol | exact |
| ABBA | Ré | Ré | exact |
| DEBOUT | Mi | Mi | exact |
| HOSANNA.wma | Mi → Fa# à 2:30 | Mi → Fa# à 150 s | exact, borne comprise |
| 02 Piste 2 | Mib → Fa → Sol | Mib → Fa → Sol | exact, trois modulations |
| JE VEUX VIVRE | Do → Do# | Sol → Do# | première section fausse |

Cinq sur six. Le seul échec restant tient à ce que la tonalité de Do n'a jamais
été détectée nulle part : rien ne pouvait absorber sa dominante.

`02 Piste 2` est la validation la plus forte de la règle d'absorption — trois
modulations légitimes, toutes conservées. C'était le morceau où un faux positif
aurait pu passer inaperçu.

**Enseignement de répertoire, donné par le chef de groupe :** enchaîner
plusieurs tonalités pour donner de la vivacité est une pratique courante du
gospel. La chronologie n'est donc pas un raffinement pour cas particulier, c'est
le cas normal de ce corpus — et la case unique était le vrai défaut.

## 4 nonies. Lot E4 — premiers essais réels de séparation (5 sept. 2026)

Trois essais sur `HOSANNA reprise.mp3` (1 min 42), ~0,09 $ la tâche.

| Essai | Résultat | Enseignement |
|---|---|---|
| 1 | tâche terminée, **zéro stem** | les identifiants vivent sur l'**asset source** (`asset.stems`), pas dans `output.assets` de la tâche |
| 2 | cinq stems, tous typés `inconnu`, **une seule clé R2** | `GET /assets/{id}` **enveloppe** l'asset ; et cinq types identiques écrasaient le même fichier |
| 3 | cinq stems nommés, cinq clés distinctes | la chaîne fonctionne |

**Types réellement produits par `main`** — et la documentation se trompe sur le
quatrième :

| Type | Taille (102 s, mono 64 kbit/s) |
|---|---|
| `vocals` | 797 Ko |
| `bass` | 794 Ko |
| `drums` | 814 Ko |
| **`other`** (doc : « melodies ») | 804 Ko |
| `instrumental` | 812 Ko |

`STEM_TYPES` accepte donc plusieurs noms de parent par découpe : sans cela,
l'affinage `melodic-stem` n'aurait jamais trouvé son stem source.

**Deux défauts de ma part, tous deux invisibles sans essai réel :** un statut
`pret` écrit avec zéro stem — un succès vide ne se remarque pas, il lève
désormais une erreur — et un écrasement silencieux dans R2, exactement le
danger décrit dans le commentaire de `derivedKey` et réintroduit ailleurs. Les
clés portent maintenant un suffixe tiré de l'identifiant de l'asset.

**Projection mémoire confirmée.** 800 Ko pour 102 s en mono 64 kbit/s ; un
morceau de cinq minutes donnera ~2,4 Mo par stem, soit ~26 Mo décodé. Cinq
stems ensemble : ~130 Mo, l'ordre de grandeur d'un seul morceau stéréo
aujourd'hui. Le plafond exact reste à mesurer sur appareil.

## 4 decies. Mémoire des pistes séparées — mesure du 5 sept. 2026

Cinq stems de `HOSANNA reprise.mp3` (102 s) chargés ensemble : **93 Mo**, et le
Pocophone F1 tient.

**Enseignement contre-intuitif :** les stems sont stockés en mono 22 050 Hz,
mais ils sont décodés à `contexte.sampleRate`, soit 48 000 Hz — le moteur natif
ne rééchantillonne pas, correctif du lot E1. **Le mono économise le stockage et
la bande passante, jamais la mémoire décodée.**

Coût réel : ~0,9 Mo par seconde de morceau pour cinq pistes. Donc :

| Durée | Cinq pistes en mémoire |
|---|---|
| 102 s | 93 Mo (mesuré) |
| 245 s | ~220 Mo |
| 300 s | ~275 Mo |
| 488 s | ~450 Mo |

Mesure confirmée sur `PARDONNE NOUS.mp3` (245 s) : **225 Mo**, contre les
~220 prévus. La projection tient.

Au-delà de trois ou quatre minutes, cinq pistes simultanées deviennent
intenables sur un appareil modeste. Le plafond ne peut donc pas être un nombre
fixe de pistes : il dépend de la durée.

**Solution retenue : charger les pistes à la carte.** Chacune se décode quand on
l'active et libère sa place quand on la désactive, avec un plafond de 250 Mo —
posé un peu au-dessus de la plus haute valeur *vérifiée*, jamais d'une valeur
supposée. La première piste passe toujours, même très longue : refuser la seule
piste demandée rendrait la fonction inutilisable sur un morceau long, alors
qu'une piste seule reste parfaitement jouable.

L'usage courant réclame d'ailleurs une ou deux pistes, pas cinq : chanter sur
l'`instrumental`, ou isoler la basse pour la travailler.

## 5. Commandes utiles

```bash
npm run start        # expo start (QR code / dev)
npm run ios          # simulateur iOS
npm run android      # émulateur Android
npm run lint         # eslint
npx expo prebuild    # génère android/ios natifs (avant build EAS)
npx expo install <pkg>   # installer une dep (versions compatibles SDK 54)
```

## 4 undecies. Plafond mémoire validé et décalage à l'ajout d'une piste (5 sept. 2026)

**447 Mo tiennent**, sur Pocophone F1 comme sur Tecno Camon 50 Pro : les cinq
pistes de `02 Piste 2` (488 s) se lisent sans ralentissement. Le plafond de
460 Mo est donc vérifié, plus supposé.

**Décalage à l'ajout d'une piste, sur un morceau long seulement.** Cause :
`positionRef` est alimentée par `onPositionChanged`, dont les événements sont
traités sur le fil JavaScript. Décoder un stem de huit minutes le bloque
plusieurs secondes, et la valeur devient périmée d'autant — la lecture repartait
donc en arrière. Sur ALLELUIA (196 s) le décodage est trop bref pour que ça se
voie.

Correctif : calculer la position sur **l'horloge du contexte audio**, qui ne
cale jamais, à partir de l'instant de démarrage et de l'offset. `positionRef`
reste pour l'affichage et pour le cas d'une boucle, qu'un calcul linéaire ne
sait pas décrire.

**Ce correctif n'a pas suffi, et la vraie cause était ailleurs.** Ajouter une
piste arrêtait les cinq sources pour les recréer toutes. Chaque recréation coûte
des dizaines de millisecondes — avec un étireur temporel à allouer quand la
correction de hauteur est active — et les dernières rataient le rendez-vous
commun de 150 ms.

Le motif recommandé par les implémentations Web Audio multipistes est de
**greffer la nouvelle source sans toucher aux autres**, à un offset calculé pour
l'instant du rendez-vous : `position courante + marge × tempo`. Le retrait ne
stoppe que la source concernée.

Vérifié le 5 septembre sur Pocophone F1 : les cinq pistes de `02 Piste 2`
(488 s), instrumental compris, s'activent en cours de lecture sans décalage.

**L'instrumental ne se cumule pas avec les autres.** Ce n'est pas un instrument
mais le mixage de tout sauf la voix : le jouer avec la basse, la batterie et les
mélodies ferait entendre chacune deux fois. « Tout activer » l'exclut donc.

## 4 duodecies. À faire plus tard — écoute des loops de la bibliothèque

Le labo est atteignable depuis tout audio de l'application : audios de
répétition par le lecteur, fichiers de groupe, fichiers personnels et messages
vocaux du chat par la modale de détail.

Une surface reste à l'écart : les **ressources d'équipe**, qui n'offrent
aujourd'hui qu'un téléchargement. Les ressources de type `loop` **sont** des
audios et méritent une écoute — décision du chef de groupe, 5 septembre 2026.

À faire : ajouter un bouton d'écoute sur les ressources dont le type est `loop`
(et vérifier si `style` en est un aussi), ouvrant le labo sans onglet Pistes,
comme pour un fichier de groupe.

## 4 terdecies. Affinage de second niveau — état au 5 sept. 2026

**Serveur : écrit, jamais éprouvé.** Les quatre types de découpe sont en place
(`main`, `vocal-stem`, `melodic-stem`, `drum-stem`), la hiérarchie est portée
par `enregistrement_stems.parent_id`, la RPC contrôle que le stem parent existe
avant d'engager la dépense, et le quota journalier s'applique.

**Un bug corrigé avant tout essai :** `separerStems` envoyait à Fadr le
**morceau complet** quel que soit le type demandé. Or `drum-stem` attend un
fichier ne contenant que de la batterie. Un affinage aurait découpé le mixage
entier et facturé une tâche pour un résultat absurde. La source est désormais
le stem parent.

**Premier affinage réel réussi (5 sept.).** `drum-stem` sur HOSANNA reprise a
produit `kick`, `snare` et **`drums-other`** — la documentation annonçait
« other drums ». Deuxième écart de nommage après `other` pour « melodies ».

Fadr accepte de redécouper un asset qu'il détient déjà : aucun téléversement,
aucune perte de qualité, et les assets ne sont pas expirés. La conservation
d'une copie pleine dans R2 devient donc inutile pour cet usage.

**Taxonomie réelle, établie par l'essai le 5 septembre — seize stems.** La
documentation de Fadr se trompe sur **six noms sur seize** : elle emploie des
formes longues là où l'API préfixe par le parent.

| Parent | Types réellement produits | Annoncés par la doc |
|---|---|---|
| *(morceau)* | `vocals`, `bass`, `drums`, **`other`**, `instrumental` | « melodies » pour `other` |
| `vocals` | **`vocals-lead`**, **`vocals-background`** | « lead vocals », « background vocals » |
| `drums` | `kick`, `snare`, **`drums-other`** | « other drums » |
| `other` | `piano`, **`electric`**, **`acoustic`**, `strings`, `wind`, **`melodics-other`** | « electric guitar », « acoustic guitar », « other melodies » |

Treize feuilles, trois parents redécoupés. Les deux formes sont traduites dans
`libelleStem`, l'API pouvant changer d'avis, et un type inconnu reste affiché
tel quel — c'est ce qui a permis de découvrir ces écarts sans rien casser.

**Client : rien.** Aucun point d'entrée n'existe pour demander un affinage —
`useDemanderStems` accepte le type mais l'interface envoie toujours `main`, et
la liste des pistes ne montre pas la hiérarchie.

À faire côté client : une action « Affiner » sur les stems éligibles — voix,
batterie, mélodies —, l'affichage des enfants sous leur parent, et un avertissement
de coût : chaque affinage est une tâche facturée au même tarif à la minute, et
un stem dure aussi longtemps que le morceau.

**Réserve de qualité :** les stems sont stockés en mono 22 050 Hz. Un affinage
repart donc d'une source dégradée, là où la découpe principale part du fichier
d'origine. À évaluer sur un premier essai réel.

## 4 quaterdecies. Répartition coût / stockage (décision du 5 sept. 2026)

Deux notions distinctes, à ne pas confondre quand le système de crédits sera
construit :

| | Imputé à |
|---|---|
| **Coût** d'une extraction ou d'un affinage | le **demandeur**, sur ses crédits — colonne `stems_demandeur` |
| **Stockage** des fichiers produits | le **groupe** propriétaire de la répétition |

Un membre qui extrait seize pistes paie l'opération, mais les fichiers pèsent
sur le quota du groupe — qui les possède et dont tous les membres profitent.

Le stockage personnel ne compte donc que les fichiers propres et les
répétitions sans groupe.

**Correctif du même jour :** le calcul de stockage ne portait que sur les
fichiers partagés. Il ignorait les audios de répétition et les pistes
extraites, de loin les plus lourds — seize pistes de `HOSANNA reprise` font
13 Mo pour un morceau de 2,6 Mo. L'agrégation vit désormais dans
`src/lib/stockage.ts`, testée, et sert les deux espaces.

## 4 quindecies. Modèle de facturation par crédits (vision du 5 sept. 2026)

**Unité :** 1 crédit = **100 F CFA** ≈ 0,17 $ (à 600 XOF pour 1 USD).

### Packs de crédits

| Pack | Prix | Le crédit | Remise |
|---|---|---|---|
| 5 crédits | 500 F | 100 F | — |
| 10 crédits | 1 000 F | 100 F | — |
| 22 crédits | 2 000 F | 90,9 F | 9 % |
| 60 crédits | 5 000 F | 83,3 F | 17 % |

### Opérations payantes

**Extraction et affinage de pistes : 1 crédit par minute d'audio**, un affinage
étant facturé comme une extraction — c'est aussi ce que fait Fadr.

Marge vérifiée sur le corpus réel, Fadr coûtant 0,05 $ la minute :

| Morceau | Durée | Facturé | Coût | Rapport |
|---|---|---|---|---|
| HOSANNA reprise | 1,70 min | 2 cr = 0,33 $ | 0,085 $ | ×3,9 |
| ALLELUIA | 3,27 min | 4 cr = 0,67 $ | 0,164 $ | ×4,1 |
| PARDONNE NOUS | 4,08 min | 5 cr = 0,83 $ | 0,204 $ | ×4,1 |
| 02 Piste 2 | 8,13 min | 9 cr = 1,50 $ | 0,407 $ | ×3,7 |

**Stockage.** 1 Go offert par groupe, 500 Mo par utilisateur. Au-delà, extension
mensuelle payée en crédits :

| Volume | Crédits/mois | Revenu | Coût R2 | Rapport |
|---|---|---|---|---|
| 20 Go | 5 | 0,83 $ | 0,30 $ | ×2,8 |
| 50 Go | 10 | 1,67 $ | 0,75 $ | ×2,2 |
| 100 Go | 18 | 3,00 $ | 1,50 $ | ×2,0 |
| 500 Go | 80 | 13,33 $ | 7,50 $ | ×1,8 |

**Le reste** — ressources payantes, masterclass, produits à venir — affiche son
prix en crédits.

**Règle de répartition** (arrêtée le même jour) : le **coût suit le demandeur**,
qui paie sur ses crédits ; le **stockage suit le groupe**, propriétaire des
fichiers.

### Ce que les chiffres révèlent, et qu'il faudra trancher

**Le palier gratuit se remplit vite dès qu'on extrait.** Mesures réelles : un
morceau de quatre minutes pèse ~4 Mo, ses cinq pistes ~10 Mo de plus, son arbre
complet ~32 Mo.

| Contenu | 1 Go (groupe) | 500 Mo (perso) |
|---|---|---|
| morceaux seuls | 256 | 128 |
| + 5 pistes | 73 | 37 |
| + arbre complet | 28 | 14 |

Un groupe qui décompose systématiquement ses morceaux sature son gigaoctet en
une trentaine de titres.

**Deux tensions à résoudre avant de construire :**

1. **On facture l'extraction, puis le stockage qu'elle crée.** C'est défendable,
   mais il n'existe aujourd'hui **aucun moyen de supprimer des pistes**. Si le
   stockage devient payant, la suppression cesse d'être un confort pour devenir
   une nécessité — sinon la seule issue d'un groupe saturé est de payer.

2. **La marge du stockage se contracte quand le volume monte** (×2,8 à 20 Go,
   ×1,8 à 500 Go), là où les packs de crédits font l'inverse en accordant une
   remise aux gros volumes. Un gros client cumulerait donc les deux effets. À
   vérifier que 500 Go à 80 crédits reste soutenable.

**Questions ouvertes :**

- **Arrondi** de la facturation à la minute : à la minute supérieure ? Les
  chiffres ci-dessus le supposent, et c'est ce qui protège la marge sur les
  morceaux courts.
- **Prélèvement mensuel** du stockage : quel comportement si le solde est
  insuffisant ? Délai de grâce, passage en lecture seule, suppression ? Aucune
  de ces réponses n'est neutre pour un groupe qui perdrait l'accès à ses
  répétitions.
- **Décompte du stockage** : le quota se mesure-t-il sur le total courant ou sur
  un pic mensuel ?

## 6. Notes & pièges

### Une clé étrangère de plus casse l'imbrication PostgREST (5 sept. 2026)

Ajouter `stems_demandeur uuid references users(id)` a vidé la liste des audios
de répétition, pour tout le monde, chef compris.

Cause : `seance_enregistrements` avait déjà `uploaded_by` vers `users`. Avec
deux clés étrangères vers la même table, PostgREST ne peut plus résoudre
`uploader:users(...)` et répond **300 Multiple Choices**. La requête échouait,
et comme elle ignorait son `error` en rendant `data ?? []`, la liste
s'affichait vide sans le moindre message.

Deux leçons, et la seconde compte plus que la première :

1. **Nommer la clé étrangère dès qu'une table en a plusieurs vers la même
   cible** : `users!seance_enregistrements_uploaded_by_fkey(...)`. Le projet le
   faisait déjà dans `ressources.ts` — l'idiome existait, il n'a pas été suivi.
2. **Ne jamais avaler l'erreur d'une requête.** Aucun test, aucun `typecheck`,
   aucun lint ne pouvait attraper ceci : la casse est dans l'inférence de
   relations de PostgREST, côté serveur. Seul le `throw` la rend visible.

Le symptôme est resté invisible jusqu'à ce qu'un utilisateur le signale, et le
diagnostic est venu des logs Supabase — un `GET | 300` sur la seule requête qui
n'apparaissait nulle part ailleurs.


- **Auth mobile** : session persistée dans SecureStore (jamais AsyncStorage
  pour les tokens) ; `detectSessionInUrl: false`.
- **Upload R2** : mêmes edge functions que le web (JWT requis) ; RN envoie un
  Blob (fetch(uri) → blob) en PUT direct ; CORS déjà réglé (web).
- **Realtime** : publication `supabase_realtime` déjà active sur `messages`
  (voir `supabase/realtime.sql`).
- **RPC** : mêmes fonctions SECURITY DEFINER que le web (format JSON
  `{success, message, data}`) — réutilisées telles quelles.
- **Types** : `src/lib/database.types.ts` à régénérer après chaque migration
  (MCP Supabase → generate_typescript_types).
  ⚠️ Le générateur **omet les fonctions surchargées** : `ajouter_morceau_setlist`
  existe en deux versions (5 et 7 arguments) et disparaît donc des types sans
  que rien ne soit cassé (PostgREST résout vers celle à 7 arguments, `tsc` passe).
  Supprimer la surcharge obsolète assainirait la situation.
- **Orientation** : portrait uniquement, edge-to-edge Android activé.

- **⚠️ Versions natives Expo — crash au lancement des builds EAS (21/08)** :
  l'APK `preview` s'ouvrait sur le splash puis se fermait aussitôt.
  Cause : `expo-audio@1.1.1` déclare `expo-asset: "*"` en **peerDependency sans
  borne** ; npm (auto-install des peers) a donc installé le **dernier**
  `expo-asset` publié — `57.0.11`, d'une future ligne SDK — et l'a hissé à la
  racine de `node_modules`, alors que le SDK 54 attend `~12.0.13`.
  L'autolinking liant la version hissée, le natif plantait à l'init de React :
  `NoClassDefFoundError: expo.modules.kotlin.types.AnyTypeCache` depuis
  `AssetModule.kt:125` — classe inexistante dans `expo-modules-core@3.0.30`.
  **Correctif** : `expo-asset` épinglé en dépendance directe (`~12.0.13`),
  tout l'arbre est dédupliqué dessus.
  **À retenir** : `npx expo install --check` **ne détecte pas** ce cas (il
  n'inspecte que les dépendances *directes*). Après tout `npm install`,
  vérifier `npm ls expo-asset` — plus généralement se méfier des peers `"*"`.
  Diagnostic reproductible sans téléphone : télécharger l'APK EAS, l'installer
  sur un émulateur (`adb install`), lancer et lire `adb logcat` (`FATAL EXCEPTION`).
  ✅ **Corrigé et vérifié le 21/08** : build `preview` installé sur appareil
  réel — l'app démarre, la connexion et l'affichage fonctionnent.
