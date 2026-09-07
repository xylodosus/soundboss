/**
 * Listes de référence du profil musicien.
 *
 * Partagées entre l'onboarding et l'écran d'édition : deux copies finiraient
 * par diverger, et un instrument choisi à l'inscription disparaîtrait de la
 * liste au moment de le modifier.
 */
export const INSTRUMENTS = [
  "Chant",
  "Piano",
  "Guitare",
  "Basse",
  "Batterie",
  "Percussions",
  "Balafon",
  "Djembé",
  "Saxophone",
  "Trompette",
  "Violon",
  "Kora",
  "Clavier / Synthé",
  "Autre",
] as const;

export const GENRES = [
  "Gospel",
  "Zouglou",
  "Coupé-décalé",
  "Afrobeat",
  "Mbalax",
  "Rumba",
  "Zouk",
  "Reggae",
  "Soul",
  "Jazz",
  "Hip-hop",
  "Chorale",
  "Fusion",
  "Autre",
] as const;

export const NIVEAUX = [
  { valeur: "debutant", label: "Débutant" },
  { valeur: "intermediaire", label: "Intermédiaire" },
  { valeur: "avance", label: "Avancé" },
  { valeur: "expert", label: "Expert" },
] as const;

export type Niveau = (typeof NIVEAUX)[number]["valeur"];
