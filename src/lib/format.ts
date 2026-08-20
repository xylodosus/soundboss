import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export function formatFCFA(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(montant)} F`;
}

export function formatDateCourte(date: string | Date | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "EEE d MMM", { locale: fr });
}

export function formatDateHeure(date: string | Date | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "EEE d MMM · HH'h'mm", { locale: fr });
}

export function formatJour(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return "Hier";
  return format(d, "EEEE d MMMM yyyy", { locale: fr });
}

export function memeJour(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): boolean {
  if (!a || !b) return false;
  return isSameDay(new Date(a), new Date(b));
}

export function formatHeure(date: string | Date | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "HH'h'mm");
}

export function libelleTypeGroupe(type: string | null | undefined): string {
  const libelles: Record<string, string> = {
    orchestre: "Orchestre",
    choeur: "Chœur",
    band: "Band",
    ensemble: "Ensemble",
    duo: "Duo",
    autre: "Groupe",
  };
  return type ? (libelles[type] ?? type) : "Groupe";
}

export function libelleStatutPresence(statut: string | null | undefined): string {
  const libelles: Record<string, string> = {
    en_attente: "En attente",
    present: "Présent",
    absent: "Absent",
    retard: "En retard",
    excuse: "Excusé",
  };
  return statut ? (libelles[statut] ?? statut) : "En attente";
}

export function libelleCategorieProjet(categorie: string | null | undefined): string {
  const libelles: Record<string, string> = {
    evenement: "Événement",
    production: "Production",
  };
  return categorie ? (libelles[categorie] ?? categorie) : "Projet";
}

export function libelleTypeEvenement(type: string | null | undefined): string {
  const libelles: Record<string, string> = {
    culte: "Culte",
    concert: "Concert",
    showcase: "Showcase",
    mariage: "Mariage",
    obseques: "Obsèques",
    ceremonie: "Cérémonie",
    autre: "Autre",
  };
  return type ? (libelles[type] ?? type) : "";
}

export function libelleTypeProduction(type: string | null | undefined): string {
  const libelles: Record<string, string> = {
    ep: "EP",
    album: "Album",
    single: "Single",
    autre: "Autre",
  };
  return type ? (libelles[type] ?? type) : "";
}

export function libelleStatutProjet(statut: string | null | undefined): string {
  const libelles: Record<string, string> = {
    en_preparation: "En préparation",
    en_cours: "En cours",
    termine: "Terminé",
    annule: "Annulé",
  };
  return statut ? (libelles[statut] ?? statut) : "En préparation";
}

export function libelleStatutSeance(statut: string | null | undefined): string {
  const libelles: Record<string, string> = {
    planifiee: "Planifiée",
    en_cours: "En cours",
    terminee: "Terminée",
    annulee: "Annulée",
  };
  return statut ? (libelles[statut] ?? statut) : "Planifiée";
}

export function initiales(prenom?: string | null, nom?: string | null): string {
  return (
    [prenom, nom]
      .filter(Boolean)
      .map((v) => (v as string)[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function tailleLisible(octets: number | null | undefined): string {
  if (!octets || octets <= 0) return "—";
  const unite = ["o", "Ko", "Mo", "Go"];
  const i = Math.min(unite.length - 1, Math.floor(Math.log(octets) / Math.log(1024)));
  return `${(octets / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${unite[i]}`;
}
