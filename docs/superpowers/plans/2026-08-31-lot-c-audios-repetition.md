# Lot C — Audios de répétition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer la section « Enregistrements » en « Audios », permettre d'attribuer un audio à un pupitre qui seul le voit, et comptabiliser une écoute dès que 30 % de la durée ont été réellement joués — le chef voyant le compte et la liste des auditeurs.

**Architecture:** Deux migrations d'abord, l'interface ensuite. La visibilité par pupitre est portée par la RLS, pas par un filtre client : un filtrage d'affichage laisserait l'audio téléchargeable par requête directe. Le comptage cumule les secondes effectivement jouées côté client, en ignorant les sauts de barre, puis les pousse par une RPC qui garde la valeur maximale.

**Tech Stack:** Supabase (RLS, RPC SECURITY DEFINER), expo-audio, TanStack Query.

---

## Décisions actées

| Question | Choix | Conséquence |
|---|---|---|
| Visibilité d'un audio de pupitre | **Réservé au pupitre** + chef/admin | porté par la RLS |
| Seuil des 30 % | **Temps réellement écouté** | cumul côté client, sauts de barre ignorés |

Le second choix est le plus exigeant : retenir la position maximale atteinte aurait suffi d'un glissement de barre pour valider une écoute. Cumuler le temps joué demande d'accumuler des deltas et de rejeter ceux qui trahissent un `seek`.

---

## État relevé en base

```
seance_enregistrements : id, seance_id, titre, url, duree_secondes, uploaded_by, created_at
                         → ni pupitre_id, ni suivi d'écoute
roles_pupitres         : id, groupe_id, nom, description, couleur, ordre, created_at
RLS lecture actuelle   : peut_voir_seance(seance_id)
Helpers disponibles    : peut_voir_seance, est_membre_pupitre, groupe_du_pupitre,
                         est_chef_ou_admin_groupe, membres_du_pupitre
```

`duree_secondes` est nullable **et toujours nul en pratique** : la RPC
`ajouter_enregistrement_seance` accepte un `p_duree_secondes`, mais
`useAjouterEnregistrement` ne le transmet pas. Sans durée, aucun seuil de 30 %
n'est calculable — le comptage d'écoutes ne compterait jamais rien. La tâche 2
corrige l'envoi ; les audios **déjà déposés** resteront sans durée jusqu'à ce
que le container du lot D les sonde.

L'ajout passe par la RPC `ajouter_enregistrement_seance` (SECURITY DEFINER,
gardée par `est_gestionnaire_seance`), pas par un INSERT direct : ajouter le
pupitre exige donc de modifier cette fonction, pas seulement le client.

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `src/lib/ecoute.ts` | Cumul du temps écouté, seuil des 30 % | créé (T3) |
| `src/lib/queries/seances.ts` | Hooks audios, pupitre, écoutes | modifié (T2, T4) |
| `app/groupes/[id]/seances/[seanceId].tsx:492-530` | Section « Audios », badge pupitre, compteur | modifié (T2, T4) |
| `src/components/ui/lecteur-audio-modal.tsx` | Remontée de la progression | modifié (T4) |
| `src/components/ui/modal-enregistrement.tsx` | Choix du pupitre au dépôt | modifié (T2) |

---

### Task 1: Migration — attribution par pupitre

**Files:**
- Migration Supabase : `enregistrements_pupitre`

- [ ] **Step 1: Appliquer la migration**

```sql
-- NULL = audio destiné à tout le groupe. Sinon, réservé au pupitre.
ALTER TABLE public.seance_enregistrements
  ADD COLUMN IF NOT EXISTS pupitre_id uuid
  REFERENCES public.roles_pupitres(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seance_enregistrements_pupitre
  ON public.seance_enregistrements (pupitre_id);

-- La restriction vit dans la RLS, pas dans un filtre client : filtrer à
-- l'affichage laisserait l'audio lisible par requête directe.
DROP POLICY IF EXISTS enregistrements_select ON public.seance_enregistrements;
CREATE POLICY enregistrements_select ON public.seance_enregistrements
  FOR SELECT TO authenticated
  USING (
    peut_voir_seance(seance_id)
    AND (
      pupitre_id IS NULL
      OR est_membre_pupitre(pupitre_id)
      OR est_chef_ou_admin_groupe(groupe_du_pupitre(pupitre_id))
    )
  );

-- Hygiène signalée par l'advisor : ces helpers sont SECURITY INVOKER sans
-- search_path figé, et deviennent ici des dépendances de politique RLS.
ALTER FUNCTION public.est_membre_pupitre(uuid) SET search_path = public;
ALTER FUNCTION public.groupe_du_pupitre(uuid) SET search_path = public;

-- L'ajout d'un audio passe par cette RPC, pas par un INSERT : elle doit
-- accepter le pupitre. DROP puis CREATE plutôt qu'une surcharge — deux
-- signatures feraient disparaître la fonction des types générés.
DROP FUNCTION IF EXISTS public.ajouter_enregistrement_seance(uuid, text, text, integer);

CREATE FUNCTION public.ajouter_enregistrement_seance(
    p_seance_id uuid,
    p_url text,
    p_titre text DEFAULT NULL::text,
    p_duree_secondes integer DEFAULT NULL::integer,
    p_pupitre_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := (select auth.uid());
    v_enregistrement JSONB;
    v_groupe UUID;
BEGIN
    IF v_uid IS NULL THEN RETURN reponse_erreur('Authentification requise'); END IF;
    IF NOT est_gestionnaire_seance(p_seance_id) THEN
        RETURN reponse_erreur('Accès refusé : chef/admin du groupe ou propriétaire requis');
    END IF;

    -- Un pupitre d'un autre groupe rendrait l'audio invisible à tous.
    IF p_pupitre_id IS NOT NULL THEN
        SELECT groupe_id INTO v_groupe FROM seances WHERE id = p_seance_id;
        IF v_groupe IS NULL OR groupe_du_pupitre(p_pupitre_id) <> v_groupe THEN
            RETURN reponse_erreur('Ce pupitre n''appartient pas au groupe de la répétition');
        END IF;
    END IF;

    INSERT INTO seance_enregistrements (seance_id, url, titre, duree_secondes, uploaded_by, pupitre_id)
    VALUES (p_seance_id, p_url, p_titre, p_duree_secondes, v_uid, p_pupitre_id)
    RETURNING to_jsonb(seance_enregistrements.*) INTO v_enregistrement;

    RETURN reponse_succes('Audio ajouté à la répétition',
      jsonb_build_object('enregistrement', v_enregistrement));
END;
$function$;
```

- [ ] **Step 2: Vérifier la politique et l'absence de régression**

```sql
select policyname, cmd, qual from pg_policies
where schemaname='public' and tablename='seance_enregistrements' and cmd='SELECT';

select count(*) as audios_existants,
       count(*) filter (where pupitre_id is null) as visibles_par_tous
from seance_enregistrements;
```

Attendu : la nouvelle politique, et **tous** les audios existants avec `pupitre_id IS NULL` — aucun ne doit devenir invisible du fait de la migration.

- [ ] **Step 3: Régénérer les types**

Via le MCP Supabase (`generate_typescript_types`), écrire le résultat dans `src/lib/database.types.ts`, puis `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(audios): colonne pupitre_id et RLS de visibilité par pupitre"
```

---

### Task 2: Interface — renommage et attribution

**Files:**
- Modify: `app/groupes/[id]/seances/[seanceId].tsx:492-530`
- Modify: `src/lib/queries/seances.ts:355` (`useAjouterEnregistrement`)
- Modify: `src/components/ui/modal-enregistrement.tsx`

- [ ] **Step 1: Renommer la section**

Dans `app/groupes/[id]/seances/[seanceId].tsx`, remplacer `<Section titre="Enregistrements">` par `<Section titre="Audios">`.

Renommer **uniquement les libellés visibles**. Les noms de table, de colonnes, de hooks et de fichiers (`seance_enregistrements`, `useEnregistrementsSeance`, `modal-enregistrement.tsx`) restent inchangés : les renommer serait un remaniement sans valeur pour l'utilisateur, et casserait la RLS et les triggers.

Chercher les autres libellés visibles par `grep -rn "nregistrement" app src --include='*.tsx' | grep -iE '"[A-ZÉÈ]'` et remplacer ceux qui s'affichent.

- [ ] **Step 2: Passer le pupitre et la durée au dépôt**

Dans `src/lib/queries/seances.ts`, remplacer le corps de `useAjouterEnregistrement` :

```ts
export function useAjouterEnregistrement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      seanceId: string;
      url: string;
      titre?: string | null;
      // Sans durée, le seuil des 30 % est incalculable et l'écoute ne peut
      // jamais être comptabilisée : elle doit être fournie au dépôt.
      dureeSecondes?: number | null;
      pupitreId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("ajouter_enregistrement_seance", {
        p_seance_id: v.seanceId,
        p_url: v.url,
        p_titre: v.titre ?? undefined,
        p_duree_secondes: v.dureeSecondes ?? undefined,
        p_pupitre_id: v.pupitreId ?? undefined,
      });
      if (error) throw new Error(error.message);
      reponseRpc(data);
    },
    onSuccess: (_d, v) =>
      queryClient.invalidateQueries({ queryKey: clefsSeances.enregistrements(v.seanceId) }),
  });
}
```

Côté appelants : `ModalEnregistrement` connaît la durée de ce qu'il vient d'enregistrer et doit la transmettre. Pour un fichier déposé, lire la durée via `useAudioPlayer` avant l'envoi, et transmettre `null` si elle reste indisponible — l'audio sera alors simplement non comptabilisable, sans blocage.

- [ ] **Step 3: Sélecteur de pupitre**

Réutiliser `ModalChoix`, dont l'interface est `{ visible, titre, elements: ElementChoix[], surChoisir: (id: string) => void, onFermer, messageVide? }` avec `ElementChoix = { id, titre, sousTitre?, icone? }` (`src/components/ui/modal-choix.tsx:7-30`). `surChoisir` ne transmettant qu'une chaîne, « tout le groupe » prend l'identifiant sentinelle `"aucun"` :

```tsx
const { data: pupitres = [] } = usePupitresGroupe(groupeId ?? "");
const [pupitreId, setPupitreId] = useState<string | null>(null);
const [choixPupitre, setChoixPupitre] = useState(false);

const elementsPupitres = [
  { id: "aucun", titre: "Tout le groupe", icone: "people-outline" as const },
  ...pupitres.map((p) => ({ id: p.id, titre: p.nom, icone: "musical-notes-outline" as const })),
];

<ModalChoix
  visible={choixPupitre}
  titre="Destinataires de l'audio"
  elements={elementsPupitres}
  messageVide="Ce groupe n'a pas encore de pupitre."
  surChoisir={(id) => {
    setPupitreId(id === "aucun" ? null : id);
    setChoixPupitre(false);
  }}
  onFermer={() => setChoixPupitre(false)}
/>
```

Vérifier le nom réel du champ de libellé d'un pupitre : la table `roles_pupitres` expose `nom`.

- [ ] **Step 4: Badge sur chaque audio**

Sur chaque ligne d'audio, afficher le nom du pupitre quand `pupitre_id` n'est pas nul, dans la couleur `roles_pupitres.couleur`. Rien quand il est nul — l'absence de badge signifie « tout le groupe », et un badge « Tout le groupe » alourdirait la liste pour le cas le plus courant.

- [ ] **Step 5: Vérifier**

`npx tsc --noEmit && npm test && npm run lint`, puis sur appareil : déposer un audio réservé à un pupitre, vérifier avec un compte membre d'un **autre** pupitre qu'il n'apparaît pas, et avec le compte chef qu'il apparaît.

- [ ] **Step 6: Commit**

```bash
git add "app/groupes/[id]/seances/[seanceId].tsx" src/lib/queries/seances.ts src/components/ui/modal-enregistrement.tsx
git commit -m "feat(audios): section renommée et attribution par pupitre"
```

---

### Task 3: Migration — suivi des écoutes

**Files:**
- Migration Supabase : `seance_ecoutes`

- [ ] **Step 1: Appliquer la migration**

```sql
CREATE TABLE IF NOT EXISTS public.seance_ecoutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enregistrement_id uuid NOT NULL
    REFERENCES public.seance_enregistrements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  secondes_ecoutees integer NOT NULL DEFAULT 0,
  ecoutee boolean NOT NULL DEFAULT false,
  ecoutee_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enregistrement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_seance_ecoutes_enregistrement
  ON public.seance_ecoutes (enregistrement_id);

ALTER TABLE public.seance_ecoutes ENABLE ROW LEVEL SECURITY;

-- Chacun voit ses écoutes ; le chef et les admins voient celles de leur groupe.
CREATE POLICY ecoutes_select ON public.seance_ecoutes
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM seance_enregistrements e
      JOIN seances s ON s.id = e.seance_id
      WHERE e.id = enregistrement_id
        AND s.groupe_id IS NOT NULL
        AND est_chef_ou_admin_groupe(s.groupe_id)
    )
  );

-- Aucune politique d'écriture : le cumul passe exclusivement par la RPC
-- ci-dessous, qui est SECURITY DEFINER. Un client ne peut donc pas se déclarer
-- auditeur d'un audio qu'il n'a pas joué.

CREATE OR REPLACE FUNCTION public.enregistrer_ecoute(
  p_enregistrement_id uuid,
  p_secondes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := (select auth.uid());
  v_duree integer;
  v_seance uuid;
  v_total integer;
  v_ecoutee boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN reponse_erreur('Authentification requise'); END IF;
  IF p_secondes IS NULL OR p_secondes < 0 THEN
    RETURN reponse_erreur('Durée écoutée invalide');
  END IF;

  SELECT e.duree_secondes, e.seance_id INTO v_duree, v_seance
  FROM seance_enregistrements e WHERE e.id = p_enregistrement_id;

  IF v_seance IS NULL THEN RETURN reponse_erreur('Audio introuvable'); END IF;
  IF NOT peut_voir_seance(v_seance) THEN
    RETURN reponse_erreur('Accès refusé');
  END IF;

  INSERT INTO seance_ecoutes (enregistrement_id, user_id, secondes_ecoutees)
  VALUES (p_enregistrement_id, v_uid, p_secondes)
  ON CONFLICT (enregistrement_id, user_id) DO UPDATE
    -- GREATEST : le client peut renvoyer un cumul inférieur après un
    -- redémarrage, la valeur acquise ne doit jamais régresser.
    SET secondes_ecoutees = GREATEST(seance_ecoutes.secondes_ecoutees, EXCLUDED.secondes_ecoutees),
        updated_at = now()
  RETURNING secondes_ecoutees INTO v_total;

  -- duree_secondes est nullable : sans durée connue, aucun seuil n'est
  -- calculable et l'écoute reste non comptabilisée.
  v_ecoutee := v_duree IS NOT NULL AND v_duree > 0
               AND v_total >= CEIL(v_duree * 0.30);

  IF v_ecoutee THEN
    UPDATE seance_ecoutes
    SET ecoutee = true,
        ecoutee_at = COALESCE(ecoutee_at, now())
    WHERE enregistrement_id = p_enregistrement_id AND user_id = v_uid;
  END IF;

  RETURN reponse_succes('Progression enregistrée',
    jsonb_build_object('secondes_ecoutees', v_total, 'ecoutee', v_ecoutee));
END;
$function$;
```

- [ ] **Step 2: Vérifier les droits après création**

```sql
select proname, coalesce(proacl::text,'(défaut)') as acl,
       has_function_privilege('authenticated', oid, 'EXECUTE') as auth_peut
from pg_proc where proname = 'enregistrer_ecoute';

select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename='seance_ecoutes';
```

Attendu : `authenticated` peut exécuter la RPC, et `seance_ecoutes` n'a **qu'une** politique, de lecture. Une politique d'écriture ici annulerait toute la garantie.

- [ ] **Step 3: Régénérer les types puis commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(audios): table seance_ecoutes et RPC de progression"
```

---

### Task 4: Comptage côté lecteur et vue du chef

**Files:**
- Create: `src/lib/ecoute.ts`
- Create: `__tests__/ecoute.test.ts`
- Modify: `src/components/ui/lecteur-audio-modal.tsx`
- Modify: `src/lib/queries/seances.ts`
- Modify: `app/groupes/[id]/seances/[seanceId].tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `__tests__/ecoute.test.ts` :

```ts
import { deltaEcoute, estEcoutee, SAUT_MAX_SECONDES } from "../src/lib/ecoute";

describe("deltaEcoute", () => {
  it("compte une progression normale", () => {
    expect(deltaEcoute(10, 11)).toBe(1);
  });

  it("ignore un retour en arrière", () => {
    expect(deltaEcoute(60, 10)).toBe(0);
  });

  it("ignore un saut en avant, signe d'un glissement de barre", () => {
    expect(deltaEcoute(10, 10 + SAUT_MAX_SECONDES + 1)).toBe(0);
  });

  it("accepte un écart à la limite du saut toléré", () => {
    expect(deltaEcoute(10, 10 + SAUT_MAX_SECONDES)).toBe(SAUT_MAX_SECONDES);
  });

  it("ignore une position identique", () => {
    expect(deltaEcoute(10, 10)).toBe(0);
  });
});

describe("estEcoutee", () => {
  it("compte l'écoute à partir de 30 % de la durée", () => {
    expect(estEcoutee(30, 100)).toBe(true);
  });

  it("ne compte pas en deçà", () => {
    expect(estEcoutee(29, 100)).toBe(false);
  });

  it("reste prudent quand la durée est inconnue", () => {
    expect(estEcoutee(999, null)).toBe(false);
  });

  it("reste prudent quand la durée est nulle", () => {
    expect(estEcoutee(10, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- ecoute`
Expected: FAIL — `Cannot find module '../src/lib/ecoute'`

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/ecoute.ts` :

```ts
/**
 * Au-delà de cet écart entre deux relevés de position, on considère que
 * l'utilisateur a déplacé la barre plutôt qu'écouté. Le lecteur relève sa
 * position environ chaque seconde ; 3 s laissent de la marge aux à-coups
 * sans laisser passer un saut délibéré.
 */
export const SAUT_MAX_SECONDES = 3;

/**
 * Secondes à ajouter au cumul entre deux relevés. Retourne 0 sur un retour en
 * arrière ou un bond en avant : seul le temps réellement joué doit compter,
 * sans quoi glisser la barre à 30 % validerait l'écoute sans rien entendre.
 */
export function deltaEcoute(positionPrecedente: number, positionActuelle: number): number {
  const delta = positionActuelle - positionPrecedente;
  if (delta <= 0) return 0;
  if (delta > SAUT_MAX_SECONDES) return 0;
  return delta;
}

/** Une écoute compte à partir de 30 % de la durée totale réellement jouée. */
export function estEcoutee(secondesEcoutees: number, dureeTotale: number | null): boolean {
  if (!dureeTotale || dureeTotale <= 0) return false;
  return secondesEcoutees >= Math.ceil(dureeTotale * 0.3);
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm test -- ecoute`
Expected: `Tests: 9 passed`

- [ ] **Step 5: Cumuler dans le lecteur**

Dans `src/components/ui/lecteur-audio-modal.tsx`, ajouter une prop optionnelle `enregistrementId?: string`. Quand elle est fournie, cumuler la progression à chaque changement de `statut.currentTime` :

```tsx
  const cumul = useRef(0);
  const dernierePosition = useRef(0);
  const dernierEnvoi = useRef(0);
  const enregistrerEcoute = useEnregistrerEcoute();

  useEffect(() => {
    if (!enregistrementId || !statut.playing) {
      dernierePosition.current = statut.currentTime ?? 0;
      return;
    }
    const position = statut.currentTime ?? 0;
    cumul.current += deltaEcoute(dernierePosition.current, position);
    dernierePosition.current = position;

    // On n'écrit pas à chaque seconde : un envoi toutes les 15 s suffit, et la
    // RPC garde la valeur maximale de toute façon.
    if (cumul.current - dernierEnvoi.current >= 15) {
      dernierEnvoi.current = cumul.current;
      enregistrerEcoute.mutate({
        enregistrementId,
        secondes: Math.round(cumul.current),
      });
    }
  }, [statut.currentTime, statut.playing, enregistrementId]);
```

Envoyer aussi le cumul à la fermeture du lecteur, sans quoi une écoute de moins de 15 s après le dernier envoi serait perdue.

- [ ] **Step 6: Hook d'envoi et vue du chef**

Dans `src/lib/queries/seances.ts`, ajouter :
- `useEnregistrerEcoute()` — mutation appelant la RPC `enregistrer_ecoute`, invalidant `clefsSeances.ecoutes(enregistrementId)` ;
- `useEcoutesEnregistrement(enregistrementId, actif)` — lecture de `seance_ecoutes` jointe aux `users` (prénom, nom, avatar), activée seulement pour le chef/admin. La RLS filtre déjà : un simple membre ne recevra que sa propre ligne, il n'y a donc rien à garder secret côté client.

Ajouter la clef `ecoutes: (id: string) => ["seances", "ecoutes", id] as const` à `clefsSeances`.

- [ ] **Step 7: Afficher le compteur**

Sur chaque audio, pour le chef/admin uniquement (`estGestionnaire` est déjà calculé dans l'écran) : le nombre d'auditeurs, et au appui la liste des personnes avec leur avatar. Un simple membre ne voit rien de tout cela.

- [ ] **Step 8: Vérifier**

`npx tsc --noEmit && npm test && npm run lint`, puis sur appareil : écouter 30 % d'un audio → il est compté ; glisser la barre au-delà de 30 % sans écouter → il ne l'est **pas** ; le chef voit le compteur, un membre non.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ecoute.ts __tests__/ecoute.test.ts src/components/ui/lecteur-audio-modal.tsx src/lib/queries/seances.ts "app/groupes/[id]/seances/[seanceId].tsx"
git commit -m "feat(audios): comptage des écoutes au-delà de 30 pour cent"
```

---

## Vérification finale du lot

- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint` — tout passe
- [ ] Aucun audio existant rendu invisible par la migration (`pupitre_id IS NULL` partout)
- [ ] `seance_ecoutes` n'a qu'une politique, de lecture
- [ ] Sur appareil : audio de pupitre invisible aux autres pupitres, visible du chef
- [ ] Sur appareil : glisser la barre ne valide pas une écoute
