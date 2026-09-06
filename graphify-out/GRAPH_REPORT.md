# Graph Report - /Users/donatienkone/Documents/App Dev/zikmaster/mobile  (2026-09-06)

## Corpus Check
- 76 files · ~151,299 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1284 nodes · 2487 edges · 132 communities (73 shown, 59 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.86)
- Token cost: 108,136 input · 0 output

## Community Hubs (Navigation)
- Labo audio et égaliseur
- Détail d'une répétition
- Espaces groupe et perso
- Onglet Création — génération
- Chat de groupe
- Dépendances de l'app
- Client Fadr — stems
- Fichiers personnels
- Auth et onboarding
- Formulaire de projet
- Analyse média du conteneur
- Studios et réservation
- Layouts et navigation
- Composants UI de base
- Accueil et paramètres
- Dialogues et groupes
- Dépendances du conteneur
- Requêtes groupes
- Édition de groupe et R2
- Config et base du conteneur
- Profil et jobs IA
- Détection de tonalité
- Types de base de données
- Écrans de connexion
- Stockage et quotas
- Détail projet et tâches
- Config TS du conteneur
- Plan lot A — corrections
- Config TS de l'app
- Configuration Expo
- Requêtes de conversation
- Transcodage ffmpeg
- Enregistrement au micro
- Icônes et splash
- Client Suno — génération
- Plan lot E4 — stems
- Requêtes studios
- Requêtes tâches
- Dépendances Expo
- Icône adaptative Android
- Traitement audio du worker
- Plan lot E5 — génération
- CI et déploiement du worker
- Calcul des pics
- Plan lot E3 — égaliseur
- Mobile dev plan
- App
- Lot b robustesse session
- Assiduite
- README
- Lot e1 socle labo audio
- Telechargement
- Lot c audios repetition
- Lot c audios repetition
- Lot e1 socle labo audio
- Mobile dev plan
- Lot e4 e5 stems generation
- App
- Bpm
- App
- README
- Fft
- Mobile dev plan
- Ecoute
- Peaks
- App
- App
- Mes reservations
- Lot e1 socle labo audio
- Lot e2 tempo transposition
- Eslint config
- README
- Modal choix multiple
- Metronome
- AGENTS
- App
- Package
- Package
- Package
- Lot e2 tempo transposition
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Package
- Lot e2 tempo transposition

## God Nodes (most connected - your core abstractions)
1. `couleurs` - 39 edges
2. `expo-router` - 33 edges
3. `Texte()` - 31 edges
4. `rayons` - 28 edges
5. `separerStems()` - 26 edges
6. `LaboAudio()` - 25 edges
7. `utilisateurId()` - 19 edges
8. `expo` - 19 edges
9. `analyzeMedia()` - 18 edges
10. `Ecran()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Purge des orphelins` --semantically_similar_to--> `Visibilité par pupitre portée par la RLS`  [INFERRED] [semantically similar]
  containers/media-worker/README.md → docs/superpowers/plans/2026-08-31-lot-c-audios-repetition.md
- `Lecture audio en arrière-plan` --semantically_similar_to--> `Réponse 202 et traitement asynchrone`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-31-lot-b-robustesse-session.md → containers/media-worker/README.md
- `Bucket R2 et juridiction à trancher` --conceptually_related_to--> `Purge des orphelins`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-31-lot-d-container-media.md → containers/media-worker/README.md
- `Jamais d'écriture sur la source` --semantically_similar_to--> `RPC enregistrer_ecoute`  [INFERRED] [semantically similar]
  containers/media-worker/README.md → docs/superpowers/plans/2026-08-31-lot-c-audios-repetition.md
- `Crash EAS — peerDependency expo-asset non bornée` --semantically_similar_to--> `Conflit de version react-native-worklets / reanimated`  [INFERRED] [semantically similar]
  mobile_dev_plan.md → docs/superpowers/plans/2026-08-31-lot-e1-socle-labo-audio.md

## Import Cycles
- 4-file cycle: `src/components/audio/labo-audio.tsx -> src/components/audio/onglet-creation.tsx -> src/components/audio/onglet-generations.tsx -> src/components/ui/lecteur-audio-modal.tsx -> src/components/audio/labo-audio.tsx`

## Hyperedges (group relationships)
- **Chaîne de séparation de stems (Fadr → R2 → base → labo)** — docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_fadr_api, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_separation_hierarchique, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_rpc_demander_stems, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_table_enregistrement_stems, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_reencodage_mono_22050, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_quotas_ia [EXTRACTED 1.00]
- **Gestion de la mémoire décodée dans le labo audio** — mobile_dev_plan_mesure_faisabilite_labo, mobile_dev_plan_decodage_frequence_contexte, mobile_dev_plan_memoire_pistes_separees, mobile_dev_plan_mono_economise_pas_la_memoire, mobile_dev_plan_chargement_pistes_a_la_carte, docs_superpowers_plans_2026_09_02_lot_e4_e5_stems_generation_plafond_stems_charges [INFERRED 0.85]
- **Détection chronologique de la tonalité et lissage** — mobile_dev_plan_detection_tonalite_krumhansl, mobile_dev_plan_tonalite_par_tranches, mobile_dev_plan_absorption_dominantes, mobile_dev_plan_confiance_non_predictive [EXTRACTED 1.00]
- **Graphe audio du labo : source décodée, gain, effets et clic du métronome** — docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_graphe_gainnode, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_recreation_source_node, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_pitchcorrection, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_boucle_ab, docs_superpowers_plans_2026_08_31_lot_e2_tempo_transposition_ordonnanceur_clics, docs_superpowers_plans_2026_08_31_lot_e1_socle_labo_audio_lot_e3 [INFERRED 0.85]
- **Chaîne d'analyse audio de bout en bout** — docs_superpowers_plans_2026_08_31_lot_d_container_media_trigger_audio_depose, containers_media_worker_readme_jobs_analyze, docs_superpowers_plans_2026_08_31_lot_d_container_media_colonnes_analyse, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_duree_secondes_absente, docs_superpowers_plans_2026_08_31_lot_c_audios_repetition_seuil_30_pourcent, docs_superpowers_plans_2026_08_31_lot_d_container_media_rattrapage_sweep [EXTRACTED 0.95]
- **Chaîne de publication de l'image du worker** — _github_workflows_media_worker_workflow, _github_workflows_media_worker_double_etiquetage, _github_workflows_media_worker_permission_packages_write, containers_media_worker_readme_deploiement_ghcr_bunny, containers_media_worker_readme_incrementer_le_tag, docs_superpowers_plans_2026_08_31_lot_d_container_media_publication_ghcr [INFERRED 0.90]
- **Préservation de la session hors ligne** — docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_destruction_de_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_doit_rafraichir_la_session, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_fournisseur_reseau, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_decision_garde, docs_superpowers_plans_2026_08_31_lot_b_robustesse_session_ecran_hors_ligne, mobile_dev_plan_auth_securestore [EXTRACTED 0.95]
- **SoundBoss Brand Mark Across Icon, Adaptive Icon and Splash** — assets_images_icon_appicon, assets_images_adaptive_icon_adaptiveicon, assets_images_splash_icon_splashicon, assets_images_splash_icon_soundbossbrandidentity [INFERRED 0.85]
- **Android Adaptive Icon Layer Stack (Background / Foreground / Monochrome)** — assets_images_android_icon_background_androidiconbackground, assets_images_android_icon_foreground_androidiconforeground, assets_images_android_icon_monochrome_androidiconmonochrome, assets_images_favicon_favicon [INFERRED 0.85]
- **Unbranded Expo Starter Artwork Still In Repo** — assets_images_react_logo_reactlogo, assets_images_react_logo_2x_reactlogo2x, assets_images_react_logo_3x_reactlogo3x, assets_images_partial_react_logo_partialreactlogo, assets_images_react_logo_expotemplateleftoverassets [INFERRED 0.85]

## Communities (132 total, 59 thin omitted)

### Community 0 - "Labo audio et égaliseur"
Cohesion: 0.06
Nodes (57): ColonneBande(), Egaliseur(), styles, arrondir(), avecDelai(), DelaiExpire, demiTons(), Etat (+49 more)

### Community 1 - "Détail d'une répétition"
Cohesion: 0.08
Nodes (41): CompteurEcoutes(), DetailSeance(), STATUTS_PRESENCE, DetailSeancePersonnelle(), clamp(), PoigneeBoucle(), Props, styles (+33 more)

### Community 2 - "Espaces groupe et perso"
Cohesion: 0.08
Nodes (32): DetailGroupe(), MesProjets(), OngletId, OngletMembres(), COULEURS_PUPITRES, OngletPupitres(), stylesModal, OngletSeances() (+24 more)

### Community 3 - "Onglet Création — génération"
Cohesion: 0.10
Nodes (29): DUREES, ICONE_ORIGINE, OngletCreation(), FOND_TON, OngletGenerations(), TEINTE_TON, titreDe(), etatGeneration() (+21 more)

### Community 4 - "Chat de groupe"
Cohesion: 0.08
Nodes (23): apercuMessage(), Chat(), MembreMention, MessageChat, nomMembre(), typePieceJointe(), versFichierDetail(), FichierDetail (+15 more)

### Community 5 - "Dépendances de l'app"
Cohesion: 0.05
Nodes (38): eslint, eslint-config-expo, jest, jest-expo, devDependencies, eslint, eslint-config-expo, jest (+30 more)

### Community 6 - "Client Fadr — stems"
Cohesion: 0.18
Nodes (29): insertStem(), listStems(), appel(), assetsProduits(), creerAsset(), creerUrlDepot(), deposer(), estTerminee() (+21 more)

### Community 7 - "Fichiers personnels"
Cohesion: 0.09
Nodes (19): ContenuDossier(), iconeDossier(), iconeFichier(), IcôneDossier(), ModalNouveauDossier(), OngletFichiersPersonnels(), tailleLisible(), clefsDossiers (+11 more)

### Community 8 - "Auth et onboarding"
Cohesion: 0.10
Nodes (20): LayoutAuth(), carteSelection(), GENRES, INSTRUMENTS, NIVEAUX, Onboarding(), ROLES, GENRES_MUSICAUX (+12 more)

### Community 9 - "Formulaire de projet"
Cohesion: 0.09
Nodes (16): FormulaireProjet(), Projet, TYPES_EVENEMENTS, TYPES_PRODUCTIONS, ChampEffacable, CHAMPS_EFFACABLES, champsAEffacer(), estVide() (+8 more)

### Community 10 - "Analyse média du conteneur"
Cohesion: 0.16
Nodes (22): analyzeMedia(), AnalyzeResult, derivedKey(), readHead(), ascii(), detectContainer(), detectSync(), GUID_ASF (+14 more)

### Community 11 - "Studios et réservation"
Cohesion: 0.16
Nodes (20): FicheStudio(), heureCourte(), Reserver(), Bouton(), COULEUR_TEXTE, Taille, TAILLES, Variante (+12 more)

### Community 12 - "Layouts et navigation"
Cohesion: 0.12
Nodes (17): queryClient, ICONES, LayoutTabs(), ONGLETS, ONGLETS_MASQUES, EcranHorsLigne(), FournisseurAudio(), DecisionGarde (+9 more)

### Community 13 - "Composants UI de base"
Cohesion: 0.13
Nodes (12): ElementChoix, styles, Shimmer(), SqueletteListe(), FONTS, HAUTEURS_LIGNE, Poids, TAILLES (+4 more)

### Community 14 - "Accueil et paramètres"
Cohesion: 0.14
Nodes (18): Parametres(), Studios(), Accueil(), JOURS_COURTS, STATUTS_SEANCE, initiales(), libelleTypeGroupe(), useProchainesSeances() (+10 more)

### Community 15 - "Dialogues et groupes"
Cohesion: 0.12
Nodes (17): Rejoindre(), MesGroupes(), ModalNouveauProjet(), styles, BoiteDialogue(), Configuration, CONFIGURATIONS, styles (+9 more)

### Community 16 - "Dépendances du conteneur"
Cohesion: 0.08
Nodes (23): aws4fetch, dependencies, aws4fetch, hono, @hono/node-server, devDependencies, @types/node, typescript (+15 more)

### Community 17 - "Requêtes groupes"
Cohesion: 0.11
Nodes (16): EditerGroupe(), InvitationGroupe(), clefsGroupes, Groupe, GroupeAvecRole, InvitationGroupe, Membre, Pupitre (+8 more)

### Community 18 - "Édition de groupe et R2"
Cohesion: 0.16
Nodes (15): TYPES_GROUPE, TYPES_GROUPE, Avatar(), VisuelGroupe(), Etiquette(), Squelette(), useUrlR2(), VignetteImage() (+7 more)

### Community 19 - "Config et base du conteneur"
Cohesion: 0.17
Nodes (16): config, getJobIA(), getJobParTacheFournisseur(), headers, JobIA, listUnanalyzed(), MediaRow, patchJobIA() (+8 more)

### Community 20 - "Profil et jobs IA"
Cohesion: 0.19
Nodes (12): JobsIA(), STATUTS, Notifications(), DEVISES, LANGUES, expo-router, Ecran(), formatDateHeure() (+4 more)

### Community 21 - "Détection de tonalité"
Cohesion: 0.18
Nodes (17): absorberDominantes(), chromaDepuisSignal(), chromaParTranches(), correlation(), degre(), detecterTonalite(), detectTonalite(), estDominanteDe() (+9 more)

### Community 22 - "Types de base de données"
Cohesion: 0.12
Nodes (15): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+7 more)

### Community 23 - "Écrans de connexion"
Cohesion: 0.21
Nodes (9): champStyle, BoutonBorde(), BoutonDore(), AlerteErreur(), ErreurChamp(), Logo(), Texte(), erreurFrancaise() (+1 more)

### Community 24 - "Stockage et quotas"
Cohesion: 0.22
Nodes (11): StockagePersonnel(), OngletStockage(), VueStockage(), useStockageGroupe(), useStockagePersonnel(), agreger(), CATEGORIE_ENREGISTREMENTS, CATEGORIE_STEMS (+3 more)

### Community 25 - "Détail projet et tâches"
Cohesion: 0.15
Nodes (8): Morceau, CarteTache(), couleurPriorite(), libellePriorite(), OngletTaches(), PRIORITES, STATUTS, stylesModal

### Community 26 - "Config TS du conteneur"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+8 more)

### Community 27 - "Plan lot A — corrections"
Cohesion: 0.15
Nodes (16): Bug d'affichage de l'auteur, Copier un message, debutDeSerie et nomAuteur, Extraction en fonctions pures testables, Harnais de test jest-expo, Lot A — Corrections rapides, nettoyerNom, Édition et suppression d'un projet personnel (+8 more)

### Community 28 - "Config TS de l'app"
Cohesion: 0.12
Nodes (15): containers, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, ./src/*, **/*.ts, **/*.tsx, compilerOptions (+7 more)

### Community 29 - "Configuration Expo"
Cohesion: 0.13
Nodes (14): expo, icon, name, newArchEnabled, orientation, owner, runtimeVersion, scheme (+6 more)

### Community 30 - "Requêtes de conversation"
Cohesion: 0.16
Nodes (9): NouveauGroupe(), clefsChat, Conversation, Message, useConversations(), useEnvoyerMessage(), useMarquerLu(), useCreerGroupe() (+1 more)

### Community 31 - "Transcodage ffmpeg"
Cohesion: 0.28
Nodes (12): probeDurationSeconds(), probeSampleRate(), remuxAdtsToM4a(), run, transcodeStemMono(), transcodeToM4a(), argumentsNormalisation(), LoudnessMeasurement (+4 more)

### Community 32 - "Enregistrement au micro"
Cohesion: 0.30
Nodes (9): COULEUR_PALIER, WaveformMicro, formatChrono(), ModalEnregistrement(), ajouterEchantillon(), dbDepuisNiveau(), niveauDepuisDb(), PalierNiveau (+1 more)

### Community 33 - "Icônes et splash"
Cohesion: 0.22
Nodes (14): Adaptive Icon (SoundBoss Note on Black), Android Icon Background Layer (Expo Template Guides), Android Icon Foreground Layer (Blue Chevron Mark), Android Icon Monochrome Layer (Themed Icon Chevron), Web Favicon (Blue Chevron), App Icon (SoundBoss Music Note), Partial React Logo (Template Header Art), React Logo 2x (+6 more)

### Community 34 - "Client Suno — génération"
Cohesion: 0.32
Nodes (12): aDesBalises(), Demande, dureeApplicable(), erreurDuCallback(), estCallbackFinal(), Modele, MODELES, objet() (+4 more)

### Community 35 - "Plan lot E4 — stems"
Cohesion: 0.15
Nodes (14): Compteur journalier quotas_ia vérifié côté serveur, Réencodage des stems en mono 22 050 Hz, RPC demander_stems (SECURITY DEFINER, pg_net), Table enregistrement_stems (hiérarchie par stem parent), Affinage de second niveau (serveur écrit, client absent), Agrégation du stockage dans src/lib/stockage.ts, Décoder à contexte.sampleRate (sinon lecture trop rapide), Modèle de facturation par crédits (1 crédit = 100 F CFA) (+6 more)

### Community 36 - "Requêtes studios"
Cohesion: 0.14
Nodes (12): clefsStudios, LIBELLES_SERVICE, LIBELLES_UNITE, Studio, StudioAvecVedette, StudioService, useAvisStudio(), useCatalogueStudios() (+4 more)

### Community 37 - "Requêtes tâches"
Cohesion: 0.15
Nodes (9): AssignationType, clefsTaches, DonneesTache, PrioriteTache, StatutTache, Tache, TacheAvecAssignations, useChangerStatutTache() (+1 more)

### Community 38 - "Dépendances Expo"
Cohesion: 0.18
Nodes (12): expo-device, @expo-google-fonts/plus-jakarta-sans, expo-image-picker, dependencies, expo-device, @expo-google-fonts/plus-jakarta-sans, expo-image-picker, @react-native-community/slider (+4 more)

### Community 39 - "Icône adaptative Android"
Cohesion: 0.18
Nodes (11): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, googleServicesFile, package, permissions, predictiveBackGestureEnabled (+3 more)

### Community 40 - "Traitement audio du worker"
Cohesion: 0.22
Nodes (11): Débit AAC de 64 kbps, Endpoint POST /jobs/analyze, Mesurer avant de normaliser, Normalisation loudness à -16 LUFS, Ordre des traitements, Pics de waveform, Remux ADTS vers M4A, Secret partagé MEDIA_WORKER_SECRET (+3 more)

### Community 41 - "Plan lot E5 — génération"
Cohesion: 0.18
Nodes (11): Callback Suno non authentifié, validé par taskId en base, Clés d'API hébergées dans le conteneur média, jamais dans l'app, Fonctionnalité inerte et explicite tant qu'une clé manque, API Kie.ai / Suno (generate + rappel HTTP), Lot E5 — Génération musicale via Kie.ai / Suno, Chaîne push serveur (triggers, ff_enqueue_notif, send-push), Premier essai réel de génération Kie.ai (deux pistes par demande), Jobs de génération sans échéance (dette technique) (+3 more)

### Community 42 - "CI et déploiement du worker"
Cohesion: 0.28
Nodes (9): Déclenchement filtré par chemin, Double étiquetage latest et SHA, Permission packages: write, Tests du worker avant publication, Workflow GitHub Actions media-worker, Déploiement GHCR vers Bunny Magic Containers, Endpoint GET /health et HEALTHCHECK, Incrémenter le tag à chaque publication (+1 more)

### Community 44 - "Plan lot E3 — égaliseur"
Cohesion: 0.22
Nodes (9): echantillonnerPics — réduction par maximum et non par moyenne, Graphe source → GainNode monté d'avance pour l'égaliseur, parsePics — lecture du format <base>.peaks.json, Waveform navigable au toucher (barres View, zone 44 px), Lot E3 — égaliseur graphique dix bandes, Gestes pris par des vues natives superposées au SVG, Jauge d'enregistrement fictive (Math.random) et son correctif, Paliers de couleur dBFS (vert / ambre / rouge) (+1 more)

### Community 45 - "Mobile dev plan"
Cohesion: 0.22
Nodes (9): clicsDansHorizon(position, phase, bpm, horizon) — src/lib/metronome.ts, Métronome et calage manuel de la phase, Ordonnanceur de clics (setInterval 100 ms, avance 300 ms), API Fadr (upload2, assets, analyze/stem, tasks/query), Lot E4 — Stems via Fadr, Absorption des sections en dominante, L'indicateur de confiance ne prédit rien, Détection de tonalité par profils Krumhansl-Schmuckler (+1 more)

### Community 46 - "App"
Cohesion: 0.25
Nodes (8): usesNonExemptEncryption, ios, UIBackgroundModes, bundleIdentifier, config, infoPlist, supportsTablet, audio

### Community 47 - "Lot b robustesse session"
Cohesion: 0.29
Nodes (8): Réponse 202 et traitement asynchrone, decisionGarde, Destruction de session par _callRefreshToken, doitRafraichirLaSession, EcranHorsLigne, FournisseurReseau, Lecture audio en arrière-plan, Lot B — Robustesse de session

### Community 48 - "Assiduite"
Cohesion: 0.43
Nodes (6): Assiduite(), DetailMembre(), MembreAvecInfos, useMembresGroupe(), useStatistiquesPresences(), useStatistiquesPresencesMembre()

### Community 49 - "README"
Cohesion: 0.38
Nodes (7): Adaptation du worker à SoundBoss, Juridiction du bucket R2, Piège ff_mark_media_purged, Purge des orphelins, Service de traitement média, Bucket R2 et juridiction à trancher, Reprise du worker sur seance_enregistrements

### Community 50 - "Lot e1 socle labo audio"
Cohesion: 0.38
Nodes (7): Lot E1 — Socle du labo audio, Lot E2 — tempo, transposition, métronome, boucle A/B, Sonde de faisabilité jetable (mesurer avant de bâtir), StreamerNode sans playbackRate ni detune, Lot E2 — Tempo, transposition, boucle et métronome, Écoute des ressources de type loop (à faire), Mesure de faisabilité du labo sur Pocophone F1 (31/08)

### Community 51 - "Telechargement"
Cohesion: 0.48
Nodes (4): nettoyerNom(), telechargerEtPartager(), TYPES_MEDIATHEQUE, VoieTelechargement

### Community 52 - "Lot c audios repetition"
Cohesion: 0.40
Nodes (6): Jamais d'écriture sur la source, deltaEcoute et SAUT_MAX_SECONDES, RPC enregistrer_ecoute, Seuil des 30 % réellement écoutés, Table seance_ecoutes, Vue des écoutes du chef

### Community 53 - "Lot c audios repetition"
Cohesion: 0.33
Nodes (6): Colonne pupitre_id, Durée absente en base, RPC ajouter_enregistrement_seance, Visibilité par pupitre portée par la RLS, Lot D — Container média, Rattrapage des audios existants par /jobs/sweep

### Community 54 - "Lot e1 socle labo audio"
Cohesion: 0.33
Nodes (6): Conflit de version react-native-worklets / reanimated, Épinglage de react-native-audio-api en 0.12.0, react-native-audio-api (moteur Web Audio RN), Échec de build iOS — SDK Xcode trop ancien pour audio-api, Crash EAS — peerDependency expo-asset non bornée, Le rendu web statique fait échouer eas update

### Community 55 - "Mobile dev plan"
Cohesion: 0.33
Nodes (6): AudioBufferSourceNode non relisable — suivi de position à part, Plafond de stems chargés simultanément, mesuré avant d'être fixé, Chargement des pistes à la carte, plafond mesuré (460 Mo), Greffer une nouvelle source sans recréer les autres, Mémoire des pistes séparées (93 Mo pour cinq stems de 102 s), Position calculée sur l'horloge du contexte audio

### Community 56 - "Lot e4 e5 stems generation"
Cohesion: 0.40
Nodes (6): Découpe par niveaux, à la demande (main par défaut), Séparation hiérarchique des stems (main, vocal-stem, melodic-stem, drum-stem), Tolérer un stemType inconnu plutôt qu'une liste figée, Écrasement silencieux dans R2 — clés suffixées par l'id d'asset, L'instrumental ne se cumule pas avec les autres pistes, Taxonomie réelle des seize stems Fadr (doc fausse sur six noms)

### Community 57 - "App"
Cohesion: 0.40
Nodes (5): plugins, expo-asset, expo-secure-store, expo-video, @react-native-community/datetimepicker

### Community 58 - "Bpm"
Cohesion: 0.80
Nodes (3): bpmDepuisBattements(), detectTempo(), parseBattements()

### Community 59 - "App"
Cohesion: 0.50
Nodes (4): projectId, extra, eas, router

### Community 60 - "README"
Cohesion: 0.67
Nodes (4): Détection BPM par aubiotrack, Tonalité non détectée, BPM par aubio, tonalité par Fadr, parseTempo

### Community 62 - "Mobile dev plan"
Cohesion: 0.50
Nodes (4): Audio du micro conservé dans « Mes audios », Refus Suno sur contenu reconnu / paroles protégées, sourcesDisponibles — quatre provenances dédoublonnées, Vérification en HEAD sur une URL signée pour GET

### Community 65 - "App"
Cohesion: 0.67
Nodes (3): platforms, android, ios

### Community 66 - "App"
Cohesion: 0.67
Nodes (3): web, favicon, output

### Community 69 - "Lot e1 socle labo audio"
Cohesion: 0.67
Nodes (3): Comptage des écoutes non branché sur le labo, Labo séparé du lecteur expo-audio (deux moteurs coexistants), Lecteur simple coupé à l'ouverture du labo

### Community 70 - "Lot e2 tempo transposition"
Cohesion: 0.67
Nodes (3): Correction de hauteur activée seulement hors du neutre, Piège du retour à detune = 0, pitchCorrection — deux chemins de traitement

### Community 72 - "README"
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

## Knowledge Gaps
- **351 isolated node(s):** `champStyle`, `TYPES_GROUPE`, `STATUTS_SEANCE`, `JOURS_COURTS`, `MembreAvecInfos` (+346 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **59 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `expo-router` connect `Profil et jobs IA` to `Détail d'une répétition`, `Espaces groupe et perso`, `Mes reservations`, `Chat de groupe`, `Index`, `Auth et onboarding`, `Studios et réservation`, `Layouts et navigation`, `Accueil et paramètres`, `Dialogues et groupes`, `Assiduite`, `Édition de groupe et R2`, `Écrans de connexion`, `Stockage et quotas`, `App`, `Détail projet et tâches`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `expo` connect `Configuration Expo` to `App`, `App`, `Icône adaptative Android`, `App`, `App`, `App`, `App`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `plugins` connect `App` to `Profil et jobs IA`, `Configuration Expo`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._