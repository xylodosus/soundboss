# Lot B — Robustesse de session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cesser de déconnecter l'utilisateur quand le réseau tombe, lui présenter un écran hors-ligne explicite à la place, et permettre à la lecture audio de continuer en arrière-plan.

**Architecture:** Trois couches distinctes. D'abord la cause racine — brider le rafraîchissement de jeton Supabase quand l'app est en arrière-plan ou hors ligne, ce qui empêche la destruction de la session. Ensuite la garde de navigation, dont la décision passe dans une fonction pure testable au lieu d'une condition en ligne. Enfin la configuration audio d'arrière-plan, purement déclarative.

**Tech Stack:** Expo SDK 54, `expo-network` (nouvelle dépendance native), `@supabase/auth-js` 2.109.0, `expo-audio`, `AppState` de React Native.

---

## Diagnostic — pourquoi l'app renvoie au login

Relevé dans `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`, commentaire du code lui-même :

> `_callRefreshToken` is the single source of truth for refresh outcomes: **it removes the session itself when the access token is actually expired**, and preserves it when the token is still valid (proactive-preserve).

Enchaînement observé : l'utilisateur ouvre l'app hors ligne plus d'une heure après le dernier rafraîchissement réussi → le jeton d'accès est réellement expiré → `_callRefreshToken` échoue faute de réseau → **la session est effacée de SecureStore** et `SIGNED_OUT` est émis → `session` devient `null` dans `FournisseurSession` → `app/(tabs)/_layout.tsx:41` exécute `<Redirect href="/connexion" />`.

Deux conséquences, dont la seconde est la plus grave :
1. L'écran de login s'affiche à la place de l'app.
2. **La session est détruite** : revenir en ligne ne la restaure pas, l'utilisateur doit ressaisir ses identifiants.

Corriger uniquement la garde (tâche 2) masquerait le symptôme sans empêcher la destruction. C'est pourquoi la tâche 1 vient d'abord.

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `src/lib/reseau.tsx` | Fournit l'état réseau et pilote le rafraîchissement Supabase | créé (T1) |
| `src/lib/garde-session.ts` | Décide quoi afficher selon session, réseau et chargement | créé (T2) |
| `src/components/ui/ecran-hors-ligne.tsx` | Écran hors-ligne avec réessai | créé (T2) |
| `app/_layout.tsx` | Monte le fournisseur réseau | modifié (T1) |
| `app/(tabs)/_layout.tsx:40-43` | Consomme la décision de garde | modifié (T2) |
| `src/lib/audio-context.tsx:31-34` | Mode audio d'arrière-plan | modifié (T3) |
| `app.json` | `ios.infoPlist.UIBackgroundModes` | modifié (T3) |

---

### Task 1: Brider le rafraîchissement de jeton hors ligne et en arrière-plan

C'est le correctif de fond. Supabase recommande pour React Native de piloter `startAutoRefresh` / `stopAutoRefresh` selon l'`AppState` ; `src/lib/supabase.ts` ne le fait pas aujourd'hui. On étend le principe à l'état réseau, qui est la cause directe du problème.

**Files:**
- Create: `src/lib/reseau.tsx`
- Create: `__tests__/reseau.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `package.json` (dépendance)

- [ ] **Step 1: Installer expo-network**

```bash
npx expo install expo-network
```

- [ ] **Step 2: Vérifier qu'aucune version n'a été hissée de travers**

```bash
npm ls expo-network
npx expo install --check
node -e "for (const p of ['expo-asset','react-native-worklets','react']) console.log(p, require(`./node_modules/${p}/package.json`).version)"
```

Attendu : `expo-asset` en 12.0.13, `react-native-worklets` en 0.5.1, `react` en 19.1.0, et « Dependencies are up to date ». Ce contrôle n'est pas décoratif : une peerDependency non bornée a déjà fait planter tous les builds de ce projet.

- [ ] **Step 3: Écrire le test qui échoue**

Créer `__tests__/reseau.test.ts` :

```ts
import { doitRafraichirLaSession } from "../src/lib/reseau";

describe("doitRafraichirLaSession", () => {
  it("rafraîchit quand l'app est au premier plan et connectée", () => {
    expect(doitRafraichirLaSession("active", true)).toBe(true);
  });

  it("ne rafraîchit pas hors ligne — un échec détruirait la session", () => {
    expect(doitRafraichirLaSession("active", false)).toBe(false);
  });

  it("ne rafraîchit pas quand l'app est en arrière-plan", () => {
    expect(doitRafraichirLaSession("background", true)).toBe(false);
  });

  it("ne rafraîchit pas quand l'app est inactive", () => {
    expect(doitRafraichirLaSession("inactive", true)).toBe(false);
  });

  it("s'abstient tant que l'état réseau est inconnu", () => {
    expect(doitRafraichirLaSession("active", null)).toBe(false);
  });
});
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- reseau`
Expected: FAIL — `Cannot find module '../src/lib/reseau'`

- [ ] **Step 5: Écrire l'implémentation**

Créer `src/lib/reseau.tsx` :

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useNetworkState } from "expo-network";
import { supabase } from "./supabase";

/**
 * Le rafraîchissement de jeton ne doit tourner que si l'app est au premier plan
 * ET connectée. Hors ligne, un rafraîchissement échoue et @supabase/auth-js
 * efface la session de SecureStore quand le jeton est réellement expiré — la
 * reconnexion devient alors obligatoire. On s'abstient tant que l'état réseau
 * est inconnu (null), par prudence.
 */
export function doitRafraichirLaSession(
  etatApp: AppStateStatus,
  enLigne: boolean | null
): boolean {
  return etatApp === "active" && enLigne === true;
}

interface ContexteReseau {
  /** null tant que la première mesure n'est pas revenue. */
  enLigne: boolean | null;
}

const Contexte = createContext<ContexteReseau>({ enLigne: null });

export function FournisseurReseau({ children }: { children: React.ReactNode }) {
  const etatReseau = useNetworkState();
  const [etatApp, setEtatApp] = useState<AppStateStatus>(AppState.currentState);

  // `isInternetReachable` est plus fiable que `isConnected` : on peut être
  // associé à un Wi-Fi sans accès à Internet. On retient le plus prudent des
  // deux, et null tant qu'aucune mesure n'est disponible.
  const enLigne =
    etatReseau.isInternetReachable ?? etatReseau.isConnected ?? null;

  useEffect(() => {
    const abonnement = AppState.addEventListener("change", setEtatApp);
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (doitRafraichirLaSession(etatApp, enLigne)) {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  }, [etatApp, enLigne]);

  return <Contexte.Provider value={{ enLigne }}>{children}</Contexte.Provider>;
}

export function useReseau(): ContexteReseau {
  return useContext(Contexte);
}
```

- [ ] **Step 6: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- reseau`
Expected: `Tests: 5 passed`

- [ ] **Step 7: Monter le fournisseur dans le layout racine**

Dans `app/_layout.tsx`, ajouter l'import :

```tsx
import { FournisseurReseau } from "@/lib/reseau";
```

Puis envelopper `FournisseurSession` — l'ordre compte, le pilotage du rafraîchissement doit être en place avant que la session ne soit lue :

```tsx
    <QueryClientProvider client={queryClient}>
      <FournisseurReseau>
        <FournisseurSession>
```

et fermer `</FournisseurReseau>` après `</FournisseurSession>`.

- [ ] **Step 8: Vérifier**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: aucune erreur, tous les tests passent.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/lib/reseau.tsx __tests__/reseau.test.ts app/_layout.tsx
git commit -m "fix(session): brider le rafraîchissement de jeton hors ligne et en arrière-plan"
```

---

### Task 2: Écran hors-ligne au lieu du renvoi au login

**Files:**
- Create: `src/lib/garde-session.ts`
- Create: `__tests__/garde-session.test.ts`
- Create: `src/components/ui/ecran-hors-ligne.tsx`
- Modify: `app/(tabs)/_layout.tsx:40-43`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `__tests__/garde-session.test.ts` :

```ts
import { decisionGarde } from "../src/lib/garde-session";

describe("decisionGarde", () => {
  it("attend tant que la session n'est pas résolue", () => {
    expect(decisionGarde({ pret: false, aUneSession: false, enLigne: true })).toBe("attendre");
  });

  it("laisse passer dès qu'une session existe, même hors ligne", () => {
    expect(decisionGarde({ pret: true, aUneSession: true, enLigne: false })).toBe("autorise");
  });

  it("montre l'écran hors-ligne quand la session manque et que le réseau est coupé", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: false })).toBe("hors-ligne");
  });

  it("renvoie au login quand la session manque alors que le réseau fonctionne", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: true })).toBe("connexion");
  });

  it("renvoie au login quand l'état réseau est inconnu, pour ne pas piéger un utilisateur déconnecté", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: null })).toBe("connexion");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- garde-session`
Expected: FAIL — `Cannot find module '../src/lib/garde-session'`

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/garde-session.ts` :

```ts
export type DecisionGarde = "attendre" | "autorise" | "hors-ligne" | "connexion";

/**
 * Décide quoi afficher à l'entrée des onglets. Le cas qui motive cette
 * fonction : session absente **et** réseau coupé. Renvoyer au login serait
 * trompeur — l'utilisateur n'est pas déconnecté, il est injoignable.
 *
 * Quand l'état réseau est inconnu, on préfère le login : un utilisateur
 * réellement déconnecté doit pouvoir se connecter, et l'écran hors-ligne
 * l'enfermerait.
 */
export function decisionGarde({
  pret,
  aUneSession,
  enLigne,
}: {
  pret: boolean;
  aUneSession: boolean;
  enLigne: boolean | null;
}): DecisionGarde {
  if (!pret) return "attendre";
  if (aUneSession) return "autorise";
  if (enLigne === false) return "hors-ligne";
  return "connexion";
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- garde-session`
Expected: `Tests: 5 passed`

- [ ] **Step 5: Créer l'écran hors-ligne**

Créer `src/components/ui/ecran-hors-ligne.tsx` :

```tsx
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, espacement } from "@/lib/theme";
import { Ecran } from "./ecran";
import { Texte } from "./texte";
import { Bouton } from "./bouton";

/**
 * Affiché quand la session n'a pas pu être établie faute de réseau. On ne
 * renvoie pas au login : l'utilisateur n'est pas déconnecté, il est injoignable.
 * Le lien de secours reste offert au cas où il souhaite vraiment se reconnecter.
 */
export function EcranHorsLigne() {
  const router = useRouter();

  return (
    <Ecran>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: espacement.xl,
          gap: espacement.lg,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={64} color={couleurs.texteSecondaire} />
        <Texte variante="titre3" poids="extrabold" style={{ textAlign: "center" }}>
          Pas de connexion
        </Texte>
        <Texte
          couleur={couleurs.texteSecondaire}
          style={{ textAlign: "center" }}
        >
          SoundBoss a besoin d&apos;Internet pour retrouver ta session. Tes données
          restent en place, reconnecte-toi au réseau et réessaie.
        </Texte>
        <Bouton
          titre="Se connecter au compte"
          variante="fantome"
          onPress={() => router.replace("/connexion")}
        />
      </View>
    </Ecran>
  );
}
```

`Bouton` expose `titre?: string` et `variante?: "primaire" | "secondaire" | "fantome" | "danger"` (`src/components/ui/bouton.tsx:43-58`) — les variantes sont en français, `"ghost"` n'existe pas. `fantome` est le bon registre ici : c'est une porte de sortie, pas l'action principale de l'écran.

- [ ] **Step 6: Câbler la garde**

Dans `app/(tabs)/_layout.tsx`, ajouter les imports :

```tsx
import { decisionGarde } from "@/lib/garde-session";
import { useReseau } from "@/lib/reseau";
import { EcranHorsLigne } from "@/components/ui/ecran-hors-ligne";
```

Ajouter près des autres hooks :

```tsx
  const { enLigne } = useReseau();
```

Remplacer les lignes 40-41 :

```tsx
  if (!pret) return null;
  if (!session) return <Redirect href="/connexion" />;
```

par :

```tsx
  const decision = decisionGarde({ pret, aUneSession: !!session, enLigne });
  if (decision === "attendre") return null;
  if (decision === "hors-ligne") return <EcranHorsLigne />;
  if (decision === "connexion") return <Redirect href="/connexion" />;
```

Les lignes 42-43 (chargement du profil puis redirection onboarding) restent inchangées.

- [ ] **Step 7: Vérifier**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add src/lib/garde-session.ts __tests__/garde-session.test.ts src/components/ui/ecran-hors-ligne.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat(session): écran hors-ligne au lieu du renvoi au login"
```

---

### Task 3: Lecture audio en arrière-plan

**Files:**
- Modify: `app.json` (section `ios`)
- Modify: `src/lib/audio-context.tsx:31-34`

- [ ] **Step 1: Déclarer le mode d'arrière-plan iOS**

Dans `app.json`, section `"ios"`, ajouter à côté de `"config"` :

```json
"infoPlist": {
  "UIBackgroundModes": ["audio"]
}
```

Android n'a rien à déclarer ici : le plugin `expo-audio` ajoute déjà `FOREGROUND_SERVICE_MEDIA_PLAYBACK` au manifeste — vérifié dans l'APK du 21/08.

- [ ] **Step 2: Activer le mode dans le fournisseur audio**

Dans `src/lib/audio-context.tsx`, remplacer :

```tsx
  // Lecture en mode silencieux iOS (coupure physique)
  useMemo(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
```

par :

```tsx
  // Lecture en mode silencieux iOS (coupure physique) et poursuite en
  // arrière-plan : l'app doit continuer à jouer écran verrouillé.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);
```

`useMemo` était détourné de son rôle pour produire un effet de bord ; `useEffect` exprime l'intention. Ajouter `useEffect` à l'import `react` en tête de fichier et retirer `useMemo` s'il n'est plus utilisé ailleurs dans le fichier (vérifier par `grep -n "useMemo" src/lib/audio-context.tsx`).

- [ ] **Step 3: Vérifier la configuration native produite**

Run:
```bash
npx expo config --type introspect --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log('UIBackgroundModes:',c.ios.infoPlist.UIBackgroundModes)})"
```
Expected: `UIBackgroundModes: [ 'audio' ]`

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add app.json src/lib/audio-context.tsx
git commit -m "feat(audio): poursuivre la lecture en arrière-plan"
```

---

## Vérification finale du lot

- [ ] `npm test` — tous les tests passent
- [ ] `npx tsc --noEmit` — aucune erreur
- [ ] `npm run lint` — aucune erreur
- [ ] `npm ls expo-network` — une seule version ; `npx expo install --check` propre

**Sur appareil, après un nouveau build** — `expo-network` et `UIBackgroundModes` sont natifs, aucun de ces changements ne passe en OTA :

- [ ] Lancer un audio, verrouiller l'écran : la lecture continue
- [ ] Activer le mode avion, forcer la fermeture de l'app, attendre plus d'une heure, rouvrir : l'écran hors-ligne s'affiche, **pas** l'écran de connexion
- [ ] Désactiver le mode avion : l'app retrouve la session sans ressaisie d'identifiants
- [ ] Se déconnecter volontairement en étant en ligne : l'écran de connexion s'affiche bien
