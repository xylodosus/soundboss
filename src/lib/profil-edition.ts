/**
 * Saisie et enregistrement du profil.
 *
 * `useMettreAJourProfil` fait un `update` : tout champ envoyé écrase celui de
 * la base. On n'envoie donc que ce qui a réellement changé — sinon rouvrir
 * l'écran et le refermer réécrirait des valeurs qu'un autre appareil vient
 * peut-être de modifier.
 */
export type SaisieProfil = {
  prenom: string;
  nom: string;
  ville: string;
  pays: string;
  telephone: string;
  bio: string;
  instruments: string[];
  genres: string[];
  niveau: string | null;
};

/** Texte saisi → valeur de base : vide et blancs seuls valent absence. */
export function texteOuNull(v: string): string | null {
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function validerProfil(saisie: SaisieProfil): string | null {
  if (!saisie.prenom.trim()) return "Le prénom est requis.";
  // Le nom reste facultatif : beaucoup de musiciens n'en portent qu'un seul
  // sur scène, et rien dans l'app n'en dépend.
  if (saisie.bio.trim().length > 500) return "La bio ne doit pas dépasser 500 caractères.";
  return null;
}

/** Ajoute ou retire une valeur d'une sélection multiple. */
export function basculer(liste: string[], valeur: string): string[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

function memeListe(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((v) => set.has(v));
}

export type ProfilEnBase = {
  prenom?: string | null;
  nom?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  bio?: string | null;
  instruments?: string[] | null;
  genres_musicaux?: string[] | null;
  niveau_global?: string | null;
};

/**
 * Champs réellement modifiés, prêts pour l'`update`.
 *
 * Rendre un objet vide est une réponse valable : il n'y a alors rien à écrire,
 * et l'appelant peut fermer l'écran sans toucher à la base.
 */
export function modificationsProfil(
  initial: ProfilEnBase,
  saisie: SaisieProfil
): Record<string, unknown> {
  const sortie: Record<string, unknown> = {};

  const textes: [keyof ProfilEnBase, string][] = [
    ["prenom", saisie.prenom],
    ["nom", saisie.nom],
    ["ville", saisie.ville],
    ["pays", saisie.pays],
    ["telephone", saisie.telephone],
    ["bio", saisie.bio],
  ];
  for (const [champ, valeur] of textes) {
    const suivante = texteOuNull(valeur);
    if (suivante !== (initial[champ] ?? null)) sortie[champ] = suivante;
  }

  if (!memeListe(saisie.instruments, initial.instruments ?? [])) {
    sortie.instruments = saisie.instruments;
  }
  if (!memeListe(saisie.genres, initial.genres_musicaux ?? [])) {
    sortie.genres_musicaux = saisie.genres;
  }
  if ((saisie.niveau ?? null) !== (initial.niveau_global ?? null)) {
    sortie.niveau_global = saisie.niveau;
  }

  return sortie;
}
