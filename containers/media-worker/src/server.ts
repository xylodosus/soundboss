/**
 * API HTTP du service.
 *
 * `/jobs/analyze` répond 202 immédiatement et traite en arrière-plan : un remux
 * ou une normalisation d'une heure d'audio dépasserait le timeout de l'appelant.
 * Le résultat est observable en base (media_files.metadata.analyzed_at), pas
 * dans la réponse.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from './config.ts';
import { analyzeMedia } from './analyze.ts';
import { listUnanalyzed } from './db.ts';

/**
 * Message d'erreur exploitable. Sans `stderr`, une commande ffmpeg qui échoue
 * ne laisse qu'un « Command failed: … » qui répète l'invocation sans jamais
 * dire pourquoi — inutilisable pour diagnostiquer.
 */
function describeError(e: any): string {
  const parts = [String(e?.message ?? e)];
  // undici loge l'information utile dans `cause` : sans elle, une coupure
  // réseau se résume à un « terminated » qui ne dit rien.
  if (e?.cause) parts.push(`cause: ${e.cause?.message ?? e.cause}`);
  if (e?.code) parts.push(`code: ${e.code}`);
  if (typeof e?.stderr === 'string' && e.stderr.trim()) {
    parts.push(`stderr: ${e.stderr.trim().split('\n').slice(-3).join(' | ')}`);
  }
  return parts.join(' :: ');
}

const app = new Hono();

/** Sonde de santé de la plateforme : volontairement non authentifiée. */
app.get('/health', (c) => c.json({ ok: true }));

// Toutes les autres routes exigent le secret partagé.
app.use('/jobs/*', async (c, next) => {
  const auth = c.req.header('Authorization') ?? '';
  if (auth !== `Bearer ${config.workerSecret}`) {
    return c.json({ success: false, message: 'Non autorisé' }, 401);
  }
  await next();
});

app.post('/jobs/analyze', async (c) => {
  const body = await c.req.json().catch(() => null);
  // uuid depuis le passage à seance_enregistrements.
  const mediaId = typeof body?.media_id === 'string' ? body.media_id.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(mediaId)) {
    return c.json({ success: false, message: 'media_id invalide' }, 400);
  }

  queueMicrotask(() => {
    analyzeMedia(mediaId)
      .then((r) => console.log('[analyze]', JSON.stringify(r)))
      .catch((e) => console.error('[analyze] échec', mediaId, describeError(e)));
  });

  return c.json({ success: true, accepted: mediaId }, 202);
});

/**
 * Rattrapage : retrouve les médias jamais analysés et les traite en série.
 * Sert de reprise si le conteneur a redémarré au milieu d'un job — d'où
 * l'absence de table de jobs.
 */
app.post('/jobs/sweep', async (c) => {
  const limit = Number(c.req.query('limit') ?? 25);
  const rows = await listUnanalyzed(Number.isFinite(limit) ? limit : 25);

  queueMicrotask(async () => {
    for (const row of rows) {
      try {
        const r = await analyzeMedia(row.id);
        console.log('[sweep]', JSON.stringify(r));
      } catch (e: any) {
        console.error('[sweep] échec', row.id, describeError(e));
      }
    }
  });

  return c.json({ success: true, queued: rows.length }, 202);
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`media-worker à l'écoute sur :${info.port}`);
  // Ni clé ni secret ici — seulement l'adresse visée, pour qu'un échec d'accès
  // se diagnostique sans ouvrir la configuration de l'hébergeur.
  console.log(`[r2] endpoint=${config.r2.endpoint} bucket=${config.r2.bucket}`);
});
