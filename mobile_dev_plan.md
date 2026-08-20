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
| 12 | Push notifications (expo-notifications, tokens, rappels) | ⏳ à faire |
| 13 | Mode clair + i18n (fr/en/wo/ln) | ⏳ à faire |
| 14 | Offline-first (cache React Query persistant) + EAS build | ⏳ à faire |

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

### ⏳ Étape 12 — Push notifications
- expo-notifications : token device → table `push_tokens` (user_id, token,
  plateforme), envoi via edge function `send-push` (service_role) déclenchée
  par triggers DB (nouveau message, séance, rappel).

### ⏳ Étape 13 — Mode clair & i18n
- ThemeProvider light/dark, strings fr/en/wo/ln.

### ⏳ Étape 14 — Offline & build
- Persistance React Query (AsyncStorage), EAS build (dev/prod profiles),
  notifications distantes Android/iOS.

## 4 bis. Monétisation par crédits (modèle pay-as-you-go)

> Cible ouest-africaine : petites dépenses en mobile money (Wave, Orange
> Money, MTN MoMo), pas d'abonnement. Les crédits s'achètent par packs et se
> consomment par opération. Infrastructure déjà en base : `credit_packs`,
> `credit_tarifs`, `wallets`, `wallet_transactions`, `paiements`,
> `revenus_plateforme`, `ai_jobs`, `ai_creations`, `ressources_traitees`.

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
- **Orientation** : portrait uniquement, edge-to-edge Android activé.
