/**
 * Tonalités, en notation latine — celle qu'emploient les musiciens francophones.
 *
 * Une tonalité s'identifie par `"<note>:<mode>"`, par exemple `"Fa:majeur"`.
 * Le degré est l'indice chromatique de la note, de 0 pour Do à 11 pour Si.
 */

export type Mode = "majeur" | "mineur";

export type Tonalite = {
  id: string;
  note: string;
  degre: number;
  mode: Mode;
};

/**
 * Un seul nom par degré : proposer Do# et Réb côté à côté doublerait la liste
 * pour un même son, et personne ne cherche à choisir entre les deux dans un
 * outil de répétition.
 */
const NOTES = [
  "Do",
  "Do#",
  "Ré",
  "Mib",
  "Mi",
  "Fa",
  "Fa#",
  "Sol",
  "Sol#",
  "La",
  "Sib",
  "Si",
];

export const TONALITES: Tonalite[] = (["majeur", "mineur"] as Mode[]).flatMap((mode) =>
  NOTES.map((note, degre) => ({ id: `${note}:${mode}`, note, degre, mode }))
);

const PAR_ID = new Map(TONALITES.map((t) => [t.id, t]));

export function tonalite(id: string | null): Tonalite | null {
  if (!id) return null;
  return PAR_ID.get(id) ?? null;
}

export function libelleTonalite(id: string | null): string {
  const t = tonalite(id);
  return t ? `${t.note} ${t.mode}` : "";
}

/**
 * Nombre de demi-tons pour aller d'une tonalité à l'autre, par le chemin le plus
 * court. Monter de onze demi-tons revient à descendre d'un seul, et descendre
 * abîme moins le timbre que monter de presque une octave.
 */
export function demiTonsEntre(depart: string | null, arrivee: string | null): number {
  const a = tonalite(depart);
  const b = tonalite(arrivee);
  if (!a || !b) return 0;
  const brut = (b.degre - a.degre + 12) % 12;
  return brut > 6 ? brut - 12 : brut;
}

/** Tonalité obtenue en décalant de `demiTons`. Le mode ne change pas : transposer n'est pas moduler. */
export function transposer(depart: string | null, demiTons: number): string | null {
  const a = tonalite(depart);
  if (!a) return null;
  const degre = (((a.degre + demiTons) % 12) + 12) % 12;
  return `${NOTES[degre]}:${a.mode}`;
}

/** Cibles proposées : le même mode que l'origine, ou tout quand elle est inconnue. */
export function tonalitesDuMode(origine: string | null): Tonalite[] {
  const a = tonalite(origine);
  return a ? TONALITES.filter((t) => t.mode === a.mode) : TONALITES;
}

/** Chronologie produite par le conteneur : `[{ debut, fin, id, confiance }]`. */
export type SectionTonale = {
  debut: number;
  fin: number;
  id: string;
  confiance: number;
};

/**
 * Section en cours à cette position de lecture.
 *
 * Aux extrémités on retient la section la plus proche plutôt que rien : la
 * dernière tranche d'analyse est tronquée, donc la lecture dépasse presque
 * toujours sa borne de fin, et afficher « aucune tonalité » sur les dernières
 * secondes serait un défaut visible pour une raison invisible.
 */
export function sectionA(
  sections: SectionTonale[] | null | undefined,
  position: number
): SectionTonale | null {
  if (!sections || sections.length === 0) return null;
  for (const s of sections) {
    if (position >= s.debut && position < s.fin) return s;
  }
  return position < sections[0].debut ? sections[0] : sections[sections.length - 1];
}

/** Résumé lisible d'une modulation. Chaîne vide quand le morceau ne module pas. */
export function resumeSections(sections: SectionTonale[] | null | undefined): string {
  if (!sections || sections.length < 2) return "";
  const morceaux = sections.map((s, i) =>
    i === 0
      ? libelleTonalite(s.id)
      : `puis ${libelleTonalite(s.id)} à ${horodatage(s.debut)}`
  );
  return morceaux.join(", ");
}

function horodatage(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Valide une chronologie venue du JSONB.
 *
 * La colonne peut contenir n'importe quoi — un schéma de conteneur qui change,
 * une écriture manuelle. On vérifie plutôt que de convertir de force, et une
 * entrée dont la tonalité n'existe pas dans notre nomenclature est écartée :
 * elle ne pourrait ni s'afficher ni servir au calcul de transposition.
 */
export function parseSections(valeur: unknown): SectionTonale[] | null {
  if (!Array.isArray(valeur) || valeur.length === 0) return null;
  const sections: SectionTonale[] = [];
  for (const brut of valeur) {
    if (!brut || typeof brut !== "object") return null;
    const { debut, fin, id, confiance } = brut as Record<string, unknown>;
    if (typeof debut !== "number" || typeof fin !== "number" || typeof id !== "string") {
      return null;
    }
    if (!PAR_ID.has(id)) continue;
    sections.push({
      debut,
      fin,
      id,
      confiance: typeof confiance === "number" ? confiance : 0,
    });
  }
  return sections.length > 0 ? sections : null;
}
