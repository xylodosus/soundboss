# Graph Report - /Users/donatienkone/Documents/App Dev/zikmaster/mobile  (2026-08-31)

## Corpus Check
- 63 files · ~108,754 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 950 nodes · 2144 edges · 83 communities (35 shown, 48 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 124,641 input · 0 output

## Community Hubs (Navigation)
- Authentification & formulaires
- Chat temps réel & mentions
- Worker média (analyse, BPM, waveform)
- Projets, morceaux & groupes
- Dépendance _layout.tsx
- Configuration Expo (app.json)
- Groupes : invitations & pupitres
- Layout racine & fichiers
- Studios & réservations
- Outillage et dépendances de dev
- Tâches & assiduité
- Onglets, profil & notifications
- Dépendances du worker
- Fichiers personnels & dossiers
- Configuration TypeScript
- Périmètre de typage
- Médiathèque de groupe
- Chat : données & conversations
- Lot A — corrections rapides
- Onboarding & push client
- Identité visuelle & icônes
- Traitement audio du worker
- Lot B — robustesse de session
- CI/CD et déploiement Bunny
- Dépendances runtime Expo
- Lots C & D — audios et container
- Upload R2 & compression
- Ressources d'équipe & client Supabase
- Adaptation du worker
- Comptage des écoutes
- Détection BPM & monétisation
- Dépendance eslint.config.js
- Dépendance Expo app scaffold (create-expo-app)
- Dépendance Rule: read Expo SDK 54 versioned docs before coding
- Dépendance country-flag-icons
- Dépendance date-fns
- Dépendance date-fns-tz
- Dépendance expo
- Dépendance expo-asset
- Dépendance expo-audio
- Dépendance expo-clipboard
- Dépendance expo-constants
- Dépendance expo-device
- Dépendance expo-document-picker
- Dépendance expo-file-system
- Dépendance expo-font
- Dépendance @expo-google-fonts/plus-jakarta-sans
- Dépendance expo-haptics
- Dépendance expo-image
- Dépendance expo-image-manipulator
- Dépendance expo-linear-gradient
- Dépendance expo-linking
- Dépendance expo-media-library
- Dépendance expo-network
- Dépendance expo-router
- Dépendance expo-secure-store
- Dépendance expo-sharing
- Dépendance expo-splash-screen
- Dépendance expo-status-bar
- Dépendance expo-symbols
- Dépendance expo-system-ui
- Dépendance expo-updates
- Dépendance @expo/vector-icons
- Dépendance expo-video
- Dépendance expo-web-browser
- Dépendance react
- Dépendance react-dom
- Dépendance react-native
- Dépendance @react-native-community/datetimepicker
- Dépendance @react-native-community/slider
- Dépendance react-native-reanimated
- Dépendance react-native-safe-area-context
- Dépendance react-native-screens
- Dépendance react-native-svg
- Dépendance react-native-url-polyfill
- Dépendance react-native-web
- Dépendance react-native-webview
- Dépendance react-native-worklets
- Dépendance @react-navigation/bottom-tabs
- Dépendance @supabase/supabase-js

## God Nodes (most connected - your core abstractions)
1. `couleurs` - 52 edges
2. `Texte()` - 44 edges
3. `rayons` - 41 edges
4. `expo-router` - 31 edges
5. `useDialogue()` - 28 edges
6. `utilisateurId()` - 28 edges
7. `Ecran()` - 23 edges
8. `analyzeMedia()` - 21 edges
9. `Bouton()` - 19 edges
10. `SqueletteListe()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Déploiement GHCR vers Bunny Magic Containers` --semantically_similar_to--> `Build iOS et TestFlight`  [INFERRED] [semantically similar]
  containers/media-worker/README.md → mobile_dev_plan.md
- `Purge des orphelins` --semantically_similar_to--> `Visibilité par pupitre portée par la RLS`  [INFERRED] [semantically similar]
  containers/media-worker/README.md → docs/superpowers/plans/2026-08-31-lot-c-audios-repetition.md
- `Édition et suppression d'un projet personnel` --references--> `Plan de développement SoundBoss Mobile`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-30-lot-a-corrections-rapides.md → mobile_dev_plan.md
- `Lecture audio en arrière-plan` --semantically_similar_to--> `Réponse 202 et traitement asynchrone`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-31-lot-b-robustesse-session.md → containers/media-worker/README.md
- `Bucket R2 et juridiction à trancher` --conceptually_related_to--> `Purge des orphelins`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-d-container-media.md → containers/media-worker/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Chaîne d'analyse audio de bout en bout** — docs_superpowers_plans_2026_08_31_lot_d_container_media_trigger_audio_depose, containers_media_worker_readme_jobs_analyze, docs_superpowers_plans_2026_08_31_lot_d_container_media_colonnes_analyse, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_duree_secondes_absente, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_seuil_30_pourcent, docs_superpowers_plans_2026_08_31_lot_d_container_media_rattrapage_sweep [EXTRACTED 0.95]
- **Chaîne de publication de l'image du worker** — _github_workflows_media_worker_workflow, _github_workflows_media_worker_double_etiquetage, _github_workflows_media_worker_permission_packages_write, containers_media_worker_readme_deploiement_ghcr_bunny, containers_media_worker_readme_incrementer_le_tag, docs_superpowers_plans_2026_08_31_lot_d_container_media_publication_ghcr [INFERRED 0.90]
- **Préservation de la session hors ligne** — docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_destruction_de_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_doit_rafraichir_la_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_fournisseur_reseau, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_decision_garde, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_ecran_hors_ligne, mobile_dev_plan_auth_securestore [EXTRACTED 0.95]
- **SoundBoss Brand Mark Across Icon, Adaptive Icon and Splash** — assets_images_icon_appicon, assets_images_adaptive_icon_adaptiveicon, assets_images_splash_icon_splashicon, assets_images_splash_icon_soundbossbrandidentity [INFERRED 0.85]
- **Android Adaptive Icon Layer Stack (Background / Foreground / Monochrome)** — assets_images_android_icon_background_androidiconbackground, assets_images_android_icon_foreground_androidiconforeground, assets_images_android_icon_monochrome_androidiconmonochrome, assets_images_favicon_favicon [INFERRED 0.85]
- **Unbranded Expo Starter Artwork Still In Repo** — assets_images_react_logo_reactlogo, assets_images_react_logo_2x_reactlogo2x, assets_images_react_logo_3x_reactlogo3x, assets_images_partial_react_logo_partialreactlogo, assets_images_react_logo_expotemplateleftoverassets [INFERRED 0.85]

## Communities (83 total, 48 thin omitted)

### Community 0 - "Authentification & formulaires"
Cohesion: 0.06
Nodes (67): champStyle, DetailMembre(), MembreAvecInfos, EditerGroupe(), TYPES_GROUPE, GENRES, INSTRUMENTS, NIVEAUX (+59 more)

### Community 1 - "Chat temps réel & mentions"
Cohesion: 0.07
Nodes (48): apercuMessage(), Chat(), MembreMention, MessageChat, nomMembre(), typePieceJointe(), versFichierDetail(), BoutonEcouter() (+40 more)

### Community 2 - "Worker média (analyse, BPM, waveform)"
Cohesion: 0.08
Nodes (40): analyzeMedia(), AnalyzeResult, derivedKey(), readHead(), bpmDepuisBattements(), detectTempo(), parseBattements(), config (+32 more)

### Community 3 - "Projets, morceaux & groupes"
Cohesion: 0.06
Nodes (47): CarteMorceau(), DetailProjet(), Morceau, MesProjets(), FormulaireProjet(), Projet, TYPES_EVENEMENTS, TYPES_PRODUCTIONS (+39 more)

### Community 4 - "Dépendance _layout.tsx"
Cohesion: 0.07
Nodes (39): LayoutAuth(), carteSelection(), Onboarding(), ContenuDossier(), iconeDossier(), iconeFichier(), IcôneDossier(), ModalNouveauDossier() (+31 more)

### Community 5 - "Configuration Expo (app.json)"
Cohesion: 0.04
Nodes (47): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, googleServicesFile, package, permissions, predictiveBackGestureEnabled (+39 more)

### Community 6 - "Groupes : invitations & pupitres"
Cohesion: 0.09
Nodes (40): FicheStudio(), heureCourte(), Reserver(), Studios(), MesReservations(), Accueil(), JOURS_COURTS, STATUTS_SEANCE (+32 more)

### Community 7 - "Layout racine & fichiers"
Cohesion: 0.07
Nodes (25): queryClient, FichierDetail, LIBELLES_TYPE, styles, BarreWaveforme(), formatTemps(), hauteurBarre(), LecteurAudioModal() (+17 more)

### Community 8 - "Studios & réservations"
Cohesion: 0.05
Nodes (38): eslint, eslint-config-expo, jest, jest-expo, devDependencies, eslint, eslint-config-expo, jest (+30 more)

### Community 9 - "Outillage et dépendances de dev"
Cohesion: 0.12
Nodes (24): JobsIA(), Notifications(), ICONES, LayoutTabs(), ONGLETS, ONGLETS_MASQUES, Wallet(), EcranHorsLigne() (+16 more)

### Community 10 - "Tâches & assiduité"
Cohesion: 0.13
Nodes (22): Parametres(), Profil(), CarteRessource(), OngletRessources(), typeInfo(), TYPES, useUrlR2(), VignetteImage() (+14 more)

### Community 11 - "Onglets, profil & notifications"
Cohesion: 0.13
Nodes (21): CarteTache(), couleurPriorite(), FormulaireTache(), libellePriorite(), OngletTaches(), PRIORITES, STATUTS, stylesModal (+13 more)

### Community 12 - "Dépendances du worker"
Cohesion: 0.08
Nodes (23): aws4fetch, dependencies, aws4fetch, hono, @hono/node-server, devDependencies, @types/node, typescript (+15 more)

### Community 13 - "Fichiers personnels & dossiers"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+8 more)

### Community 14 - "Configuration TypeScript"
Cohesion: 0.19
Nodes (13): Assiduite(), Cible, OngletFichiers(), STYLES_TYPE, tailleLisible(), useMembresGroupe(), usePupitresGroupe(), clefsRessources (+5 more)

### Community 15 - "Périmètre de typage"
Cohesion: 0.12
Nodes (15): containers, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, ./src/*, **/*.ts, **/*.tsx, compilerOptions (+7 more)

### Community 16 - "Médiathèque de groupe"
Cohesion: 0.14
Nodes (12): NouveauGroupe(), OngletPupitres(), clefsGroupes, Groupe, GroupeAvecRole, InvitationGroupe, Membre, Pupitre (+4 more)

### Community 17 - "Chat : données & conversations"
Cohesion: 0.17
Nodes (15): Bug d'affichage de l'auteur, Copier un message, debutDeSerie et nomAuteur, Extraction en fonctions pures testables, Harnais de test jest-expo, Lot A — Corrections rapides, nettoyerNom, Édition et suppression d'un projet personnel (+7 more)

### Community 18 - "Lot A — corrections rapides"
Cohesion: 0.22
Nodes (14): Adaptive Icon (SoundBoss Note on Black), Android Icon Background Layer (Expo Template Guides), Android Icon Foreground Layer (Blue Chevron Mark), Android Icon Monochrome Layer (Themed Icon Chevron), Web Favicon (Blue Chevron), App Icon (SoundBoss Music Note), Partial React Logo (Template Header Art), React Logo 2x (+6 more)

### Community 19 - "Onboarding & push client"
Cohesion: 0.21
Nodes (13): Débit AAC de 64 kbps, Endpoint POST /jobs/analyze, Mesurer avant de normaliser, Normalisation loudness à -16 LUFS, Ordre des traitements, Pics de waveform, Remux ADTS vers M4A, Secret partagé MEDIA_WORKER_SECRET (+5 more)

### Community 20 - "Identité visuelle & icônes"
Cohesion: 0.18
Nodes (13): Réponse 202 et traitement asynchrone, decisionGarde, Destruction de session par _callRefreshToken, doitRafraichirLaSession, EcranHorsLigne, FournisseurReseau, Lecture audio en arrière-plan, Lot B — Robustesse de session (+5 more)

### Community 21 - "Traitement audio du worker"
Cohesion: 0.17
Nodes (9): BoiteDialogue(), Configuration, CONFIGURATIONS, styles, VarianteDialogue, ApiDialogue, ContexteDialogue, EtatDialogue (+1 more)

### Community 22 - "Lot B — robustesse de session"
Cohesion: 0.20
Nodes (12): Déclenchement filtré par chemin, Double étiquetage latest et SHA, Permission packages: write, Tests du worker avant publication, Workflow GitHub Actions media-worker, Déploiement GHCR vers Bunny Magic Containers, Endpoint GET /health et HEALTHCHECK, Incrémenter le tag à chaque publication (+4 more)

### Community 23 - "CI/CD et déploiement Bunny"
Cohesion: 0.18
Nodes (12): expo-image-picker, expo-notifications, dependencies, expo-image-picker, expo-notifications, react-native-gesture-handler, @react-navigation/elements, @react-navigation/native (+4 more)

### Community 24 - "Dépendances runtime Expo"
Cohesion: 0.22
Nodes (9): Colonne pupitre_id, Durée absente en base, Lot C — Audios de répétition, Renommage des libellés en Audios, RPC ajouter_enregistrement_seance, Visibilité par pupitre portée par la RLS, Lot D — Container média, Rattrapage des audios existants par /jobs/sweep (+1 more)

### Community 25 - "Lots C & D — audios et container"
Cohesion: 0.33
Nodes (7): Rejoindre(), MesGroupes(), ModalNouveauPupitre(), ModalNouveauProjet(), useDialogue(), useAjouterPupitre(), useRejoindreParCode()

### Community 26 - "Upload R2 & compression"
Cohesion: 0.47
Nodes (6): Adaptation du worker à SoundBoss, Piège ff_mark_media_purged, Purge des orphelins, Service de traitement média, Reprise du worker sur seance_enregistrements, Révocation FROM PUBLIC de ff_enqueue_notif

### Community 27 - "Ressources d'équipe & client Supabase"
Cohesion: 0.40
Nodes (6): Jamais d'écriture sur la source, deltaEcoute et SAUT_MAX_SECONDES, RPC enregistrer_ecoute, Seuil des 30 % réellement écoutés, Table seance_ecoutes, Vue des écoutes du chef

### Community 28 - "Adaptation du worker"
Cohesion: 0.60
Nodes (5): InvitationGroupe(), useGenererInvitation(), useInvitationsGroupe(), useRetirerInvitation(), reponseRpc()

### Community 29 - "Comptage des écoutes"
Cohesion: 0.40
Nodes (4): Agregation, OngletStockage(), TYPES, useRessources()

### Community 30 - "Détection BPM & monétisation"
Cohesion: 0.50
Nodes (5): Détection BPM par aubiotrack, Tonalité non détectée, BPM par aubio, tonalité par Fadr, parseTempo, Monétisation par crédits

### Community 32 - "Dépendance Expo app scaffold (create-expo-app)"
Cohesion: 0.67
Nodes (3): Expo app scaffold (create-expo-app), Expo Router file-based routing (app directory), npm run reset-project

## Ambiguous Edges - Review These
- `Adaptive Icon (SoundBoss Note on Black)` → `Android Icon Foreground Layer (Blue Chevron Mark)`  [AMBIGUOUS]
  assets/images/adaptive-icon.png · relation: conceptually_related_to
- `SoundBoss Brand Identity (Amber Note on Black)` → `Unbranded Expo Template Leftover Assets`  [AMBIGUOUS]
  assets/images/react-logo.png · relation: conceptually_related_to
- `Purge des orphelins` → `Bucket R2 et juridiction à trancher`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-d-container-media.md · relation: conceptually_related_to
- `Édition et suppression d'un projet personnel` → `Plan de développement SoundBoss Mobile`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-30-lot-a-corrections-rapides.md · relation: references

## Knowledge Gaps
- **288 isolated node(s):** `champStyle`, `ONGLETS`, `TYPES_GROUPE`, `STATUTS_SEANCE`, `JOURS_COURTS` (+283 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Adaptive Icon (SoundBoss Note on Black)` and `Android Icon Foreground Layer (Blue Chevron Mark)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SoundBoss Brand Identity (Amber Note on Black)` and `Unbranded Expo Template Leftover Assets`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Purge des orphelins` and `Bucket R2 et juridiction à trancher`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Édition et suppression d'un projet personnel` and `Plan de développement SoundBoss Mobile`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `expo-router` connect `Authentification & formulaires` to `Chat temps réel & mentions`, `Projets, morceaux & groupes`, `Dépendance _layout.tsx`, `Configuration Expo (app.json)`, `Groupes : invitations & pupitres`, `Layout racine & fichiers`, `Outillage et dépendances de dev`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `plugins` connect `Configuration Expo (app.json)` to `Authentification & formulaires`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `champStyle`, `ONGLETS`, `TYPES_GROUPE` to the rest of the system?**
  _288 weakly-connected nodes found - possible documentation gaps or missing edges._