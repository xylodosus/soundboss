# Lot E1 — Socle du labo audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Statut : tâches 1 à 4 livrées le 31 août 2026.** Mesure consignée dans `mobile_dev_plan.md` §4 quater. Reste la vérification sur appareil du labo lui-même.

**Goal:** Poser le moteur audio du labo — `react-native-audio-api` — avec une waveform navigable au toucher alimentée par les pics déjà présents en base, et un transport (lecture, pause, saut). Sans ce socle, ni tempo, ni transposition, ni égaliseur ne tiennent.

**Architecture:** Le labo vit **à côté** du lecteur existant, qui reste sur `expo-audio` pour les notes vocales, les fichiers et l'écoute courante. Il s'ouvre depuis un audio de répétition. Deux moteurs coexistent donc temporairement — décision assumée, fusion envisagée plus tard.

**Tech Stack:** `react-native-audio-api` 0.13.3 (Web Audio pour React Native), pics de waveform produits par le media-worker, Expo SDK 54.

---

## Décisions actées

| Question | Choix |
|---|---|
| Portée | **Labo séparé**, fusion du lecteur simple plus tard |
| Découpage | **Socle d'abord** : moteur, waveform, transport |
| Tonalité | par Fadr, au lot E4 — pas ici |

## Risques : ce que l'installation a appris

**Worklets — le conflit a bien eu lieu, et il est contourné.** La lecture
initiale de `peerDependenciesMeta: { optional: true }` était fausse : `optional`
dispense npm d'*installer* le paquet, pas d'en *vérifier la version* quand il est
déjà là. Or `react-native-worklets` 0.5.1 est présent, tiré par reanimated 4.1.7,
et `react-native-audio-api` >= 0.13 exige `>= 0.6.0`. npm voulait monter worklets
en 0.12.1, ce que reanimated (`0.5 - 0.8`) refuse. Installation impossible.

Contournement retenu : **épingler `react-native-audio-api` en 0.12.0**, la
dernière version dont le `package.json` ne déclare pas ce pair. Les deux chaînes
natives dégradent proprement en son absence —
`isWorkletsAvailable = dir != null && validateWorkletsVersion()` côté Gradle,
`check_if_worklets_enabled()` côté podspec : le build réussit et désactive
seulement `WorkletNode`, `WorkletProcessingNode` et `WorkletSourceNode`, qui ne
servent pas au labo. La seule chose que 0.12.2 ajoute côté API publique est
`concatAudioFiles`. RN minimal exigé : 0.76 — nous sommes en 0.81.

**Mémoire — l'API offre trois leviers, la mesure reste à faire.** L'inspection des
types a révélé ce que la documentation ne disait pas :

| Trouvaille | Portée |
|---|---|
| `decodeAudioData(input, sampleRate?)` accepte une **chaîne** (URL) et une fréquence cible | pas d'`ArrayBuffer` en mémoire JS, et le rééchantillonnage se demande au décodage |
| `StreamerNode({ streamPath })` | lecture en flux, **sans décodage complet** |
| `changePlaybackSpeed(buffer, vitesse)` | étirement temporel hors ligne |

Mais `StreamerNode` étend `AudioScheduledSourceNode`, pas
`AudioBufferBaseSourceNode` : **il n'a ni `playbackRate` ni `detune`**. Le flux
donne donc la lecture sans les effets. Le labo a besoin des effets, donc du
tampon décodé — et la question mémoire reste entière. D'où la tâche 1.

Trouvaille utile pour la tâche 4 : `AudioBufferBaseSourceNode` expose
`onPositionChanged` et `onPositionChangedInterval`. Le suivi de position ne
demande aucun calcul manuel sur `currentTime`.

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `src/lib/peaks.ts` | Lecture et normalisation des pics `<base>.peaks.json` | créé (T2) |
| `__tests__/peaks.test.ts` | Tests du parsing et de l'échantillonnage | créé (T2) |
| `src/components/audio/waveform.tsx` | Waveform navigable au toucher | créé (T3) |
| `src/components/audio/labo-audio.tsx` | Écran du labo, moteur et transport | créé (T4) |
| `app/groupes/[id]/seances/[seanceId].tsx` | Point d'entrée depuis un audio | modifié (T4) |

---

### Task 1: Sonde de faisabilité — mesurer avant de bâtir

Tâche exploratoire et **jetable** : elle ne livre aucune fonctionnalité, elle répond à une question. Son résultat conditionne la suite.

**Files:**
- Modify: `package.json`
- Create: `app/labo-sonde.tsx` (écran temporaire, supprimé en fin de tâche)

- [x] **Step 1: Installer et vérifier l'intégrité**

```bash
npx expo install react-native-audio-api
npm ls react-native-worklets react-native-reanimated react-native-audio-api
npx expo install --check
```

Attendu : `react-native-worklets` **toujours en 0.5.1**. S'il est passé en 0.6+, arrêter immédiatement et rapporter — reanimated 4.1.x et le SDK 54 en dépendent, et c'est exactement le scénario qui a mis les builds à genoux.

- [x] **Step 2: Vérifier ce que le plugin ajoute à la configuration native**

```bash
npx expo config --type introspect --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log('UIBackgroundModes:',c.ios.infoPlist.UIBackgroundModes);console.log('perms:',c.android.permissions.filter(p=>/AUDIO|MEDIA|FOREGROUND/.test(p)))})"
```

`UIBackgroundModes` doit **rester `['audio']`** et ne pas être dupliqué : `expo-audio` le pose déjà. Si le plugin de `react-native-audio-api` ajoute des permissions non nécessaires, les signaler plutôt que les accepter — le précédent d'`expo-media-library`, qui réclamait un accès en lecture à toute la médiathèque, invite à la méfiance.

- [x] **Step 3: Écran de sonde**

Créer `app/labo-sonde.tsx` : un écran qui prend une clé R2 en paramètre, résout l'URL signée par `urlLectureR2`, télécharge le fichier, le décode, et **affiche à l'écran** :

- la durée décodée, à comparer à `duree_secondes` en base ;
- le temps de décodage en millisecondes ;
- `buffer.length`, `buffer.numberOfChannels`, `buffer.sampleRate` ;
- la mémoire théorique : `length × channels × 4` octets.

Décoder successivement avec un `AudioContext` par défaut, puis avec `new AudioContext({ sampleRate: 22050 })`, et afficher les deux mesures.

- [x] **Step 4: Mesurer sur appareil**

À faire sur un **vrai téléphone**, pas sur simulateur — la contrainte mémoire est matérielle. Utiliser les trois audios réels de la base, dont celui de 488 s qui est le cas défavorable.

Relever pour chacun : le décodage aboutit-il, en combien de temps, et l'app survit-elle à trois décodages successifs sans être tuée par le système.

- [x] **Step 5: Trancher, et le consigner**

Trois issues, à décider avec l'utilisateur :

| Mesure | Suite |
|---|---|
| Décodage < 3 s et pas de crash à 44,1 kHz | continuer tel quel |
| Tenable seulement à 22 050 Hz | continuer, contexte à 22 050 Hz, documenter la perte de bande passante |
| Crash ou lenteur rédhibitoire | **arrêter le lot E1** et rapporter : le labo devra se limiter à ce qu'`expo-audio` sait faire |

Consigner la mesure dans `mobile_dev_plan.md` : c'est le genre de chiffre qu'on regrette de ne pas avoir noté six mois plus tard.

- [x] **Step 6: Supprimer la sonde et commiter**

```bash
rm app/labo-sonde.tsx
git add package.json package-lock.json app.json mobile_dev_plan.md
git commit -m "chore(audio): moteur react-native-audio-api et mesure de faisabilité"
```

---

### Task 2: Lecture des pics de waveform

Le media-worker écrit déjà `<base>.peaks.json` dans R2 et renseigne `peaks_url`. Le format est `{ "v": 1, "peaks": number[] }`, 1000 valeurs de 0 à 255 (`serializePeaks`, `containers/media-worker/src/waveform.ts`).

**Files:**
- Create: `src/lib/peaks.ts`
- Create: `__tests__/peaks.test.ts`

- [x] **Step 1: Écrire le test qui échoue**

Créer `__tests__/peaks.test.ts` :

```ts
import { echantillonnerPics, parsePics } from "../src/lib/peaks";

describe("parsePics", () => {
  it("lit le format produit par le worker", () => {
    expect(parsePics(JSON.stringify({ v: 1, peaks: [0, 128, 255] }))).toEqual([0, 128, 255]);
  });

  it("rejette une version inconnue plutôt que d'interpréter au hasard", () => {
    expect(parsePics(JSON.stringify({ v: 2, peaks: [1, 2] }))).toBeNull();
  });

  it("rejette un JSON invalide", () => {
    expect(parsePics("pas du json")).toBeNull();
  });

  it("rejette un tableau absent", () => {
    expect(parsePics(JSON.stringify({ v: 1 }))).toBeNull();
  });
});

describe("echantillonnerPics", () => {
  it("réduit à la largeur demandée en gardant le maximum de chaque intervalle", () => {
    expect(echantillonnerPics([0, 10, 2, 200, 4, 6], 3)).toEqual([10, 200, 6]);
  });

  it("rend le tableau tel quel quand il est déjà assez court", () => {
    expect(echantillonnerPics([5, 9], 4)).toEqual([5, 9]);
  });

  it("rend un tableau vide sur une entrée vide", () => {
    expect(echantillonnerPics([], 10)).toEqual([]);
  });
});
```

- [x] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- peaks`
Expected: FAIL — `Cannot find module '../src/lib/peaks'`

- [x] **Step 3: Écrire l'implémentation**

Créer `src/lib/peaks.ts` :

```ts
/** Pics de waveform produits par le media-worker : { v: 1, peaks: number[] }. */
export function parsePics(brut: string): number[] | null {
  try {
    const donnees = JSON.parse(brut) as { v?: number; peaks?: unknown };
    // Refuser une version inconnue : mieux vaut pas de waveform qu'une
    // waveform fausse, interprétée selon un format qui a changé.
    if (donnees.v !== 1 || !Array.isArray(donnees.peaks)) return null;
    return donnees.peaks.filter((p): p is number => typeof p === "number");
  } catch {
    return null;
  }
}

/**
 * Réduit les pics à la largeur d'affichage en gardant le **maximum** de chaque
 * intervalle, et non la moyenne : une moyenne lisserait les attaques, et la
 * waveform perdrait précisément ce qu'on y cherche — les repères visuels.
 */
export function echantillonnerPics(pics: number[], largeur: number): number[] {
  if (pics.length === 0 || largeur <= 0) return [];
  if (pics.length <= largeur) return pics;

  const parIntervalle = pics.length / largeur;
  const sortie: number[] = [];
  for (let i = 0; i < largeur; i++) {
    const debut = Math.floor(i * parIntervalle);
    const fin = Math.min(pics.length, Math.floor((i + 1) * parIntervalle));
    let max = 0;
    for (let j = debut; j < fin; j++) if (pics[j] > max) max = pics[j];
    sortie.push(max);
  }
  return sortie;
}
```

- [x] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- peaks`
Expected: `Tests: 7 passed`

- [x] **Step 5: Commit**

```bash
git add src/lib/peaks.ts __tests__/peaks.test.ts
git commit -m "feat(audio): lecture des pics de waveform du media-worker"
```

---

### Task 3: Waveform navigable au toucher

**Files:**
- Create: `src/components/audio/waveform.tsx`

- [x] **Step 1: Composant**

Barres verticales dessinées en `View` — pas de SVG : `react-native-svg` est présent, mais un millier de `Rect` coûte plus cher qu'un millier de `View` de largeur fixe, et l'échantillonnage ramène de toute façon à ~60 barres.

Props : `pics: number[]`, `progression: number` (0 à 1), `surDeplacer: (ratio: number) => void`.

Trois exigences :

- **hauteur minimale de barre** : une barre de hauteur nulle sur un passage silencieux fait croire à un défaut d'affichage. Plancher à 2 px.
- **navigation au toucher** : `onLayout` pour connaître la largeur, `PanResponder` pour suivre le doigt, et appeler `surDeplacer` au relâchement **et** pendant le glissement.
- **zone tactile d'au moins 44 px de haut**, quitte à ce que les barres en occupent moins — une bande de 24 px serait difficile à viser.

- [x] **Step 2: État de repli**

Quand `pics` est vide — audio pas encore analysé, ou analyse échouée — afficher une barre de progression simple plutôt qu'un vide. Un audio déposé il y a dix secondes n'a pas encore ses pics : c'est un état normal, pas une erreur.

- [x] **Step 3: Vérifier et commiter**

`npx tsc --noEmit && npm test && npm run lint`, puis sur appareil : la barre suit la lecture, le toucher déplace, le glissement suit le doigt.

```bash
git add src/components/audio/waveform.tsx
git commit -m "feat(audio): waveform navigable au toucher"
```

---

### Task 4: Écran du labo et transport

**Files:**
- Create: `src/components/audio/labo-audio.tsx`
- Modify: `app/groupes/[id]/seances/[seanceId].tsx`

- [x] **Step 1: Moteur**

Un `AudioContext`, un `AudioBufferSourceNode` relié à un `GainNode` puis à la destination. Le graphe est monté ainsi dès maintenant, alors qu'un `GainNode` seul paraît superflu : les tâches suivantes viendront insérer les filtres de l'égaliseur entre la source et lui, sans avoir à défaire le câblage.

Point de vigilance : un `AudioBufferSourceNode` **ne se relit pas**. Chaque reprise après pause exige d'en créer un nouveau et de rappeler `start(0, offset)`. La position courante doit donc être suivie à part, à partir de `context.currentTime` et de l'instant de démarrage.

- [x] **Step 2: Transport**

Lecture, pause, saut de 10 s, position et durée affichées. Réutiliser `formatTemps` de `lecteur-audio-modal.tsx` en l'extrayant dans `src/lib/format.ts` plutôt qu'en le recopiant.

- [x] **Step 3: Point d'entrée**

Sur chaque audio de répétition, une action « Labo » à côté de l'écoute simple. Le lecteur habituel reste le geste par défaut : le labo est un outil de travail, pas le mode d'écoute courant.

- [x] **Step 4: Comptage des écoutes**

**Ne pas** brancher le comptage des écoutes sur le labo. Travailler un passage en boucle à vitesse réduite n'est pas « écouter l'audio » au sens du suivi du chef, et gonflerait le compteur sans rapport avec l'usage mesuré.

- [x] **Step 5: Vérifier et commiter**

Sur appareil : ouvrir le labo sur un audio analysé, vérifier que la waveform s'affiche, que la lecture démarre, que le saut fonctionne et que la position reste juste après plusieurs pauses.

```bash
git add src/components/audio/labo-audio.tsx "app/groupes/[id]/seances/[seanceId].tsx" src/lib/format.ts
git commit -m "feat(audio): écran du labo avec transport et waveform"
```

---

## Vérification finale du lot

- [x] `npm test`, `npx tsc --noEmit`, `npm run lint` — tout passe
- [x] `npm ls react-native-worklets` — **toujours 0.5.1**
- [x] `UIBackgroundModes` toujours `['audio']`, non dupliqué
- [x] Sur appareil : décodage mesuré et consigné, waveform affichée, transport juste
- [ ] Le lecteur simple existant fonctionne toujours — chat, fichiers, séances

## Suites envisagées

| Lot | Contenu | Dépend de |
|---|---|---|
| E2 | Tempo (`playbackRate` + `pitchCorrection`), transposition (`detune`), métronome, boucle A/B | E1 |
| E3 | Égaliseur graphique (`BiquadFilterNode`, types lowshelf/peaking/highshelf, gain −40 à +40 dB) | E1 |
| E4 | Stems et tonalité via Fadr | indépendant |
| E5 | Génération musicale via Kie.ai / Suno | indépendant |
