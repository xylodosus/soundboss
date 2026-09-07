/**
 * Politique de clôture des générations, hors de tout appel réseau.
 *
 * Une génération se termine par un rappel de Kie.ai. Si ce rappel se perd — le
 * conteneur redémarre, l'adresse publique change, le fournisseur échoue à
 * l'émettre — le job reste `processing` indéfiniment : l'écran annonce « en
 * cours » pour toujours, et le quota du jour a été consommé pour rien.
 *
 * On ne conclut pas par le temps seul. Passé un délai, on **interroge le
 * fournisseur** : lui seul sait si les pistes existent. Le temps ne sert qu'en
 * dernier recours, quand même lui ne sait pas répondre.
 */
import type { EtatTache } from './suno.ts';

/** Une génération demande quelques minutes ; en deçà, interroger est prématuré. */
export const DELAI_INTERROGATION_MIN = 5;

/** Au-delà, on cesse d'attendre même sans réponse claire du fournisseur. */
export const DELAI_ABANDON_MIN = 60;

export const MESSAGE_ABANDON =
  "Kie.ai n'a rien rendu : la génération prend anormalement longtemps.";

export function ageEnMinutes(depuis: string | null | undefined, maintenant: Date): number {
  if (!depuis) return Number.POSITIVE_INFINITY;
  const t = Date.parse(depuis);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (maintenant.getTime() - t) / 60000;
}

/** Vrai quand un job traîne assez pour justifier une question au fournisseur. */
export function aInterroger(ageMinutes: number): boolean {
  return ageMinutes >= DELAI_INTERROGATION_MIN;
}

export type Suite = 'attendre' | 'finir' | 'echouer';

/**
 * Ce qu'il faut faire d'un job après avoir interrogé le fournisseur.
 *
 * `inconnue` n'est pas un échec : un statut que nous ne connaissons pas encore
 * ne prouve rien. Le job garde sa chance jusqu'à l'échéance absolue.
 */
export function suiteADonner(etat: EtatTache, ageMinutes: number): Suite {
  if (etat === 'reussie') return 'finir';
  if (etat === 'echouee') return 'echouer';
  return ageMinutes >= DELAI_ABANDON_MIN ? 'echouer' : 'attendre';
}
