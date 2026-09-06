/**
 * Niveau d'entrée du micro, pour la waveform d'enregistrement.
 *
 * `expo-audio` rend le niveau en dBFS : 0 au maximum, très négatif dans le
 * silence. L'échelle utile s'arrête bien avant le plancher théorique de −160,
 * sans quoi toute la parole normale se tasserait dans les derniers pour cent.
 */
export const PLANCHER_DB = -60;

export function niveauDepuisDb(db: number | null | undefined): number {
  // Sans mesure, on rend zéro. La version précédente affichait un niveau
  // aléatoire quand le metering manquait : une jauge qui bouge sans rapport
  // avec le son ment à l'utilisateur au lieu de l'informer.
  if (typeof db !== "number" || !Number.isFinite(db)) return 0;
  if (db >= 0) return 1;
  if (db <= PLANCHER_DB) return 0;
  return (db - PLANCHER_DB) / -PLANCHER_DB;
}

/** Ajoute un échantillon en fin de fenêtre glissante, les plus anciens sortant. */
export function ajouterEchantillon(
  echantillons: number[],
  valeur: number,
  capacite: number
): number[] {
  const suivants = [...echantillons, valeur];
  return suivants.length > capacite ? suivants.slice(suivants.length - capacite) : suivants;
}

/**
 * Réduit une suite d'échantillons à `cible` barres en gardant le pic de chaque
 * tranche. La moyenne écraserait les transitoires (une attaque de caisse claire
 * disparaîtrait) : sur une waveform, c'est le pic qui porte l'information.
 */
export function reduireA(echantillons: number[], cible: number): number[] {
  if (cible <= 0) return [];
  if (echantillons.length <= cible) return [...echantillons];
  const sortie: number[] = [];
  for (let i = 0; i < cible; i += 1) {
    const debut = Math.floor((i * echantillons.length) / cible);
    const fin = Math.floor(((i + 1) * echantillons.length) / cible);
    let pic = 0;
    for (let j = debut; j < Math.max(fin, debut + 1); j += 1) {
      if (echantillons[j] > pic) pic = echantillons[j];
    }
    sortie.push(pic);
  }
  return sortie;
}
