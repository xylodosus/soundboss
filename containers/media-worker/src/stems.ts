/**
 * Séparation en stems par Fadr.
 *
 * Le parcours : on télécharge le morceau depuis R2, on le dépose chez Fadr, on
 * lance la découpe, on scrute, puis on récupère chaque stem produit, on le
 * réencode en mono à fréquence réduite et on le dépose dans R2.
 *
 * La découpe est hiérarchique : `main` sur le morceau, puis `drum-stem`,
 * `vocal-stem` ou `melodic-stem` sur un stem déjà produit. Ce n'est jamais
 * automatique — chaque affinage est une tâche facturée à la minute d'audio, et
 * un stem de batterie dure aussi longtemps que le morceau entier.
 */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.ts';
import { getMedia, insertStem, listStems, patchMedia } from './db.ts';
import { downloadToFile, uploadFromFile } from './r2.ts';
import { transcodeStemMono } from './ffmpeg.ts';
import { cleStem, echeanceDepassee, parentPourType } from './stems-regles.ts';
import {
  INTERVALLE_SCRUTATION_MS,
  STEM_TYPES,
  type StemType,
  assetsProduits,
  creerAsset,
  creerUrlDepot,
  deposer,
  estTerminee,
  etatTache,
  lancerSeparation,
  lireAsset,
  messageEtat,
  stemsDeLAsset,
  typeDeStem,
  urlTelechargement,
} from './fadr.ts';

export { cleStem, echeanceDepassee, parentPourType };

export interface StemsResult {
  mediaId: string;
  stemType: StemType;
  skipped?: string;
  stems?: { type: string; url: string }[];
}

function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function separerStems(
  mediaId: string,
  stemType: StemType = 'main',
): Promise<StemsResult> {
  const cle = config.fadr.apiKey;
  // Sans clé, la fonctionnalité se tait plutôt que d'échouer bruyamment.
  if (!cle) return { mediaId, stemType, skipped: 'FADR_API_KEY absente' };

  const media = await getMedia(mediaId);
  if (!media) return { mediaId, stemType, skipped: 'média introuvable' };
  if (!media.url) return { mediaId, stemType, skipped: 'clé R2 absente' };

  const dir = await mkdtemp(join(tmpdir(), 'stems-'));
  try {
    await patchMedia(mediaId, { stems_statut: 'en_cours', stems_erreur: null });

    // --- Source : le morceau, ou le stem à affiner ---
    const existants = await listStems(mediaId);
    const parentId = parentPourType(stemType, existants);
    if (STEM_TYPES[stemType].parents.length > 0 && !parentId) {
      throw new Error(
        `Affinage ${stemType} impossible : aucun stem « ${STEM_TYPES[stemType].parents.join(
          ' » ou « ',
        )} » n'existe encore.`,
      );
    }

    const fichierSource = join(dir, 'source.m4a');
    await downloadToFile(media.url, fichierSource);
    const octets = await readFile(fichierSource);

    // --- Dépôt chez Fadr ---
    const { url: urlDepot, s3Path } = await creerUrlDepot(cle, `soundboss-${mediaId}`, 'm4a');
    await deposer(urlDepot, octets, 'audio/mp4');
    const assetId = await creerAsset(cle, `soundboss-${mediaId}`, 'm4a', 'soundboss', s3Path);

    // --- Découpe et scrutation ---
    const tacheId = await lancerSeparation(cle, assetId, stemType);
    await patchMedia(mediaId, { stems_tache_id: tacheId });

    const debut = Date.now();
    let tache = await etatTache(cle, tacheId);
    while (!tache || !estTerminee(tache)) {
      if (echeanceDepassee(debut, Date.now(), config.fadr.delaiMaxMs)) {
        throw new Error(
          `Fadr n'a pas terminé en ${Math.round(config.fadr.delaiMaxMs / 60000)} min` +
            (tache ? ` — dernier état : ${messageEtat(tache)}` : ''),
        );
      }
      await attendre(INTERVALLE_SCRUTATION_MS);
      tache = await etatTache(cle, tacheId);
    }

    // --- Récupération, réencodage, dépôt ---
    // Les identifiants des stems vivent sur l'asset SOURCE, pas dans la sortie
    // de la tâche : le premier essai réel a rendu une tâche terminée dont
    // `output.assets` était vide alors que la découpe avait bien eu lieu.
    const source = await lireAsset(cle, assetId);
    const idsStems = stemsDeLAsset(source);
    const aTraiter = idsStems.length > 0 ? idsStems : assetsProduits(tache);

    if (aTraiter.length === 0) {
      throw new Error(
        `Fadr a terminé sans produire de stem (tâche ${tacheId}, asset ${assetId}).`,
      );
    }

    const produits: { type: string; url: string }[] = [];
    for (const stemAssetId of aTraiter) {
      const asset = await lireAsset(cle, stemAssetId);
      const type = typeDeStem(asset);
      const urlSource = await urlTelechargement(cle, stemAssetId);

      const brut = join(dir, `${stemAssetId}.src`);
      const reponse = await fetch(urlSource);
      if (!reponse.ok) throw new Error(`Téléchargement du stem ${type} échoué (${reponse.status})`);
      await writeFileDepuisReponse(reponse, brut);

      const reencode = join(dir, `${stemAssetId}.m4a`);
      await transcodeStemMono(brut, reencode, config.fadr.frequenceStems, config.fadr.bitrateStems);

      const cleCible = cleStem(media.url, type, stemAssetId);
      await uploadFromFile(cleCible, reencode, 'audio/mp4');
      await insertStem({
        enregistrement_id: mediaId,
        parent_id: parentId,
        type,
        url: cleCible,
        taille_octets: (await stat(reencode)).size,
        duree_secondes: media.duree_secondes,
        fadr_asset_id: stemAssetId,
      });
      produits.push({ type, url: cleCible });
    }

    await patchMedia(mediaId, { stems_statut: 'pret', stems_erreur: null });
    return { mediaId, stemType, stems: produits };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchMedia(mediaId, { stems_statut: 'echec', stems_erreur: message.slice(0, 500) });
    throw e;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeFileDepuisReponse(reponse: Response, chemin: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(chemin, Buffer.from(await reponse.arrayBuffer()));
}
