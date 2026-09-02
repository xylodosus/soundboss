# Graph Report - .  (2026-09-02)

## Corpus Check
- 26 files · ~114,258 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1047 nodes · 2218 edges · 93 communities (42 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.86)
- Token cost: 82,915 input · 0 output

## Community Hubs (Navigation)
- Authentification et profils
- Studios et réservations
- Groupes, pupitres et adhésion
- Séances de répétition
- Configuration Expo (app.json)
- Labo audio — écran et transport
- Media-worker — orchestration
- Outillage de test et lint
- Projets et morceaux
- Chat de groupe
- Navigation et fournisseurs racine
- Dépendances du media-worker
- Fichiers personnels
- Adaptation du worker à SoundBoss
- Requêtes de chat (TanStack)
- Configuration TypeScript
- Traitement média — loudness et pics
- Portée du typage
- Fichiers de groupe et stockage
- Onboarding et notifications push
- Icônes et identité visuelle
- Lot A — corrections rapides
- ffmpeg et mesure de loudness
- Lecture de fichiers joints
- Dépendances Expo du client
- Images et accès R2
- Métronome et lots audio à venir
- Ressources d'équipe
- Déploiement GHCR et Bunny
- Détection de conteneur média
- Moteur audio — décodage et hauteur
- Waveform et boucle A/B
- Types générés Supabase
- Session hors ligne et robustesse
- Pics de waveform (worker)
- Dépendances natives et crash EAS
- Téléchargement et partage
- Détection de tempo (aubio)
- Détection BPM par aubiotrack
- ecoute.ts
- eslint.config.js
- Expo app scaffold (create-expo-app)
- Rule: read Expo SDK 54 versioned docs be
- country-flag-icons
- date-fns
- date-fns-tz
- expo
- expo-asset
- expo-audio
- expo-clipboard
- expo-constants
- expo-document-picker
- expo-file-system
- expo-font
- expo-haptics
- expo-image
- expo-image-manipulator
- expo-linear-gradient
- expo-linking
- expo-media-library
- expo-network
- expo-notifications
- expo-router
- expo-secure-store
- expo-sharing
- expo-splash-screen
- expo-status-bar
- expo-symbols
- expo-system-ui
- expo-updates
- @expo/vector-icons
- expo-video
- expo-web-browser
- react
- react-dom
- react-native
- react-native-audio-api
- @react-native-community/datetimepicker
- react-native-gesture-handler
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-svg
- react-native-url-polyfill
- react-native-web
- react-native-webview
- react-native-worklets
- @react-navigation/bottom-tabs
- @supabase/supabase-js
- @tanstack/react-query

## God Nodes (most connected - your core abstractions)
1. `couleurs` - 51 edges
2. `Texte()` - 43 edges
3. `rayons` - 40 edges
4. `expo-router` - 31 edges
5. `useDialogue()` - 28 edges
6. `utilisateurId()` - 28 edges
7. `Ecran()` - 22 edges
8. `DetailSeance()` - 20 edges
9. `Bouton()` - 19 edges
10. `SqueletteListe()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Bucket R2 et juridiction à trancher` --conceptually_related_to--> `Purge des orphelins`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-d-container-media.md → containers/media-worker/README.md
- `Crash EAS au lancement — peer "*" de expo-audio sur expo-asset` --semantically_similar_to--> `Conflit de versions react-native-worklets`  [INFERRED] [semantically similar]
  mobile_dev_plan.md → docs/superpowers/plans/2026-08-31-lot-e1-socle-labo-audio.md
- `Ordonnanceur de clics (setInterval 100 ms, avance 300 ms)` --semantically_similar_to--> `Décoder à contexte.sampleRate (correctif de la lecture trop rapide)`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-31-lot-e2-tempo-transposition.md → mobile_dev_plan.md
- `Lecture audio en arrière-plan` --semantically_similar_to--> `Réponse 202 et traitement asynchrone`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-31-lot-b-robustesse-session.md → containers/media-worker/README.md
- `Purge des orphelins` --semantically_similar_to--> `Visibilité par pupitre portée par la RLS`  [INFERRED] [semantically similar]
  containers/media-worker/README.md → docs/superpowers/plans/2026-08-31-lot-c-audios-repetition.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphe audio du labo : source décodée, gain, effets et clic du métronome** — docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_graphe_gainnode, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_recreation_source_node, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_pitchcorrection, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_boucle_ab, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_ordonnanceur_clics, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_lot_e3 [INFERRED 0.85]
- **Chaîne des pics de waveform : media-worker → parsing → échantillonnage → rendu** — docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_serializepeaks_media_worker, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_parsepics, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_echantillonnerpics, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_waveform, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_etat_repli_waveform [EXTRACTED 1.00]
- **Chaîne de notification push, du trigger au terminal** — mobile_dev_plan_chaine_push, mobile_dev_plan_ff_enqueue_notif, mobile_dev_plan_send_push, mobile_dev_plan_app_secrets, mobile_dev_plan_push_tsx, mobile_dev_plan_revoke_public_ff_enqueue [EXTRACTED 1.00]
- **Chaîne d'analyse audio de bout en bout** — docs_superpowers_plans_2026_08_31_lot_d_container_media_trigger_audio_depose, containers_media_worker_readme_jobs_analyze, docs_superpowers_plans_2026_08_31_lot_d_container_media_colonnes_analyse, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_duree_secondes_absente, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_seuil_30_pourcent, docs_superpowers_plans_2026_08_31_lot_d_container_media_rattrapage_sweep [EXTRACTED 0.95]
- **Chaîne de publication de l'image du worker** — _github_workflows_media_worker_workflow, _github_workflows_media_worker_double_etiquetage, _github_workflows_media_worker_permission_packages_write, containers_media_worker_readme_deploiement_ghcr_bunny, containers_media_worker_readme_incrementer_le_tag, docs_superpowers_plans_2026_08_31_lot_d_container_media_publication_ghcr [INFERRED 0.90]
- **Préservation de la session hors ligne** — docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_destruction_de_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_doit_rafraichir_la_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_fournisseur_reseau, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_decision_garde, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_ecran_hors_ligne, mobile_dev_plan_auth_securestore [EXTRACTED 0.95]
- **SoundBoss Brand Mark Across Icon, Adaptive Icon and Splash** — assets_images_icon_appicon, assets_images_adaptive_icon_adaptiveicon, assets_images_splash_icon_splashicon, assets_images_splash_icon_soundbossbrandidentity [INFERRED 0.85]
- **Android Adaptive Icon Layer Stack (Background / Foreground / Monochrome)** — assets_images_android_icon_background_androidiconbackground, assets_images_android_icon_foreground_androidiconforeground, assets_images_android_icon_monochrome_androidiconmonochrome, assets_images_favicon_favicon [INFERRED 0.85]
- **Unbranded Expo Starter Artwork Still In Repo** — assets_images_react_logo_reactlogo, assets_images_react_logo_2x_reactlogo2x, assets_images_react_logo_3x_reactlogo3x, assets_images_partial_react_logo_partialreactlogo, assets_images_react_logo_expotemplateleftoverassets [INFERRED 0.85]

## Communities (93 total, 51 thin omitted)

### Community 0 - "Authentification et profils"
Cohesion: 0.05
Nodes (77): champStyle, DetailMembre(), MembreAvecInfos, TYPES_GROUPE, GENRES, INSTRUMENTS, NIVEAUX, ROLES (+69 more)

### Community 1 - "Studios et réservations"
Cohesion: 0.06
Nodes (56): JobsIA(), Notifications(), Parametres(), FicheStudio(), heureCourte(), Reserver(), Studios(), MesReservations() (+48 more)

### Community 2 - "Groupes, pupitres et adhésion"
Cohesion: 0.05
Nodes (54): Assiduite(), EditerGroupe(), Rejoindre(), MesGroupes(), NouveauGroupe(), InvitationGroupe(), OngletFichiers(), ModalNouveauPupitre() (+46 more)

### Community 3 - "Séances de répétition"
Cohesion: 0.08
Nodes (44): DetailSeance(), STATUTS_PRESENCE, DetailSeancePersonnelle(), LigneSeance(), CarteProjet(), BarreWaveforme(), hauteurBarre(), LecteurAudioModal() (+36 more)

### Community 4 - "Configuration Expo (app.json)"
Cohesion: 0.04
Nodes (47): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, googleServicesFile, package, permissions, predictiveBackGestureEnabled (+39 more)

### Community 5 - "Labo audio — écran et transport"
Cohesion: 0.09
Nodes (30): arrondir(), avecDelai(), DelaiExpire, demiTons(), Etat, LaboAudio(), libererCache(), obtenirContexte() (+22 more)

### Community 6 - "Media-worker — orchestration"
Cohesion: 0.09
Nodes (26): analyzeMedia(), AnalyzeResult, derivedKey(), readHead(), config, headers, listUnanalyzed(), MediaRow (+18 more)

### Community 7 - "Outillage de test et lint"
Cohesion: 0.05
Nodes (38): eslint, eslint-config-expo, jest, jest-expo, devDependencies, eslint, eslint-config-expo, jest (+30 more)

### Community 8 - "Projets et morceaux"
Cohesion: 0.10
Nodes (30): CarteMorceau(), DetailProjet(), Morceau, MesProjets(), FormulaireProjet(), Projet, TYPES_EVENEMENTS, TYPES_PRODUCTIONS (+22 more)

### Community 9 - "Chat de groupe"
Cohesion: 0.12
Nodes (17): apercuMessage(), Chat(), MembreMention, MessageChat, nomMembre(), typePieceJointe(), versFichierDetail(), CompteurEcoutes() (+9 more)

### Community 10 - "Navigation et fournisseurs racine"
Cohesion: 0.12
Nodes (17): queryClient, ICONES, LayoutTabs(), ONGLETS, ONGLETS_MASQUES, EcranHorsLigne(), FournisseurAudio(), DecisionGarde (+9 more)

### Community 11 - "Dépendances du media-worker"
Cohesion: 0.08
Nodes (23): aws4fetch, dependencies, aws4fetch, hono, @hono/node-server, devDependencies, @types/node, typescript (+15 more)

### Community 12 - "Fichiers personnels"
Cohesion: 0.17
Nodes (19): ContenuDossier(), iconeDossier(), iconeFichier(), IcôneDossier(), ModalNouveauDossier(), OngletFichiersPersonnels(), tailleLisible(), clefsDossiers (+11 more)

### Community 13 - "Adaptation du worker à SoundBoss"
Cohesion: 0.14
Nodes (19): Adaptation du worker à SoundBoss, Endpoint GET /health et HEALTHCHECK, Jamais d'écriture sur la source, Piège ff_mark_media_purged, Purge des orphelins, Service de traitement média, Colonne pupitre_id, deltaEcoute et SAUT_MAX_SECONDES (+11 more)

### Community 14 - "Requêtes de chat (TanStack)"
Cohesion: 0.16
Nodes (11): Database, clefsChat, Conversation, Message, useConversations(), useEnvoyerMessage(), useMarquerLu(), ReponseJson (+3 more)

### Community 15 - "Configuration TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+8 more)

### Community 16 - "Traitement média — loudness et pics"
Cohesion: 0.16
Nodes (16): Débit AAC de 64 kbps, Endpoint POST /jobs/analyze, Mesurer avant de normaliser, Normalisation loudness à -16 LUFS, Ordre des traitements, Pics de waveform, Remux ADTS vers M4A, Secret partagé MEDIA_WORKER_SECRET (+8 more)

### Community 17 - "Portée du typage"
Cohesion: 0.12
Nodes (15): containers, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, ./src/*, **/*.ts, **/*.tsx, compilerOptions (+7 more)

### Community 18 - "Fichiers de groupe et stockage"
Cohesion: 0.18
Nodes (10): Cible, STYLES_TYPE, Agregation, OngletStockage(), TYPES, clefsRessources, Ressource, RessourceAvecJointures (+2 more)

### Community 19 - "Onboarding et notifications push"
Cohesion: 0.22
Nodes (10): LayoutAuth(), carteSelection(), Onboarding(), FournisseurPush(), naviguerVersNotification(), obtenirTokenPush(), preparerCanalAndroid(), Contexte (+2 more)

### Community 20 - "Icônes et identité visuelle"
Cohesion: 0.22
Nodes (14): Adaptive Icon (SoundBoss Note on Black), Android Icon Background Layer (Expo Template Guides), Android Icon Foreground Layer (Blue Chevron Mark), Android Icon Monochrome Layer (Themed Icon Chevron), Web Favicon (Blue Chevron), App Icon (SoundBoss Music Note), Partial React Logo (Template Header Art), React Logo 2x (+6 more)

### Community 21 - "Lot A — corrections rapides"
Cohesion: 0.18
Nodes (14): Bug d'affichage de l'auteur, debutDeSerie et nomAuteur, Extraction en fonctions pures testables, Harnais de test jest-expo, Lot A — Corrections rapides, nettoyerNom, Édition et suppression d'un projet personnel, Saisie multiligne du chat (+6 more)

### Community 22 - "ffmpeg et mesure de loudness"
Cohesion: 0.32
Nodes (10): probeDurationSeconds(), probeSampleRate(), remuxAdtsToM4a(), run, argumentsNormalisation(), LoudnessMeasurement, measureLoudness(), normalizeLoudness() (+2 more)

### Community 23 - "Lecture de fichiers joints"
Cohesion: 0.18
Nodes (6): BoutonEcouter(), FichierDetail, LIBELLES_TYPE, ModalDetailFichier(), styles, useLecteurAudio()

### Community 24 - "Dépendances Expo du client"
Cohesion: 0.18
Nodes (12): expo-device, @expo-google-fonts/plus-jakarta-sans, expo-image-picker, dependencies, expo-device, @expo-google-fonts/plus-jakarta-sans, expo-image-picker, @react-native-community/slider (+4 more)

### Community 25 - "Images et accès R2"
Cohesion: 0.29
Nodes (9): useUrlR2(), VignetteImage(), compresserImage(), FichierImage, nomSansExtension(), autorisation(), ReponseTeleversement, televerserFichier() (+1 more)

### Community 26 - "Métronome et lots audio à venir"
Cohesion: 0.20
Nodes (11): Graphe source → GainNode → destination monté d'avance, Lot E3 — Égaliseur graphique (BiquadFilterNode), Lot E4 — Stems et tonalité via Fadr, parsePics — lecture du format <base>.peaks.json, serializePeaks du media-worker ({ v: 1, peaks: number[] }), clicsDansHorizon(position, phase, bpm, horizon) — src/lib/metronome.ts, Métronome et calage manuel de la phase, Ordonnanceur de clics (setInterval 100 ms, avance 300 ms) (+3 more)

### Community 27 - "Ressources d'équipe"
Cohesion: 0.31
Nodes (9): CarteRessource(), OngletRessources(), typeInfo(), TYPES, clefsRessourcesEquipe, RessourceEquipe, ressourcesPourProfil(), TypeRessource (+1 more)

### Community 28 - "Déploiement GHCR et Bunny"
Cohesion: 0.24
Nodes (10): Déclenchement filtré par chemin, Double étiquetage latest et SHA, Permission packages: write, Tests du worker avant publication, Workflow GitHub Actions media-worker, Déploiement GHCR vers Bunny Magic Containers, Incrémenter le tag à chaque publication, Juridiction du bucket R2 (+2 more)

### Community 29 - "Détection de conteneur média"
Cohesion: 0.31
Nodes (6): ascii(), detectContainer(), detectSync(), MediaContainer, needsRemux(), withExtension()

### Community 30 - "Moteur audio — décodage et hauteur"
Cohesion: 0.24
Nodes (10): AudioBufferBaseSourceNode (playbackRate, detune, onPositionChanged), decodeAudioData(input, sampleRate?) — décodage par URL, Sonde de faisabilité jetable (app/labo-sonde.tsx), StreamerNode — lecture en flux sans décodage complet, Correction de hauteur activée seulement hors du neutre, Piège du retour à detune = 0, pitchCorrection — deux chemins de traitement, Un seul tampon décodé vivant, gardé en cache (+2 more)

### Community 31 - "Waveform et boucle A/B"
Cohesion: 0.22
Nodes (10): echantillonnerPics — réduction par maximum d'intervalle, État de repli de la waveform (pics absents), Extraction de formatTemps dans src/lib/format.ts, Écran du labo audio (src/components/audio/labo-audio.tsx), Le labo ne compte pas les écoutes, Recréation obligatoire de l'AudioBufferSourceNode à chaque reprise, Waveform navigable au toucher (src/components/audio/waveform.tsx), Bornes natives : playbackRate [0,3], detune ±12 demi-tons (+2 more)

### Community 32 - "Types générés Supabase"
Cohesion: 0.20
Nodes (9): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables, TablesInsert (+1 more)

### Community 33 - "Session hors ligne et robustesse"
Cohesion: 0.25
Nodes (9): Réponse 202 et traitement asynchrone, decisionGarde, Destruction de session par _callRefreshToken, doitRafraichirLaSession, EcranHorsLigne, FournisseurReseau, Lecture audio en arrière-plan, Lot B — Robustesse de session (+1 more)

### Community 35 - "Dépendances natives et crash EAS"
Cohesion: 0.25
Nodes (9): Copier un message, Conflit de versions react-native-worklets, Coexistence de deux moteurs audio (labo à côté du lecteur expo-audio), Épinglage de react-native-audio-api en 0.12.0, Lot E1 — Socle du labo audio, react-native-audio-api (moteur Web Audio du labo), Lot E2 — Tempo, transposition, boucle et métronome, Crash EAS au lancement — peer "*" de expo-audio sur expo-asset (+1 more)

### Community 36 - "Téléchargement et partage"
Cohesion: 0.48
Nodes (4): nettoyerNom(), telechargerEtPartager(), TYPES_MEDIATHEQUE, VoieTelechargement

### Community 37 - "Détection de tempo (aubio)"
Cohesion: 0.80
Nodes (3): bpmDepuisBattements(), detectTempo(), parseBattements()

### Community 38 - "Détection BPM par aubiotrack"
Cohesion: 0.67
Nodes (4): Détection BPM par aubiotrack, Tonalité non détectée, BPM par aubio, tonalité par Fadr, parseTempo

### Community 41 - "Expo app scaffold (create-expo-app)"
Cohesion: 0.67
Nodes (3): Expo app scaffold (create-expo-app), Expo Router file-based routing (app directory), npm run reset-project

## Ambiguous Edges - Review These
- `Adaptive Icon (SoundBoss Note on Black)` → `Android Icon Foreground Layer (Blue Chevron Mark)`  [AMBIGUOUS]
  assets/images/adaptive-icon.png · relation: conceptually_related_to
- `SoundBoss Brand Identity (Amber Note on Black)` → `Unbranded Expo Template Leftover Assets`  [AMBIGUOUS]
  assets/images/react-logo.png · relation: conceptually_related_to
- `Purge des orphelins` → `Bucket R2 et juridiction à trancher`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-d-container-media.md · relation: conceptually_related_to
- `Édition et suppression d'un projet personnel` → `SoundBoss Mobile — plan de développement (Expo SDK 54)`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-30-lot-a-corrections-rapides.md · relation: references
- `Métronome et calage manuel de la phase` → `§4 bis — Monétisation par crédits (pay-as-you-go, mobile money)`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-e2-tempo-transposition.md · relation: conceptually_related_to

## Knowledge Gaps
- **303 isolated node(s):** `champStyle`, `TYPES_GROUPE`, `STATUTS_SEANCE`, `JOURS_COURTS`, `ONGLETS` (+298 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Adaptive Icon (SoundBoss Note on Black)` and `Android Icon Foreground Layer (Blue Chevron Mark)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SoundBoss Brand Identity (Amber Note on Black)` and `Unbranded Expo Template Leftover Assets`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Purge des orphelins` and `Bucket R2 et juridiction à trancher`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Édition et suppression d'un projet personnel` and `SoundBoss Mobile — plan de développement (Expo SDK 54)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Métronome et calage manuel de la phase` and `§4 bis — Monétisation par crédits (pay-as-you-go, mobile money)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `expo-router` connect `Authentification et profils` to `Studios et réservations`, `Séances de répétition`, `Configuration Expo (app.json)`, `Projets et morceaux`, `Chat de groupe`, `Navigation et fournisseurs racine`, `Onboarding et notifications push`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `plugins` connect `Configuration Expo (app.json)` to `Authentification et profils`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._