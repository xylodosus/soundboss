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
import { generationsEnSuspens, getJobIA, patchJobIA } from './db.ts';
import { uploadFromFile, urlSignee } from './r2.ts';
import { transcodeToM4a } from './ffmpeg.ts';
import {
  etatDeLaTache,
  lancerGeneration,
  recupererTache,
  validerDemande,
  type PisteGeneree,
} from './suno.ts';
import {
  MESSAGE_ABANDON,
  aInterroger,
  ageEnMinutes,
  suiteADonner,
} from './generation-regles.ts';

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
    const params = job.input_params ?? {};
    const demande = validerDemande(params);

    // Reprise d'un morceau existant : Kie.ai ne reçoit pas de fichier, il va
    // le chercher lui-même. Il lui faut donc une URL signée, autonome, et non
    // notre clé R2 — que lui seul ne saurait pas lire.
    const cleSource = typeof params.sourceUrl === 'string' ? params.sourceUrl : null;
    let urlSource: string | undefined;
    if (cleSource) {
      urlSource = await urlSignee(cleSource);
      // Kie.ai va chercher la source lui-même : si notre lien signé n'est pas
      // suivable, la tâche partirait, serait facturée, et reviendrait vide.
      //
      // Le contrôle se fait en GET sur le premier octet, jamais en HEAD : une
      // URL signée l'est **pour une méthode**, et un HEAD sur un lien signé
      // pour GET reçoit un 403 de R2. La première version de ce garde-fou
      // rejetait ainsi des liens parfaitement valides.
      const controle = await fetch(urlSource, { headers: { Range: 'bytes=0-0' } }).catch(
        () => null,
      );
      if (!controle || (controle.status !== 200 && controle.status !== 206)) {
        throw new Error(
          `Le lien signé de la source n'est pas accessible (${controle?.status ?? 'réseau'}).`,
        );
      }
    }

    const tacheId = await lancerGeneration(
      cle,
      demande,
      `${base.replace(/\/$/, '')}/callbacks/suno`,
      urlSource,
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
export async function finirJobGeneration(
  jobId: string,
  pistes: PisteGeneree[],
  motifEchec?: string | null,
): Promise<void> {
  if (motifEchec || pistes.length === 0) {
    await patchJobIA(jobId, {
      statut: 'failed',
      message_erreur: (motifEchec ?? 'Kie.ai a signalé la fin sans rendre de piste.').slice(0, 500),
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

export interface BilanReconciliation {
  examines: number;
  termines: number;
  echoues: number;
  laisses: number;
  erreurs: number;
}

/**
 * Rattrape les générations dont le rappel n'est jamais arrivé.
 *
 * Le rappel est le seul mécanisme de clôture, et rien ne le garantit : un
 * redémarrage du conteneur, une adresse publique changée, un échec d'émission
 * chez Kie.ai, et le job reste `processing` pour toujours. L'écran annonce
 * alors « en cours » indéfiniment, pour un quota déjà consommé.
 *
 * On n'invente pas l'issue à partir du temps écoulé : on interroge le
 * fournisseur, qui seul sait si les pistes existent. Le temps ne tranche qu'en
 * dernier recours, quand même lui reste muet.
 */
export async function reconcilierGenerations(limite = 25): Promise<BilanReconciliation> {
  const bilan: BilanReconciliation = {
    examines: 0,
    termines: 0,
    echoues: 0,
    laisses: 0,
    erreurs: 0,
  };

  const cle = config.kie.apiKey;
  if (!cle) return bilan;

  const jobs = await generationsEnSuspens(limite);
  const maintenant = new Date();

  for (const job of jobs) {
    const age = ageEnMinutes(job.started_at ?? job.created_at, maintenant);
    if (!aInterroger(age)) {
      bilan.laisses += 1;
      continue;
    }
    bilan.examines += 1;

    // Un job jamais lancé n'a pas d'identifiant de tâche : personne à
    // interroger. Seule l'échéance peut le clore.
    if (!job.provider_job_id) {
      if (suiteADonner('inconnue', age) === 'echouer') {
        await patchJobIA(job.id, {
          statut: 'failed',
          message_erreur: MESSAGE_ABANDON,
          completed_at: maintenant.toISOString(),
        });
        bilan.echoues += 1;
      } else {
        bilan.laisses += 1;
      }
      continue;
    }

    try {
      const { etat, message, pistes } = etatDeLaTache(
        await recupererTache(cle, job.provider_job_id),
      );
      const suite = suiteADonner(etat, age);

      if (suite === 'finir') {
        // finirJobGeneration rapatrie les pistes dans R2 : c'est exactement ce
        // qu'aurait fait le rappel perdu.
        await finirJobGeneration(job.id, pistes);
        bilan.termines += 1;
      } else if (suite === 'echouer') {
        await finirJobGeneration(job.id, [], message ?? MESSAGE_ABANDON);
        bilan.echoues += 1;
      } else {
        bilan.laisses += 1;
      }
    } catch (e) {
      // Un job qu'on n'a pas su joindre reste en suspens : le prochain
      // balayage réessaiera, et l'échéance absolue le clora de toute façon.
      console.error('[reconciliation] échec', job.id, e instanceof Error ? e.message : e);
      bilan.erreurs += 1;
    }
  }

  return bilan;
}
