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
  "vocals-lead": "Voix principale",
  "lead vocals": "Voix principale",
  "vocals-background": "Chœurs",
  "background vocals": "Chœurs",
  kick: "Grosse caisse",
  snare: "Caisse claire",
  // L'API produit « drums-other » là où sa documentation annonce
  // « other drums » — constaté au premier affinage réel, 5 septembre. Les deux
  // sont traduits, comme pour other/melodies.
  "drums-other": "Autres percussions",
  "other drums": "Autres percussions",
  piano: "Piano",
  // Noms réellement produits par l'API, systématiquement plus courts que ceux
  // de sa documentation : « electric » et non « electric guitar », etc. Les
  // deux formes sont traduites, l'API pouvant changer d'avis.
  electric: "Guitare électrique",
  "electric guitar": "Guitare électrique",
  acoustic: "Guitare acoustique",
  "acoustic guitar": "Guitare acoustique",
  strings: "Cordes",
  wind: "Vents",
  "melodics-other": "Autres mélodies",
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
  "vocals-lead",
  "lead vocals",
  "vocals-background",
  "background vocals",
  "other",
  "melodies",
  "piano",
  "electric",
  "electric guitar",
  "acoustic",
  "acoustic guitar",
  "strings",
  "wind",
  "melodics-other",
  "other melodies",
  "bass",
  "drums",
  "kick",
  "snare",
  "drums-other",
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
 * Mesuré sur Pocophone F1 : cinq pistes de 102 s tiennent à 93 Mo, cinq de
 * 245 s à 225 Mo, et deux pistes de 488 s à 179 Mo — sans ralentissement.
 * Le premier plafond de 250 Mo s'est révélé trop prudent : il refusait une
 * troisième piste que rien ne prouvait intenable.
 *
 * 460 Mo laisse tenter les cinq pistes du morceau le plus long du corpus
 * (~446 Mo). C'est délibérément une valeur d'exploration : si l'application
 * tombe, on saura enfin où est la vraie limite, ce qu'aucun calcul ne dira.
 */
export const PLAFOND_MEMOIRE = 460 * 1024 * 1024;

export function peutCharger(actuelle: number, ajout: number, plafond = PLAFOND_MEMOIRE): boolean {
  // La première piste passe toujours : refuser la seule piste demandée rendrait
  // la fonction inutilisable sur un morceau long, alors qu'une piste seule
  // reste parfaitement jouable.
  if (actuelle === 0) return true;
  return actuelle + ajout <= plafond;
}

export type EtatMixage = {
  /** Volume par piste, de 0 à 1. Absent vaut 1. */
  volumes: Record<string, number>;
  mutes: Set<string>;
  solos: Set<string>;
};

/**
 * Gain d'une piste, selon les conventions d'une console de mixage.
 *
 * Dès qu'une piste au moins est en solo, les autres se taisent — c'est ce que
 * « solo » veut dire, et c'est ce qui le rend utile pour isoler une partie sans
 * couper les quatre autres une à une.
 *
 * La sourdine l'emporte sur le solo de la même piste : appuyer sur M doit
 * toujours faire taire, sans qu'on ait à se demander si S est enclenché.
 */
export function gainEffectif(id: string, etat: EtatMixage): number {
  if (etat.mutes.has(id)) return 0;
  if (etat.solos.size > 0 && !etat.solos.has(id)) return 0;
  const volume = etat.volumes[id];
  return typeof volume === "number" ? Math.min(1, Math.max(0, volume)) : 1;
}

/**
 * Titre d'une piste versée dans les audios ou les fichiers du groupe.
 *
 * L'extension du fichier source est retirée : ces titres viennent souvent d'un
 * nom de fichier, et « HOSANNA reprise.mp3 - Stem Basse » se lit mal. Seule une
 * extension plausible est enlevée — deux à quatre caractères sans espace —
 * pour ne pas amputer un titre comme « Op. 27 no 2 ».
 */
export function titreStem(titreSource: string | null | undefined, type: string): string {
  const base = (titreSource ?? "Audio").replace(/\.[A-Za-z0-9]{2,4}$/, "").trim() || "Audio";
  return `${base} - Stem ${libelleStem(type)}`;
}
