/**
 * Règles de drainage de la file de purge R2, hors de tout appel réseau.
 *
 * Une clé enfilée n'a plus de ligne en base : si on cesse d'essayer, les octets
 * restent facturés sans que rien ne les rattache à quoi que ce soit. On
 * réessaie donc, mais pas indéfiniment — une clé qui échoue cinq fois relève
 * d'un problème qu'un sixième essai ne résoudra pas.
 */

/** Au-delà, la ligne reste en base avec son motif, pour être examinée. */
export const ESSAIS_MAX = 5;

export function aAbandonner(essais: number): boolean {
  return essais >= ESSAIS_MAX;
}

/**
 * Une clé absente de R2 est un succès, pas un échec.
 *
 * Le drain peut rejouer : conteneur redémarré au milieu, balayage périodique
 * qui repasse. Traiter le 404 comme un échec ferait boucler des purges déjà
 * faites jusqu'à l'abandon, en les laissant marquées en erreur.
 */
export function estPurgee(statut: number): boolean {
  return statut === 204 || statut === 200 || statut === 404;
}
