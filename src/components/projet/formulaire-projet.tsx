import { useState } from "react";
import { Pressable, View } from "react-native";
import type { Database } from "@/lib/database.types";
import { useCreerProjet, useModifierProjet } from "@/lib/queries/projets";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ErreurChamp, Etiquette, AlerteErreur } from "@/components/ui/champ";
import {
  ChampDatePicker,
  chaineDepuisDate,
  dateDepuisChaine,
} from "@/components/ui/champ-date";

type Projet = Database["public"]["Tables"]["projets"]["Row"];

const TYPES_EVENEMENTS = [
  { valeur: "culte", label: "Culte" },
  { valeur: "concert", label: "Concert" },
  { valeur: "showcase", label: "Showcase" },
  { valeur: "mariage", label: "Mariage" },
  { valeur: "obseques", label: "Obsèques" },
  { valeur: "ceremonie", label: "Cérémonie" },
  { valeur: "autre", label: "Autre" },
] as const;

const TYPES_PRODUCTIONS = [
  { valeur: "ep", label: "EP" },
  { valeur: "album", label: "Album" },
  { valeur: "single", label: "Single" },
  { valeur: "autre", label: "Autre" },
] as const;

/** Formulaire création/édition de projet (groupe ou perso). */
export function FormulaireProjet({
  groupeId,
  projet,
  onAnnuler,
}: {
  groupeId?: string | null;
  projet?: Projet;
  onAnnuler: () => void;
}) {
  const creer = useCreerProjet();
  const modifier = useModifierProjet();

  const [nom, setNom] = useState(projet?.nom ?? "");
  const [categorie, setCategorie] = useState<"evenement" | "production">(
    projet?.categorie ?? "evenement"
  );
  const [typeEvenement, setTypeEvenement] = useState<string | null>(
    projet?.categorie === "evenement" ? projet.type_evenement ?? null : null
  );
  const [typeProduction, setTypeProduction] = useState<string | null>(
    projet?.categorie === "production" ? projet.type_production ?? null : null
  );
  const [description, setDescription] = useState(projet?.description ?? "");
  const [dateDebut, setDateDebut] = useState<Date | null>(dateDepuisChaine(projet?.date_debut));
  const [dateFin, setDateFin] = useState<Date | null>(dateDepuisChaine(projet?.date_fin));
  const [dateRealisation, setDateRealisation] = useState<Date | null>(
    dateDepuisChaine(projet?.date_realisation)
  );
  const [lieu, setLieu] = useState(projet?.lieu_evenement ?? "");
  const [erreurs, setErreurs] = useState<{ [k: string]: string | null }>({});
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre() {
    setErreur(null);
    setErreurs({});
    if (!nom.trim()) {
      setErreurs({ nom: "Donne un titre au projet." });
      return;
    }
    if (categorie === "evenement" && !typeEvenement) {
      setErreurs({ type: "Choisis le type d'événement." });
      return;
    }
    if (categorie === "production" && !typeProduction) {
      setErreurs({ type: "Choisis le type de production." });
      return;
    }

    try {
      const donnees = {
        nom: nom.trim(),
        categorie,
        type_evenement: categorie === "evenement" ? (typeEvenement as never) : null,
        type_production: categorie === "production" ? (typeProduction as never) : null,
        description: description.trim() || null,
        date_debut: dateDebut ? chaineDepuisDate(dateDebut) : null,
        date_fin: dateFin ? chaineDepuisDate(dateFin) : null,
        date_realisation: dateRealisation ? chaineDepuisDate(dateRealisation) : null,
        lieu_evenement: lieu.trim() || null,
      };

      // Un projet fourni signifie édition : sans cette distinction, le
      // formulaire créait un second projet au lieu de mettre à jour le premier.
      if (projet) {
        await modifier.mutateAsync({ projetId: projet.id, projet: donnees, groupeId });
      } else {
        await creer.mutateAsync({ groupeId, projet: donnees });
      }
      onAnnuler();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer le projet.");
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <AlerteErreur message={erreur} />

      <View>
        <Etiquette>Titre *</Etiquette>
        <Champ
          placeholder={categorie === "evenement" ? "ex : Concert de Noël" : "ex : Premier EP"}
          value={nom}
          onChangeText={setNom}
          erreur={!!erreurs.nom}
        />
        <ErreurChamp message={erreurs.nom} />
      </View>

      <View>
        <Etiquette>Catégorie *</Etiquette>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              { valeur: "evenement", label: "Événement" },
              { valeur: "production", label: "Production" },
            ] as const
          ).map((c) => {
            const actif = categorie === c.valeur;
            return (
              <Pressable
                key={c.valeur}
                onPress={() => {
                  setCategorie(c.valeur);
                  if (c.valeur === "evenement") setTypeProduction(null);
                  else setTypeEvenement(null);
                }}
                style={{
                  flex: 1,
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                  backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Texte poids={actif ? "bold" : "medium"} couleur={actif ? couleurs.warmGold : couleurs.texte}>
                  {c.label}
                </Texte>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Etiquette>Type *</Etiquette>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(categorie === "evenement" ? TYPES_EVENEMENTS : TYPES_PRODUCTIONS).map((t) => {
            const actif =
              categorie === "evenement" ? typeEvenement === t.valeur : typeProduction === t.valeur;
            return (
              <Pressable
                key={t.valeur}
                onPress={() =>
                  categorie === "evenement" ? setTypeEvenement(t.valeur) : setTypeProduction(t.valeur)
                }
                style={{
                  borderRadius: rayons.pill,
                  borderWidth: 1,
                  borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                  backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Texte
                  variante="petit"
                  poids={actif ? "bold" : "medium"}
                  couleur={actif ? couleurs.warmGold : couleurs.texte}
                >
                  {t.label}
                </Texte>
              </Pressable>
            );
          })}
        </View>
        <ErreurChamp message={erreurs.type} />
      </View>

      <View>
        <Etiquette>Description</Etiquette>
        <Champ
          multiline
          placeholder="Objectifs, contexte…"
          value={description}
          onChangeText={setDescription}
          style={{ minHeight: 72, textAlignVertical: "top" }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Etiquette>Début</Etiquette>
          <ChampDatePicker valeur={dateDebut} onChange={setDateDebut} mode="date" placeholder="Début" />
        </View>
        <View style={{ flex: 1 }}>
          <Etiquette>Fin</Etiquette>
          <ChampDatePicker valeur={dateFin} onChange={setDateFin} mode="date" placeholder="Fin" />
        </View>
      </View>

      {categorie === "evenement" && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Etiquette>Date de réalisation</Etiquette>
            <ChampDatePicker
              valeur={dateRealisation}
              onChange={setDateRealisation}
              mode="date"
              placeholder="Réalisation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Etiquette>Lieu</Etiquette>
            <Champ placeholder="ex : Parc Expo" value={lieu} onChangeText={setLieu} />
          </View>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <Bouton
          titre="Enregistrer"
          chargement={creer.isPending || modifier.isPending}
          onPress={soumettre}
        />
        <Bouton variante="secondaire" titre="Annuler" onPress={onAnnuler} />
      </View>
    </View>
  );
}
