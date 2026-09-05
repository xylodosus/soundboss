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
