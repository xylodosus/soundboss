/** Pistes séparées produites par Fadr : nommage et mise en ordre. */

/**
 * Noms français des types connus.
 *
 * `other` et `melodies` désignent la même chose : l'API produit le premier, sa
 * documentation annonce le second. Les deux sont traduits pour que le libellé
 * reste juste quel que soit celui qui arrive.
 */
const LIBELLES: Record<string, string> = {
  vocals: "Voix",
  bass: "Basse",
  drums: "Batterie",
  other: "Mélodies",
  melodies: "Mélodies",
  instrumental: "Instrumental",
  "lead vocals": "Voix principale",
  "background vocals": "Chœurs",
  kick: "Grosse caisse",
  snare: "Caisse claire",
  "other drums": "Autres percussions",
  piano: "Piano",
  "electric guitar": "Guitare électrique",
  "acoustic guitar": "Guitare acoustique",
  strings: "Cordes",
  wind: "Vents",
  "other melodies": "Autres mélodies",
};

/**
 * Un type inconnu est rendu tel quel, jamais masqué : la documentation de Fadr
 * n'énumère pas tout ce que l'API produit, et une piste sans nom serait pire
 * qu'une piste au nom anglais.
 */
export function libelleStem(type: string): string {
  if (!type) return "Piste";
  return LIBELLES[type] ?? type;
}

/** Ordre d'affichage, calqué sur une console : voix en haut, rythmique en bas. */
const ORDRE = [
  "vocals",
  "lead vocals",
  "background vocals",
  "other",
  "melodies",
  "piano",
  "electric guitar",
  "acoustic guitar",
  "strings",
  "wind",
  "other melodies",
  "bass",
  "drums",
  "kick",
  "snare",
  "other drums",
  // L'instrumental n'est pas un instrument mais le mixage de tout sauf la voix :
  // sa place est en fin de liste, à part.
  "instrumental",
];

export function ordonnerStems<T extends { type: string }>(stems: T[]): T[] {
  const rang = (type: string) => {
    const i = ORDRE.indexOf(type);
    // Les types inconnus vont après les connus, sans jamais disparaître.
    return i === -1 ? ORDRE.length : i;
  };
  return [...stems].sort((a, b) => rang(a.type) - rang(b.type));
}

/**
 * Mémoire occupée par une piste décodée, en octets.
 *
 * Les stems sont stockés en mono à 22 050 Hz, mais décodés à la fréquence du
 * contexte — le moteur natif ne rééchantillonne pas, correctif du lot E1. Le
 * mono économise donc le stockage et la bande passante, jamais la mémoire.
 * Quatre octets par échantillon : le tampon est en virgule flottante.
 */
export function memoireEstimee(dureeSecondes: number | null, frequence: number): number {
  if (!dureeSecondes || dureeSecondes <= 0) return 0;
  return dureeSecondes * frequence * 4;
}

/**
 * Plafond mémoire au-delà duquel on refuse d'ajouter une piste.
 *
 * Mesuré sur Pocophone F1 : cinq pistes de 102 s tiennent à 93 Mo, cinq pistes
 * de 245 s tiennent à 225 Mo. Huit minutes en cinq pistes demanderaient 450 Mo,
 * ce qui ne passera pas. Le plafond est posé un peu au-dessus de la plus haute
 * valeur vérifiée, pas au-dessus d'une valeur supposée.
 */
export const PLAFOND_MEMOIRE = 250 * 1024 * 1024;

export function peutCharger(actuelle: number, ajout: number, plafond = PLAFOND_MEMOIRE): boolean {
  // La première piste passe toujours : refuser la seule piste demandée rendrait
  // la fonction inutilisable sur un morceau long, alors qu'une piste seule
  // reste parfaitement jouable.
  if (actuelle === 0) return true;
  return actuelle + ajout <= plafond;
}
