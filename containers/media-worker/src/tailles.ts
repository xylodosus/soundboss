/**
 * Rattrapage des tailles de pièces jointes jamais enregistrées.
 *
 * Certains envois ne transmettaient pas la taille — l'image du chat jusqu'au
 * 24 septembre, et de vieux dépôts de fichiers. Ils occupent R2 mais comptent
 * pour zéro octet. La taille se relève par un HEAD, sans rapatrier le fichier.
 *
 * Couvre les pièces jointes du chat (`messages.fichier_taille`) et les
 * fichiers (`ressources.taille_bytes`).
 *
 * Opération de maintenance, à lancer une fois. Elle est idempotente : un
 * message dont la taille est déjà connue n'est pas relu.
 */
import {
  messagesSansTaille,
  patchMessage,
  patchRessource,
  ressourcesSansTaille,
} from './db.ts';
import { tailleObjet } from './r2.ts';

export interface BilanTailles {
  examines: number;
  renseignes: number;
  introuvables: number;
}

/**
 * Relève une taille, ou rend null.
 *
 * Un fichier disparu de R2, ou un R2 sans Content-Length, laisse la taille
 * inconnue : écrire un zéro produirait une mesure fausse indiscernable d'une
 * mesure vraie, et le stockage paraîtrait durablement plus léger qu'il n'est.
 */
async function mesurer(cle: string): Promise<number | null> {
  try {
    return await tailleObjet(cle);
  } catch (e) {
    console.error('[tailles] HEAD échoué', cle, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function rattraperTailles(limite = 200): Promise<BilanTailles> {
  const bilan: BilanTailles = { examines: 0, renseignes: 0, introuvables: 0 };
  const messages = await messagesSansTaille(limite);

  for (const m of messages) {
    bilan.examines += 1;
    const taille = await mesurer(m.fichier_url);
    if (taille === null) {
      bilan.introuvables += 1;
      continue;
    }
    await patchMessage(m.id, { fichier_taille: taille });
    bilan.renseignes += 1;
  }

  // Les fichiers déposés avant que l'upload ne transmette la taille sont dans
  // le même cas que les pièces jointes du chat.
  for (const r of await ressourcesSansTaille(limite)) {
    bilan.examines += 1;
    const taille = await mesurer(r.url);
    if (taille === null) {
      bilan.introuvables += 1;
      continue;
    }
    await patchRessource(r.id, { taille_bytes: taille });
    bilan.renseignes += 1;
  }

  return bilan;
}
