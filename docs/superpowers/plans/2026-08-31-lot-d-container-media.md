# Lot D — Container média Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire tourner le service `media-worker` sur Bunny Magic Containers pour qu'il sonde la durée, calcule les pics de waveform et détecte le BPM de chaque audio de répétition — et livrer le téléchargement natif Android reporté du lot A.

**Architecture:** Le service existant est repris tel quel dans sa mécanique (Hono, ffmpeg, R2, traitement idempotent en arrière-plan) ; seul son modèle de données change, de `media_files` vers `seance_enregistrements`. Le déclenchement réutilise le motif déjà en place pour les notifications : un trigger appelle `net.http_post` avec un secret partagé lu dans `app_secrets`.

**Tech Stack:** Node 22 Alpine, ffmpeg/ffprobe, aubio, Hono, Cloudflare R2, Supabase PostgREST en service-role, GitHub Actions → GHCR → Bunny Magic Containers.

---

## Décisions actées

| Question | Choix | Conséquence |
|---|---|---|
| Détection de tonalité | **BPM par aubio, tonalité par Fadr** | l'image reste sur Alpine, la tonalité n'arrive qu'avec les stems du lot E |
| Modèle de données | **Adapter aux tables existantes** | `db.ts` réécrit ; à répéter pour `ressources` au lot E |

`aubio_pitch` ne suffit pas à extraire une tonalité — c'est documenté par l'issue #369 du projet. Un extracteur chroma comme `KeyExtractor` d'Essentia serait nécessaire, au prix d'une base Debian et d'une image nettement plus lourde. On s'en dispense : Fadr renvoie la tonalité avec les stems.

## Ce que ce lot débloque

Les audios déposés n'ont **aucune durée en base** : le lot C a corrigé l'envoi pour les nouveaux dépôts, mais les anciens restent à `NULL`, et sans durée le seuil des 30 % d'écoute ne peut rien comptabiliser. La sonde `ffprobe` de ce lot les rattrape.

---

## Structure des fichiers

| Fichier | Responsabilité | État |
|---|---|---|
| `containers/media-worker/src/db.ts` | Cible `seance_enregistrements` au lieu de `media_files` | réécrit (T2) |
| `containers/media-worker/src/analyze.ts` | Ajout de la détection BPM | modifié (T2) |
| `containers/media-worker/src/bpm.ts` | Appel à `aubio tempo`, parsing | créé (T2) |
| `containers/media-worker/test/bpm.test.ts` | Tests du parsing | créé (T2) |
| `containers/media-worker/Dockerfile` | Ajout d'aubio | modifié (T2) |
| `.github/workflows/media-worker.yml` | Construction et publication GHCR | créé (T3) |
| `src/lib/telechargement.ts` | Téléchargement natif Android | modifié (T4) |

---

### Task 1: Migration — colonnes d'analyse

**Files:**
- Migration Supabase : `enregistrements_analyse`

- [ ] **Step 1: Appliquer la migration**

```sql
ALTER TABLE public.seance_enregistrements
  ADD COLUMN IF NOT EXISTS peaks_url text,
  ADD COLUMN IF NOT EXISTS bpm integer,
  ADD COLUMN IF NOT EXISTS taille_octets bigint,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;

-- Le worker liste les audios non analysés : sans index, ce balayage
-- deviendra coûteux quand la table grossira.
CREATE INDEX IF NOT EXISTS idx_seance_enregistrements_non_analyses
  ON public.seance_enregistrements (analyzed_at)
  WHERE analyzed_at IS NULL;
```

Aucune politique RLS à toucher : le worker écrit en `service_role`, qui contourne la RLS. Les colonnes sont en lecture pour les clients via la politique `enregistrements_select` déjà en place.

- [ ] **Step 2: Vérifier**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='seance_enregistrements'
  and column_name in ('peaks_url','bpm','taille_octets','analyzed_at');

select count(*) filter (where duree_secondes is null) as sans_duree from seance_enregistrements;
```

Retenir le nombre d'audios sans durée : c'est ce que la tâche 3 doit ramener à zéro.

- [ ] **Step 3: Régénérer les types et commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(audios): colonnes d'analyse (peaks_url, bpm, analyzed_at)"
```

---

### Task 2: Adapter le worker

**Files:**
- Rewrite: `containers/media-worker/src/db.ts`
- Modify: `containers/media-worker/src/analyze.ts`
- Create: `containers/media-worker/src/bpm.ts`
- Create: `containers/media-worker/test/bpm.test.ts`
- Modify: `containers/media-worker/Dockerfile`

- [ ] **Step 1: Réécrire `db.ts`**

Le modèle passe d'un `id` numérique à un `uuid`, et de `metadata->>analyzed_at` à une colonne dédiée. Remplacer le contenu par :

```ts
/**
 * Accès Supabase par PostgREST en `fetch` brut. La clé service-role contourne
 * la RLS — ce service n'est jamais exposé au client.
 */
import { config } from './config.ts';

export interface MediaRow {
  id: string;
  url: string;
  duree_secondes: number | null;
  taille_octets: number | null;
  analyzed_at: string | null;
}

const headers = {
  apikey: config.supabase.serviceRoleKey,
  Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const COLUMNS = 'id,url,duree_secondes,taille_octets,analyzed_at';
const TABLE = 'seance_enregistrements';

export async function getMedia(mediaId: string): Promise<MediaRow | null> {
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${mediaId}&select=${COLUMNS}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lecture média échouée (${res.status})`);
  const rows = (await res.json()) as MediaRow[];
  return rows[0] ?? null;
}

/** Audios jamais analysés. */
export async function listUnanalyzed(limit: number): Promise<MediaRow[]> {
  const url =
    `${config.supabase.url}/rest/v1/${TABLE}` +
    `?analyzed_at=is.null&select=${COLUMNS}&limit=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Listing médias échoué (${res.status})`);
  return (await res.json()) as MediaRow[];
}

export async function patchMedia(
  mediaId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${mediaId}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`Mise à jour média échouée (${res.status})`);
}
```

Point vérifié en base : `seance_enregistrements` expose `id, seance_id, titre, url, duree_secondes, uploaded_by, created_at` — **aucune colonne `updated_at`**. Le `patchMedia` d'origine en ajoutait une à chaque appel, ce qui ferait échouer la requête ici. La version ci-dessus la retire, c'est délibéré.

- [ ] **Step 2: Écrire le test du parsing BPM**

Créer `containers/media-worker/test/bpm.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { parseTempo } from '../src/bpm.ts';

describe('parseTempo', () => {
  it('lit la valeur produite par aubio tempo', () => {
    expect(parseTempo('120.000000 bpm\n')).toBe(120);
  });

  it('arrondit à l\'entier le plus proche', () => {
    expect(parseTempo('128.700000 bpm\n')).toBe(129);
  });

  it('rejette une sortie vide', () => {
    expect(parseTempo('')).toBeNull();
  });

  it('rejette une valeur non numérique', () => {
    expect(parseTempo('unknown\n')).toBeNull();
  });

  it('rejette un tempo hors des bornes musicales plausibles', () => {
    expect(parseTempo('12.000000 bpm\n')).toBeNull();
    expect(parseTempo('400.000000 bpm\n')).toBeNull();
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

```bash
cd containers/media-worker && npm test -- bpm
```
Expected: FAIL — `Cannot find module '../src/bpm.ts'`

- [ ] **Step 4: Écrire `bpm.ts`**

```ts
/**
 * Détection du tempo par `aubio tempo`. La tonalité n'est PAS détectée ici :
 * aubio ne sait pas l'extraire (issue #369 du projet), il faudrait un
 * extracteur chroma type Essentia. Elle arrive avec les stems, via Fadr.
 */
import { spawn } from 'node:child_process';

/** Bornes musicales plausibles : hors de là, la mesure est du bruit. */
const BPM_MIN = 40;
const BPM_MAX = 300;

/** Lit la sortie de `aubio tempo` (« 120.000000 bpm »). */
export function parseTempo(sortie: string): number | null {
  const m = sortie.trim().match(/^([\d.]+)/);
  if (!m) return null;
  const valeur = Math.round(Number(m[1]));
  if (!Number.isFinite(valeur) || valeur < BPM_MIN || valeur > BPM_MAX) return null;
  return valeur;
}

/** Détecte le tempo d'un fichier. Retourne null si aubio échoue ou doute. */
export async function detectTempo(chemin: string): Promise<number | null> {
  return new Promise((resolve) => {
    const p = spawn('aubio', ['tempo', chemin]);
    let sortie = '';
    p.stdout.on('data', (d) => (sortie += d.toString()));
    p.on('error', () => resolve(null));
    p.on('close', (code) => resolve(code === 0 ? parseTempo(sortie) : null));
  });
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
cd containers/media-worker && npm test -- bpm
```
Expected: `5 passed`

- [ ] **Step 6: Brancher dans `analyze.ts`**

Adapter la signature à un `mediaId: string`, retirer les gardes sur `type_media` et `storage_provider` (la table ne contient que des audios R2), remplacer la garde `media.metadata?.analyzed_at` par `media.analyzed_at`, et enrichir le patch final :

```ts
    const bpm = await detectTempo(finalPath);

    await patchMedia(media.id, {
      duree_secondes: durationSeconds,
      taille_octets: tailleOctets,
      peaks_url: peaksPath ?? null,
      bpm,
      analyzed_at: new Date().toISOString(),
    });
```

`media.url` remplace `media.file_path` partout : c'est la clé R2 dans ce schéma.

- [ ] **Step 7: Ajouter aubio à l'image**

Dans le `Dockerfile` :

```dockerfile
RUN apk add --no-cache ffmpeg aubio
```

Si le paquet `aubio` n'est pas disponible dans les dépôts Alpine de la version de base utilisée, **ne pas basculer sur Debian de sa propre initiative** : rapporter le blocage. Le BPM est un agrément, la sonde de durée est l'essentiel — livrer sans BPM reste préférable à alourdir l'image sans mandat.

- [ ] **Step 8: Vérifier et commit**

```bash
cd containers/media-worker && npm test && npm run typecheck
docker build -t media-worker:test .
docker run --rm media-worker:test aubio --version
```

```bash
git add containers/media-worker
git commit -m "feat(worker): cibler seance_enregistrements et détecter le BPM"
```

---

### Task 3: Déclenchement et déploiement

**Files:**
- Create: `.github/workflows/media-worker.yml`
- Migration Supabase : `trigger_analyse_audio`

- [ ] **Step 1: Publier l'image sur GHCR**

Créer `.github/workflows/media-worker.yml` :

```yaml
name: media-worker
on:
  push:
    branches: [main]
    paths: ["containers/media-worker/**", ".github/workflows/media-worker.yml"]
  workflow_dispatch:

jobs:
  publier:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: containers/media-worker
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/soundboss-media-worker:latest
            ghcr.io/${{ github.repository_owner }}/soundboss-media-worker:${{ github.sha }}
```

- [ ] **Step 2: Créer le container Bunny — action manuelle**

C'est l'étape que l'utilisateur exécute lui-même, une fois l'image publiée et testée localement :

1. Rendre le paquet GHCR accessible à Bunny (public, ou identifiants de registre renseignés).
2. Créer le Magic Container sur l'image `ghcr.io/<owner>/soundboss-media-worker:latest`, port 80.
3. Y déclarer les variables : `MEDIA_WORKER_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Vérifier `GET /health` sur l'URL publique.

**Deux valeurs restent à trancher avec l'utilisateur avant cette étape** : le bucket R2 de SoundBoss — le container est câblé sur `cevlord-media`, qui appartient à l'autre projet — et la juridiction du bucket, `config.ts` forçant le sous-domaine `.eu`.

- [ ] **Step 3: Déclencher l'analyse à chaque dépôt**

```sql
CREATE OR REPLACE FUNCTION public.trg_audio_depose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT valeur INTO v_secret FROM app_secrets WHERE cle = 'media_worker_secret';
  SELECT valeur INTO v_url FROM app_secrets WHERE cle = 'media_worker_url';
  IF v_secret IS NULL OR v_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url || '/jobs/analyze',
    body := jsonb_build_object('media_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_audio_depose
  AFTER INSERT ON public.seance_enregistrements
  FOR EACH ROW EXECUTE FUNCTION public.trg_audio_depose();
```

Le motif reproduit celui de `ff_enqueue_notif` : secret lu dans `app_secrets`, appel par `net.http_post`. La fonction sort sans rien faire si le secret ou l'URL manquent, de sorte que l'insertion ne casse jamais tant que le container n'existe pas.

Les deux secrets sont à insérer dans `app_secrets` — table dont la RLS est en `USING (false)`, donc inaccessible aux clients.

- [ ] **Step 4: Rattraper les audios existants**

Une fois le container en ligne, `POST /jobs/sweep` traite les audios non analysés. Vérifier ensuite :

```sql
select count(*) filter (where duree_secondes is null) as sans_duree,
       count(*) filter (where peaks_url is null) as sans_waveform
from seance_enregistrements;
```

Attendu : zéro des deux côtés. C'est ce qui débloque le comptage des écoutes du lot C sur les anciens audios.

---

### Task 4: Téléchargement natif Android

Reporté du lot A : le bouton Télécharger ouvre aujourd'hui la feuille de partage sur les deux plateformes. Sur iOS c'est la bonne voie, aucun dossier utilisateur n'existant ; sur Android, l'étiquette « Télécharger » mérite un vrai téléchargement.

**Files:**
- Modify: `src/lib/telechargement.ts`
- Modify: `package.json`

- [ ] **Step 1: Installer et vérifier**

```bash
npx expo install expo-media-library
npm ls expo-media-library
npx expo install --check
node -e "for (const p of ['expo-asset','react-native-worklets','react']) console.log(p, require(`./node_modules/${p}/package.json`).version)"
```

Le contrôle d'intégrité n'est pas décoratif sur ce projet : une peerDependency non bornée y a déjà provoqué un crash natif au lancement.

- [ ] **Step 2: Brancher selon la plateforme**

Dans `src/lib/telechargement.ts`, après le téléchargement dans le cache, faire diverger le comportement : sur Android, demander la permission puis `MediaLibrary.createAssetAsync` vers le dossier public ; sur iOS, conserver `Sharing.shareAsync`. Retourner `"telecharge" | "partage" | "cache"` pour que l'appelant affiche le bon message.

Si la permission Android est refusée, **retomber sur la feuille de partage** plutôt qu'échouer : l'utilisateur garde un moyen d'enregistrer son fichier.

- [ ] **Step 3: Adapter les tests existants**

`__tests__/telechargement.test.ts` couvre `nettoyerNom`, qui ne change pas. Ajouter les cas de la nouvelle fonction de décision de plateforme si elle est extraite en fonction pure — c'est préférable, la logique « quelle voie selon la plateforme et la permission » se teste bien.

- [ ] **Step 4: Vérifier et commit**

`npx tsc --noEmit && npm test && npm run lint`, puis sur appareil Android : le fichier apparaît dans Téléchargements ; sur iOS : la feuille de partage s'ouvre comme avant.

---

## Vérification finale du lot

- [ ] `npm test` côté app et `npm test` côté `containers/media-worker` — tout passe
- [ ] `docker build` réussit, `aubio --version` répond dans l'image
- [ ] `GET /health` répond sur l'URL Bunny
- [ ] Après `POST /jobs/sweep` : plus aucun audio sans durée ni sans waveform
- [ ] Un nouvel audio déposé déclenche l'analyse sans intervention
- [ ] Android : téléchargement réel ; iOS : partage inchangé
