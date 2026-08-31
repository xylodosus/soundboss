# Lot E2 — Tempo, transposition, boucle et métronome Implementation Plan

**Statut : implémenté le 31 août 2026, reste la vérification à l'oreille sur appareil.**

**Goal:** Faire du labo un outil de travail : ralentir sans changer la tonalité,
transposer sans changer le tempo, boucler un passage, et battre la mesure.

**Prérequis livré (E1) :** moteur `react-native-audio-api` 0.12.0, tampon décodé
à `contexte.sampleRate` et mis en cache, waveform navigable, transport.

---

## Ce que le natif impose

Lecture faite de `AudioBufferBaseSourceNode.cpp` — la documentation ne dit rien
de tout ceci.

**Deux chemins de traitement, et un seul rend les contrôles indépendants.**

| `pitchCorrection` | Traitement | Conséquence |
|---|---|---|
| `false` | `computedPlaybackRate = playbackRate * detune` | un simple taux de lecture : la hauteur suit le tempo |
| `true` | `playbackRate` étire le temps, `detune` transpose via `setTransposeSemitones` | **tempo et tonalité indépendants** |

`pitchCorrection` se fixe à la construction — `createBufferSource(pitchCorrection?)` —
donc en changer impose de recréer le nœud. Ce n'est pas un obstacle : le nœud est
déjà recréé à chaque reprise et à chaque saut.

**Le piège de la remise à zéro.**

```cpp
if (detune != 0.0f) {
  stretch_->setTransposeSemitones(detune);
}
```

Repasser `detune` à zéro exact ne réinitialise **jamais** la transposition : le
garde-fou saute l'appel et le stretcher reste calé sur la dernière valeur non
nulle. Il faut donc revenir par une valeur infinitésimale — un centième de cent,
inaudible, mais non nulle.

**Bornes.** `playbackRate` écrêté à [0, 3]. `detune` écrêté à ±12 demi-tons.
Nos plages utiles sont plus étroites de toute façon.

**Ordre des appels.** `setTransposeSemitones` est appelé *après* `process()` :
un changement prend effet au quantum suivant. Sans conséquence perceptible.

## Décisions prises

**Correction de hauteur seulement quand elle sert.** Le nœud est créé avec
`pitchCorrection` uniquement si le tempo ou la transposition quittent le neutre.
À 1× sans transposition, le signal ne traverse pas le stretcher — pas de coût
processeur ni d'artefact sur une écoute normale, ce qui compte sur un appareil
de 2018. Franchir la frontière recrée le nœud à la position courante.

**Le métronome ne peut pas se caler tout seul.** La base ne contient que le
`bpm`, jamais l'instant du premier temps : `aubiotrack` sort les positions des
battements mais le conteneur n'en garde que la médiane des intervalles. Un clic
au bon tempo mais décalé de la musique est pire qu'aucun clic. Le tempo est donc
prérempli depuis la base et **modifiable**, et un bouton « Caler » fixe la phase
sur la position de lecture courante. Aucune migration, et ça marche même quand
la détection s'est trompée.

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `src/lib/metronome.ts` | Calcul des instants de clic, pur et testé | créé (T3) |
| `__tests__/metronome.test.ts` | Tests du calcul | créé (T3) |
| `src/components/audio/labo-audio.tsx` | Contrôles, graphe, ordonnanceur | modifié (T1, T2, T3) |
| `src/components/audio/reglage-labo.tsx` | Réglage à curseur réutilisable | créé (T1) |

---

### Task 1: Tempo et transposition

- [x] **Step 1: Réglage réutilisable**

`reglage-labo.tsx` : libellé, valeur formatée, boutons − et +, cible tactile de
44 px, et un appui long sur la valeur pour revenir au neutre. Pas de curseur
continu : sur un morceau qu'on travaille, on veut des paliers reproductibles,
pas une valeur qu'on ne retrouvera pas demain.

Tempo : 0,5× à 1,5× par pas de 0,05. Transposition : −6 à +6 demi-tons par pas de 1.

- [x] **Step 2: Câbler les paramètres**

Dans `demarrer(offset)`, calculer `correction = tempo !== 1 || transposition !== 0`
et créer le nœud avec `createBufferSource(correction)`. Poser
`playbackRate.value = tempo` et `detune.value = transposition * 100` avant `start`.

- [x] **Step 3: Changement en cours de lecture**

Si la correction est déjà active et le reste, écrire directement dans
`playbackRate.value` et `detune.value` — pas de recréation, donc pas de coupure.
Si la frontière du neutre est franchie, recréer le nœud à `positionRef.current`.

Pour la remise à zéro de la transposition, écrire `0.01` cent et non `0`, en
raison du garde-fou natif. Commenter, sinon quelqu'un « corrigera » la valeur.

- [x] **Step 4: Vérifier sur appareil**

Ralentir à 0,7× : le morceau doit garder sa tonalité. Transposer de +2 : la
tonalité monte sans que le tempo bouge. Revenir au neutre : **le son doit
redevenir exactement l'original** — c'est le test du piège `detune != 0`.

---

### Task 2: Boucle A/B

- [x] **Step 1: Marqueurs**

Deux boutons, A et B, qui posent les bornes à la position courante. B refuse une
valeur inférieure à A. Un troisième les efface.

- [x] **Step 2: Câblage**

Sur le nœud : `loop = true`, `loopStart = a`, `loopEnd = b`. À poser avant
`start`, et donc à réappliquer à chaque recréation du nœud.

- [x] **Step 3: Rendu sur la waveform**

Zone bornée teintée sur la waveform, pour qu'on voie ce qu'on boucle sans lire
deux nombres. Passer `boucle` en option à `Waveform`.

---

### Task 3: Métronome

- [x] **Step 1: Test du calcul**

`__tests__/metronome.test.ts` sur `clicsDansHorizon(position, phase, bpm, horizon)` :
rend les instants de clic, en temps du tampon, compris dans `[position, position + horizon)`.
Cas : phase nulle, phase décalée, position au milieu d'une mesure, bpm absurde
(rendre un tableau vide plutôt que boucler à l'infini).

- [x] **Step 2: Implémenter**

`src/lib/metronome.ts`. Refuser un bpm hors de [30, 300] en rendant `[]`.

- [x] **Step 3: Ordonnanceur**

Un `setInterval` de 100 ms qui programme les clics 300 ms à l'avance. Chaque clic
est un `OscillatorNode` court passé par un `GainNode` en enveloppe percussive,
branché sur la destination — **pas** sur le gain du morceau, sinon l'égaliseur du
lot E3 filtrerait le clic.

Conversion du temps tampon vers le temps contexte :
`tContexte = maintenant + (tTampon − positionCourante) / tempo`.
Le tempo entre bien au dénominateur : à 0,8×, une seconde de morceau dure
1,25 seconde réelle.

- [x] **Step 4: Contrôles**

Interrupteur, bpm prérempli depuis `enregistrement.bpm` et modifiable, bouton
« Caler » qui fixe la phase à la position courante.

- [x] **Step 5: Vérifier sur appareil**

Le clic doit rester aligné après un saut, après une pause, et après un changement
de tempo.

---

## Vérification finale du lot

- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`
- [ ] Retour au neutre : son identique à l'original (piège `detune != 0`)
- [ ] Le tampon reste en cache : rouvrir le même morceau est immédiat
- [ ] Le lecteur courant n'est pas touché
