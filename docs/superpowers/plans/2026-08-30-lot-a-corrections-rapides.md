# Lot A — Corrections rapides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer les cinq corrections d'ergonomie indépendantes (téléchargement audio, saisie multiligne, copie de message, auteur visible, édition/suppression de projet personnel) sans toucher au moteur audio ni à la base.

**Architecture:** Chaque correction extrait d'abord sa logique dans une fonction pure testable (`src/lib/`), puis câble l'interface qui l'appelle. Deux duplications existantes sont supprimées au passage : le téléchargement, aujourd'hui écrit dans `modal-detail-fichier.tsx`, devient partagé ; l'affichage de l'auteur, aujourd'hui régi par une condition fautive, passe dans un helper testé.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, jest-expo + @testing-library/react-native (introduits par la tâche 0), expo-clipboard (nouvelle dépendance).

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `src/lib/telechargement.ts` | Télécharger une URL vers le cache puis ouvrir la feuille de partage | créé (T1) |
| `src/lib/chat-affichage.ts` | Règles d'affichage de l'auteur d'un message | créé (T4) |
| `src/components/ui/lecteur-audio-modal.tsx` | Bouton Télécharger dans l'en-tête | modifié (T1) |
| `src/components/groupe/modal-detail-fichier.tsx` | Consomme le helper partagé | modifié (T1) |
| `app/groupes/[id]/chat.tsx` | Saisie multiligne, action Copier, en-tête d'auteur | modifié (T2, T3, T4) |
| `app/projets/[id].tsx` | Actions Modifier / Supprimer | modifié (T5) |
| `__tests__/` | Tests unitaires des helpers | créé (T0) |

---

### Task 0: Harness de test

Le projet n'a aucun test aujourd'hui (`package.json` n'expose que `start`, `android`, `ios`, `web`, `lint`). Sans harnais, les tâches suivantes ne peuvent pas être vérifiées autrement qu'à l'œil sur l'appareil.

**Files:**
- Modify: `package.json`
- Create: `__tests__/exemple.test.ts`

- [ ] **Step 1: Installer les dépendances de test**

```bash
npx expo install --dev jest-expo jest @types/jest
npm install --save-dev @testing-library/react-native
```

- [ ] **Step 2: Déclarer le script et le preset dans `package.json`**

Ajouter dans `"scripts"` :

```json
"test": "jest"
```

Ajouter à la racine de `package.json` :

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg))"
  ]
}
```

- [ ] **Step 3: Écrire un test de fumée**

Créer `__tests__/exemple.test.ts` :

```ts
describe("harnais", () => {
  it("exécute un test", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Vérifier que le harnais tourne**

Run: `npm test`
Expected: `Tests: 1 passed`

- [ ] **Step 5: Vérifier que rien n'est cassé**

Run: `npx tsc --noEmit && npx expo install --check`
Expected: aucune erreur ; aucune dépendance signalée obsolète.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json __tests__/exemple.test.ts
git commit -m "test: harnais jest-expo"
```

---

### Task 1: Téléchargement partagé + icône dans le lecteur audio

`modal-detail-fichier.tsx:60-80` contient déjà un téléchargement fonctionnel. On l'extrait pour que le lecteur audio s'en serve aussi, au lieu d'en écrire un second.

**Files:**
- Create: `src/lib/telechargement.ts`
- Create: `__tests__/telechargement.test.ts`
- Modify: `src/components/ui/lecteur-audio-modal.tsx`
- Modify: `src/components/groupe/modal-detail-fichier.tsx:60-80`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `__tests__/telechargement.test.ts` :

```ts
import { nettoyerNom } from "../src/lib/telechargement";

describe("nettoyerNom", () => {
  it("remplace les caractères refusés par un système de fichiers", () => {
    expect(nettoyerNom("a/b:c*d.m4a")).toBe("a_b_c_d.m4a");
  });

  it("remplace les accents, que \\w ne reconnaît pas", () => {
    expect(nettoyerNom("Répétition.m4a")).toBe("R_p_tition.m4a");
  });

  it("retombe sur un nom par défaut quand tout est retiré", () => {
    expect(nettoyerNom("")).toBe("audio");
  });

  it("borne la longueur à 80 caractères", () => {
    expect(nettoyerNom("a".repeat(200))).toHaveLength(80);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- telechargement`
Expected: FAIL — `Cannot find module '../src/lib/telechargement'`

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/lib/telechargement.ts` :

```ts
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Retire les caractères qu'un système de fichiers refuse, et borne la longueur. */
export function nettoyerNom(nom: string): string {
  return nom.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "audio";
}

/**
 * Télécharge une URL dans le cache puis ouvre la feuille de partage système.
 * Retourne "partage" si la feuille s'est ouverte, "cache" si le partage est
 * indisponible sur l'appareil — dans ce cas le fichier est bien téléchargé.
 */
export async function telechargerEtPartager(
  url: string,
  nomFichier: string,
  mimeType?: string
): Promise<"partage" | "cache"> {
  const destination = new File(Paths.cache, `soundboss-${Date.now()}-${nettoyerNom(nomFichier)}`);
  await File.downloadFileAsync(url, destination);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destination.uri, { mimeType, dialogTitle: nomFichier });
    return "partage";
  }
  return "cache";
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- telechargement`
Expected: `Tests: 4 passed`

- [ ] **Step 5: Ajouter le bouton dans le lecteur audio**

Dans `src/components/ui/lecteur-audio-modal.tsx`, ajouter aux imports :

```tsx
import { telechargerEtPartager } from "@/lib/telechargement";
import { useDialogue } from "@/lib/dialogue";
```

Dans le corps de `LecteurAudioModal`, après `const [imageResolue, setImageResolue] = useState<string | null>(null);` :

```tsx
const dialogue = useDialogue();
const [enTelechargement, setEnTelechargement] = useState(false);

async function telecharger() {
  if (!piste) return;
  setEnTelechargement(true);
  try {
    const resultat = await telechargerEtPartager(piste.url, `${piste.titre}.m4a`, "audio/mp4");
    if (resultat === "cache") dialogue.succes("Audio téléchargé.");
  } catch {
    dialogue.erreur("Impossible de télécharger cet audio.");
  } finally {
    setEnTelechargement(false);
  }
}
```

Dans l'en-tête, insérer ce `Pressable` **juste avant** celui qui porte `accessibilityLabel="Fermer le lecteur"` :

```tsx
<Pressable
  onPress={telecharger}
  disabled={enTelechargement || !piste}
  accessibilityRole="button"
  accessibilityLabel="Télécharger l'audio"
  style={{
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.surfaceCarte,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    opacity: enTelechargement ? 0.5 : 1,
  }}
>
  <Ionicons name="download-outline" size={20} color={couleurs.warmGold} />
</Pressable>
```

- [ ] **Step 6: Faire consommer le helper par `modal-detail-fichier.tsx`**

Remplacer le corps de `telecharger()` (lignes 60-80) par :

```tsx
  async function telecharger() {
    if (!fichier) return;
    setEnTelechargement(true);
    try {
      const url = await urlLectureR2(fichier.cle);
      if (!url) throw new Error("Impossible d'obtenir le fichier.");
      const resultat = await telechargerEtPartager(url, fichier.nom, mimeDepuisType(fichier.type));
      if (resultat === "cache") dialogue.succes("Fichier téléchargé.");
    } catch {
      dialogue.erreur("Impossible de télécharger le fichier.");
    } finally {
      setEnTelechargement(false);
    }
  }
```

Ajouter l'import `import { telechargerEtPartager } from "@/lib/telechargement";` et retirer les imports devenus inutiles `File`, `Paths` et `Sharing` **si plus aucun autre appel ne les utilise** (vérifier par `grep -n "Paths\.\|Sharing\.\|new File(" src/components/groupe/modal-detail-fichier.tsx`).

- [ ] **Step 7: Vérifier**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add src/lib/telechargement.ts __tests__/telechargement.test.ts src/components/ui/lecteur-audio-modal.tsx src/components/groupe/modal-detail-fichier.tsx
git commit -m "feat(audio): bouton Télécharger dans le lecteur, logique de téléchargement partagée"
```

---

### Task 2: Saisie multiligne dans le chat

Le `TextInput` de composition n'a pas la prop `multiline` : le texte défile horizontalement sur une seule ligne au lieu de revenir à la ligne.

**Files:**
- Modify: `app/groupes/[id]/chat.tsx:877-894`

- [ ] **Step 1: Rendre le champ multiligne**

Remplacer le `TextInput` de composition par :

```tsx
          <TextInput
            ref={inputTexte}
            placeholder="Écris un message…"
            placeholderTextColor={couleurs.texteFaible}
            value={texte}
            onChangeText={setTexte}
            multiline
            submitBehavior="newline"
            textAlignVertical="top"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 22,
              backgroundColor: couleurs.surfaceCarte,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 12 : 8,
              paddingBottom: Platform.OS === "ios" ? 12 : 8,
              color: couleurs.texte,
              fontFamily: police.regular,
              fontSize: 15,
            }}
          />
```

Trois points comptent ici. `onSubmitEditing` **disparaît** : avec `multiline`, la touche Entrée doit insérer un saut de ligne, pas envoyer — l'envoi reste au bouton. `submitBehavior="newline"` l'exprime explicitement (RN 0.81 ; il remplace l'ancien `blurOnSubmit`). `maxHeight: 120` empêche le champ de manger l'écran sur un texte long ; au-delà, il défile.

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Vérifier sur appareil**

Lancer `npm start`, ouvrir un chat de groupe, taper un texte de plus de trois lignes.
Expected: le texte revient à la ligne, le champ grandit jusqu'à 120 px puis défile, la touche Entrée insère un saut de ligne, le bouton d'envoi fonctionne toujours.

- [ ] **Step 4: Commit**

```bash
git add app/groupes/\[id\]/chat.tsx
git commit -m "fix(chat): saisie multiligne, le texte long revient à la ligne"
```

---

### Task 3: Copier un message

**Files:**
- Modify: `package.json` (dépendance)
- Modify: `app/groupes/[id]/chat.tsx` (menu d'actions, ~L1170-1230)

- [ ] **Step 1: Installer expo-clipboard**

```bash
npx expo install expo-clipboard
```

- [ ] **Step 2: Vérifier qu'aucune version n'a été hissée de travers**

Run: `npm ls expo-clipboard && npx expo install --check`
Expected: une seule version, cohérente avec le SDK 54. Ce contrôle n'est pas rhétorique : c'est une peerDependency non bornée qui a fait planter le build Android au lancement (voir `mobile_dev_plan.md`, section Notes & pièges).

- [ ] **Step 3: Ajouter l'action au menu**

Dans `app/groupes/[id]/chat.tsx`, ajouter aux imports :

```tsx
import * as Clipboard from "expo-clipboard";
```

Ajouter `onCopier` aux props de `MenuActionsMessage` :

```tsx
  onCopier,
}: {
  message: MessageChat | null;
  monId: string | null;
  estGestionnaire: boolean;
  onFermer: () => void;
  onModifier: (message: MessageChat) => void;
  onSupprimer: (message: MessageChat) => void;
  onRepondre: (message: MessageChat) => void;
  onCopier: (message: MessageChat) => void;
}) {
```

Dans le corps du menu, ajouter cette entrée **avant** le bloc `{modifiable && (` :

```tsx
          {!!message.contenu && (
            <Pressable
              onPress={() => onCopier(message)}
              accessibilityRole="button"
              accessibilityLabel="Copier le message"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: rayons.md,
              }}
            >
              <Ionicons name="copy-outline" size={19} color={couleurs.texte} />
              <Texte poids="semibold">Copier</Texte>
            </Pressable>
          )}
```

- [ ] **Step 4: Brancher le handler sur l'appel du menu (~L928)**

Ajouter cette prop à `<MenuActionsMessage … />` :

```tsx
        onCopier={async (message) => {
          await Clipboard.setStringAsync(message.contenu ?? "");
          setMenuMessage(null);
          dialogue.succes("Message copié.");
        }}
```

Si `dialogue` n'est pas déjà dans la portée du composant, ajouter `const dialogue = useDialogue();` près des autres hooks et l'import `import { useDialogue } from "@/lib/dialogue";`.

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

Sur appareil : appui long sur un message texte → « Copier » apparaît → coller dans un autre champ restitue le texte. Vérifier qu'un message sans texte (pièce jointe seule) n'affiche pas l'entrée.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/groupes/\[id\]/chat.tsx
git commit -m "feat(chat): copier un message dans le presse-papier"
```

---

### Task 4: Auteur visible sur chaque message

Bug de fond à corriger. `chat.tsx:432` calcule `const afficherAvatar = moi || nouveauJour;` puis rend l'avatar sous condition `{!moi && afficherAvatar && …}`. La conjonction se réduit à `!moi && nouveauJour` : **l'avatar n'apparaît qu'au premier message d'une journée**, et aucun nom n'est jamais affiché. D'où l'impossibilité de savoir qui parle.

**Files:**
- Create: `src/lib/chat-affichage.ts`
- Create: `__tests__/chat-affichage.test.ts`
- Modify: `app/groupes/[id]/chat.tsx:432` et `:488-495`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `__tests__/chat-affichage.test.ts` :

```ts
import { debutDeSerie, nomAuteur } from "../src/lib/chat-affichage";

describe("nomAuteur", () => {
  it("compose prénom et nom", () => {
    expect(nomAuteur({ id: "1", prenom: "Awa", nom: "Diop" })).toBe("Awa Diop");
  });

  it("tolère un nom manquant", () => {
    expect(nomAuteur({ id: "1", prenom: "Awa", nom: null })).toBe("Awa");
  });

  it("retombe sur un libellé neutre quand tout manque", () => {
    expect(nomAuteur(null)).toBe("Membre");
  });
});

describe("debutDeSerie", () => {
  const a = { user_id: "a" };
  const b = { user_id: "b" };

  it("affiche l'en-tête sur le tout premier message", () => {
    expect(debutDeSerie(a, null, false)).toBe(true);
  });

  it("affiche l'en-tête quand l'auteur change", () => {
    expect(debutDeSerie(b, a, false)).toBe(true);
  });

  it("masque l'en-tête sur un message consécutif du même auteur", () => {
    expect(debutDeSerie(a, a, false)).toBe(false);
  });

  it("réaffiche l'en-tête à chaque nouveau jour", () => {
    expect(debutDeSerie(a, a, true)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- chat-affichage`
Expected: FAIL — `Cannot find module '../src/lib/chat-affichage'`

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/chat-affichage.ts` :

```ts
export interface AuteurMessage {
  id: string;
  prenom: string | null;
  nom: string | null;
}

/** Nom affiché au-dessus d'une bulle : « Prénom Nom », sinon « Membre ». */
export function nomAuteur(user: AuteurMessage | null | undefined): string {
  const complet = `${user?.prenom ?? ""} ${user?.nom ?? ""}`.trim();
  return complet || "Membre";
}

/**
 * Un en-tête (avatar + nom) n'est affiché qu'au début d'une série : premier
 * message, changement d'auteur, ou nouveau jour. Les messages consécutifs d'un
 * même auteur restent nus, pour ne pas alourdir la conversation.
 */
export function debutDeSerie(
  message: { user_id: string },
  precedent: { user_id: string } | null,
  nouveauJour: boolean
): boolean {
  if (nouveauJour) return true;
  if (!precedent) return true;
  return precedent.user_id !== message.user_id;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- chat-affichage`
Expected: `Tests: 7 passed`

- [ ] **Step 5: Câbler dans le chat**

Ajouter l'import :

```tsx
import { debutDeSerie, nomAuteur } from "@/lib/chat-affichage";
```

Remplacer `const afficherAvatar = moi || nouveauJour;` (L432) par :

```tsx
            const afficherEntete = !moi && debutDeSerie(message, precedent ?? null, nouveauJour);
```

Ne pas redéclarer `precedent` : la ligne `const precedent = messages[index - 1];` existe déjà juste au-dessus, dans le `renderItem` du `FlatList`. Le `?? null` est nécessaire — à l'index 0 elle vaut `undefined`, que la signature de `debutDeSerie` n'accepte pas.

Remplacer le bloc avatar (L488-495) par :

```tsx
                  {!moi && (
                    <View style={{ width: 30 }}>
                      {afficherEntete && (
                        <Avatar
                          prenom={message.user?.prenom}
                          nom={message.user?.nom}
                          url={message.user?.avatar_url}
                          taille={30}
                        />
                      )}
                    </View>
                  )}
```

Le `View` de largeur fixe est important : il réserve la gouttière même quand l'avatar est masqué, pour que les bulles consécutives restent alignées.

Puis, à l'intérieur du `Pressable` de la bulle, **juste avant** le bloc `{message.parent && (`, ajouter le nom :

```tsx
                    {afficherEntete && (
                      <Texte
                        variante="micro"
                        poids="bold"
                        couleur={couleurs.warmGold}
                        numberOfLines={1}
                        style={{ marginBottom: 4 }}
                      >
                        {nomAuteur(message.user)}
                      </Texte>
                    )}
```

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: aucune erreur.

Sur appareil, dans un chat de groupe à plusieurs participants : chaque changement d'auteur affiche photo + nom ; les messages consécutifs d'une même personne n'affichent ni l'un ni l'autre mais restent alignés ; mes propres messages restent à droite, sans en-tête.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chat-affichage.ts __tests__/chat-affichage.test.ts app/groupes/\[id\]/chat.tsx
git commit -m "fix(chat): afficher photo et nom de l'expéditeur à chaque changement d'auteur"
```

---

### Task 5: Modifier / supprimer un projet personnel

Aucune migration n'est nécessaire : `modifier_projet` et `supprimer_projet` existent en base, `est_chef_ou_admin_du_projet` accepte explicitement le **propriétaire** (« chef/admin du groupe ou propriétaire requis »), et les hooks `useModifierProjet` / `useSupprimerProjet` sont déjà écrits dans `src/lib/queries/projets.ts:152-193`. Seule l'interface manque. `FormulaireProjet` accepte déjà un `projet` en entrée, donc gère l'édition.

**Files:**
- Modify: `app/projets/[id].tsx:115-122` (barre supérieure) et corps du composant

- [ ] **Step 1: Ajouter les imports et l'état**

Aux imports de `app/projets/[id].tsx`, ajouter :

```tsx
import { Modal } from "react-native";
import { FormulaireProjet } from "@/components/projet/formulaire-projet";
```

Ajouter `useDroitsProjet`, `useSupprimerProjet` à l'import existant depuis `@/lib/queries/projets`.

Dans le corps du composant, près des autres hooks :

```tsx
  // useDroitsProjet renvoie un booléen nu (RPC est_chef_ou_admin_du_projet),
  // pas un objet de droits — voir src/lib/queries/projets.ts:61.
  const { data: peutGerer } = useDroitsProjet(id);
  const supprimerProjet = useSupprimerProjet();
  const [modeEditionProjet, setModeEditionProjet] = useState(false);
```

- [ ] **Step 2: Écrire le handler de suppression**

```tsx
  async function supprimerCeProjet() {
    const confirme = await dialogue.confirmer({
      titre: "Supprimer ce projet ?",
      message: "Le projet, son répertoire et ses tâches seront définitivement supprimés.",
      danger: true,
    });
    if (!confirme) return;
    try {
      await supprimerProjet.mutateAsync(id);
      router.back();
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }
```

`OptionsConfirmation` accepte `titre`, `message?`, `boutonConfirmer?`, `boutonAnnuler?` et `danger?` (`src/lib/dialogue.tsx:11-18`). Le champ de style destructif s'appelle bien **`danger`**, et vaut `true` par défaut.

- [ ] **Step 3: Ajouter les boutons dans la barre supérieure**

Remplacer le bloc de la barre supérieure (L115-122) par :

```tsx
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
            {projet.groupe_id ? "Projet du groupe" : "Projet personnel"}
          </Texte>
          {peutGerer && (
            <>
              <Pressable
                onPress={() => setModeEditionProjet(true)}
                accessibilityRole="button"
                accessibilityLabel="Modifier le projet"
                hitSlop={10}
                style={{ width: 40, alignItems: "center" }}
              >
                <Ionicons name="create-outline" size={20} color={couleurs.warmGold} />
              </Pressable>
              <Pressable
                onPress={supprimerCeProjet}
                accessibilityRole="button"
                accessibilityLabel="Supprimer le projet"
                hitSlop={10}
                style={{ width: 40, alignItems: "center" }}
              >
                <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
              </Pressable>
            </>
          )}
        </View>
```

`peutGerer` est le booléen renvoyé par la RPC : `true` pour le chef ou un admin du groupe, et pour le **propriétaire** d'un projet personnel. C'est exactement la garde voulue.

- [ ] **Step 4: Ajouter la modale d'édition**

Avant la fermeture de `</Ecran>` :

```tsx
      <Modal
        visible={modeEditionProjet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModeEditionProjet(false)}
      >
        <Ecran>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <FormulaireProjet
              projet={projet}
              groupeId={projet.groupe_id}
              onAnnuler={() => setModeEditionProjet(false)}
            />
          </ScrollView>
        </Ecran>
      </Modal>
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

Sur appareil : ouvrir un projet personnel depuis l'onglet Projets → les deux icônes apparaissent → « Modifier » ouvre le formulaire pré-rempli et l'enregistrement met la fiche à jour → « Supprimer » demande confirmation puis revient à la liste, le projet ayant disparu. Ouvrir ensuite un projet de groupe dont on n'est **pas** chef : les icônes ne doivent pas apparaître.

- [ ] **Step 6: Commit**

```bash
git add app/projets/\[id\].tsx
git commit -m "feat(projets): modifier et supprimer un projet personnel"
```

---

## Vérification finale du lot

- [ ] `npm test` — tous les tests passent
- [ ] `npx tsc --noEmit` — aucune erreur
- [ ] `npm run lint` — aucune erreur
- [ ] `npm ls expo-clipboard react-native-worklets` — une seule version de chacun
- [ ] Build `preview` Android installé sur appareil : les cinq corrections se comportent comme décrit

---

## Plans suivants (à rédiger le moment venu)

| Plan | Contenu | Dépend de |
|---|---|---|
| Lot B — Robustesse de session | Écran hors-ligne sans déconnexion, lecture en arrière-plan | — |
| Lot C — Audios de répétition | Renommage, `pupitre_id`, table d'écoutes ≥ 30 %, vue chef | migration base |
| Lot D — Container média | Repointage sur ZikMaster, waveform, BPM et tonalité (aubio/Essentia) | Bunny Magic Containers |
| Lot E — Labo audio | `react-native-audio-api`, onglets, tempo, `detune`, métronome, boucle A/B, égaliseur, stems Fadr, Suno | Lots C et D |
