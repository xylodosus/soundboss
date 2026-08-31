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

## 5. Commandes utiles

```bash
npm run start        # expo start (QR code / dev)
npm run ios          # simulateur iOS
npm run android      # émulateur Android
npm run lint         # eslint
npx expo prebuild    # génère android/ios natifs (avant build EAS)
npx expo install <pkg>   # installer une dep (versions compatibles SDK 54)
```

## 6. Notes & pièges

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
