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
