/**
 * Génération musicale par Suno (Kie.ai).
 *
 * Le déroulé diffère de la séparation : on lance, puis on **attend un rappel**.
 * Rien n'est scruté, et le conteneur peut redémarrer entre les deux — l'état
 * vit en base, dans `ai_jobs`.
 */
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.ts';
import { getJobIA, patchJobIA } from './db.ts';
import { uploadFromFile } from './r2.ts';
import { transcodeToM4a } from './ffmpeg.ts';
import { lancerGeneration, validerDemande, type PisteGeneree } from './suno.ts';

/** Où ranger une piste générée dans R2. */
export function cleGeneration(jobId: string, index: number): string {
  return `generations/${jobId}/piste-${index + 1}.m4a`;
}

export async function lancerJobGeneration(jobId: string): Promise<{ tacheId?: string; skipped?: string }> {
  const cle = config.kie.apiKey;
  const base = config.kie.baseUrlPublique;
  if (!cle) return { skipped: 'KIE_API_KEY absente' };
  // Sans adresse publique le résultat n'arriverait nulle part : mieux vaut ne
  // pas lancer — et ne pas facturer — que produire un job orphelin.
  if (!base) return { skipped: 'PUBLIC_BASE_URL absente' };

  const job = await getJobIA(jobId);
  if (!job) return { skipped: 'job introuvable' };

  try {
    const demande = validerDemande(job.input_params ?? {});
    const tacheId = await lancerGeneration(
      cle,
      demande,
      `${base.replace(/\/$/, '')}/callbacks/suno`,
    );
    await patchJobIA(jobId, {
      statut: 'processing',
      provider: 'kie-suno',
      provider_job_id: tacheId,
      started_at: new Date().toISOString(),
    });
    return { tacheId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchJobIA(jobId, {
      statut: 'failed',
      message_erreur: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    });
    throw e;
  }
}

/**
 * Rapatrie les pistes générées dans R2 et clôt le job.
 *
 * Le rapatriement n'est pas une commodité : Kie.ai ne conserve les fichiers que
 * **quatorze jours**. Garder leurs URL reviendrait à livrer une musique qui
 * disparaît au bout de deux semaines.
 */
export async function finirJobGeneration(jobId: string, pistes: PisteGeneree[]): Promise<void> {
  if (pistes.length === 0) {
    await patchJobIA(jobId, {
      statut: 'failed',
      message_erreur: 'Kie.ai a signalé la fin sans rendre de piste.',
      completed_at: new Date().toISOString(),
    });
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), 'generation-'));
  try {
    const produites: Record<string, unknown>[] = [];
    for (const [index, piste] of pistes.entries()) {
      const reponse = await fetch(piste.url);
      if (!reponse.ok) throw new Error(`Téléchargement de la piste ${index + 1} échoué (${reponse.status})`);
      const brut = join(dir, `piste-${index}.src`);
      await writeFile(brut, Buffer.from(await reponse.arrayBuffer()));

      const m4a = join(dir, `piste-${index}.m4a`);
      await transcodeToM4a(brut, m4a, config.kie.bitrate);

      const cible = cleGeneration(jobId, index);
      await uploadFromFile(cible, m4a, 'audio/mp4');
      produites.push({
        url: cible,
        titre: piste.titre,
        duree_secondes: piste.duree,
        taille_octets: (await stat(m4a)).size,
        source_id: piste.id,
      });
    }

    await patchJobIA(jobId, {
      statut: 'completed',
      progression_pct: 100,
      resultat: { pistes: produites },
      completed_at: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchJobIA(jobId, {
      statut: 'failed',
      message_erreur: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    });
    throw e;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
