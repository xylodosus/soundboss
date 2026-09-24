/**
 * Rattrapage des tailles de pièces jointes jamais enregistrées.
 *
 * L'envoi d'image ne transmettait pas `fichier_taille` : ces fichiers
 * occupent R2 mais comptent pour zéro octet dans le stockage du groupe. La
 * taille se relève par un HEAD, sans rapatrier le fichier.
 *
 * Opération de maintenance, à lancer une fois. Elle est idempotente : un
 * message dont la taille est déjà connue n'est pas relu.
 */
import { messagesSansTaille, patchMessage } from './db.ts';
import { tailleObjet } from './r2.ts';

export interface BilanTailles {
  examines: number;
  renseignes: number;
  introuvables: number;
}

export async function rattraperTailles(limite = 200): Promise<BilanTailles> {
  const bilan: BilanTailles = { examines: 0, renseignes: 0, introuvables: 0 };
  const messages = await messagesSansTaille(limite);

  for (const m of messages) {
    bilan.examines += 1;
    let taille: number | null = null;
    try {
      taille = await tailleObjet(m.fichier_url);
    } catch (e) {
      console.error('[tailles] HEAD échoué', m.fichier_url, e instanceof Error ? e.message : e);
    }
    if (taille === null) {
      // Le fichier a disparu de R2, ou R2 n'a pas donné de Content-Length.
      // On laisse la taille inconnue plutôt que d'écrire un zéro qui
      // passerait ensuite pour une mesure.
      bilan.introuvables += 1;
      continue;
    }
    await patchMessage(m.id, { fichier_taille: taille });
    bilan.renseignes += 1;
  }

  return bilan;
}
