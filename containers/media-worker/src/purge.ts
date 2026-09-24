/**
 * Drainage de la file de purge R2.
 *
 * Les lignes de `r2_purges` désignent des octets dont plus rien en base ne
 * garde l'adresse : la ligne qui les portait a été supprimée. Tant qu'ils ne
 * sont pas retirés, ils occupent — et bientôt factureront — un stockage que
 * l'utilisateur croit avoir libéré.
 */
import { patchPurge, purgesEnAttente } from './db.ts';
import { deleteObjectStatut } from './r2.ts';
import { ESSAIS_MAX, aAbandonner, estPurgee } from './purge-regles.ts';

export interface BilanPurge {
  examinees: number;
  purgees: number;
  reessayees: number;
  abandonnees: number;
}

export async function drainerPurges(limite = 100): Promise<BilanPurge> {
  const bilan: BilanPurge = { examinees: 0, purgees: 0, reessayees: 0, abandonnees: 0 };
  const lignes = await purgesEnAttente(limite);

  for (const ligne of lignes) {
    bilan.examinees += 1;
    const essais = ligne.essais + 1;
    let statut: number;
    try {
      statut = await deleteObjectStatut(ligne.cle);
    } catch (e) {
      statut = 0;
      console.error('[purge] appel R2 échoué', ligne.cle, e instanceof Error ? e.message : e);
    }

    if (estPurgee(statut)) {
      await patchPurge(ligne.id, { purgee_at: new Date().toISOString(), essais, erreur: null });
      bilan.purgees += 1;
      continue;
    }

    // La ligne reste en attente, avec son motif : abandonnée ou non, elle
    // demeure consultable. Effacer une purge ratée reviendrait à perdre
    // l'adresse d'octets qu'on paie encore.
    await patchPurge(ligne.id, {
      essais,
      erreur: `R2 a répondu ${statut || 'rien'}`,
    });
    if (aAbandonner(essais)) {
      bilan.abandonnees += 1;
      console.error(`[purge] abandon après ${ESSAIS_MAX} essais : ${ligne.cle}`);
    } else {
      bilan.reessayees += 1;
    }
  }

  return bilan;
}
