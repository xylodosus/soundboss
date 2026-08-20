import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProjetsGroupe, type ProjetAvecMorceaux } from "@/lib/queries/projets";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { ModalNouveauProjet } from "@/components/projet/modal-nouveau-projet";
import { BoutonAjout } from "@/components/ui/bouton-ajout";
import {
  libelleCategorieProjet,
  libelleStatutProjet,
  libelleTypeEvenement,
  libelleTypeProduction,
} from "@/lib/format";

const STATUTS_CLASSES: Record<string, { fond: string; texte: string }> = {
  en_preparation: { fond: "rgba(251,191,36,0.14)", texte: couleurs.warmGold },
  en_cours: { fond: "rgba(52,211,153,0.14)", texte: "#34D399" },
  termine: { fond: "rgba(255,255,255,0.06)", texte: couleurs.muted },
  annule: { fond: "rgba(224,82,74,0.14)", texte: couleurs.danger },
};

export function CarteProjet({
  projet,
  morceaux,
}: {
  projet: ProjetAvecMorceaux;
  morceaux: number;
}) {
  const router = useRouter();
  const typeLabel =
    projet.categorie === "evenement"
      ? libelleTypeEvenement(projet.type_evenement)
      : libelleTypeProduction(projet.type_production);
  const statut = STATUTS_CLASSES[projet.statut ?? "en_preparation"];

  return (
    <Pressable
      onPress={() => router.push(`/projets/${projet.id}`)}
      style={{
        borderRadius: rayons.lg,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <View style={{ borderRadius: rayons.pill, backgroundColor: statut.fond, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Texte variante="micro" poids="bold" couleur={statut.texte}>
            {libelleStatutProjet(projet.statut)}
          </Texte>
        </View>
        <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(224,122,86,0.14)", paddingHorizontal: 8, paddingVertical: 3 }}>
          <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight}>
            {libelleCategorieProjet(projet.categorie)}
            {typeLabel ? ` · ${typeLabel}` : ""}
          </Texte>
        </View>
      </View>

      <Texte poids="extrabold" variante="corps">
        {projet.nom}
      </Texte>

      {projet.description ? (
        <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={2}>
          {projet.description}
        </Texte>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
        {projet.date_realisation && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="calendar-outline" size={13} color={couleurs.terracottaLight} />
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {new Date(projet.date_realisation).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </Texte>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="musical-notes-outline" size={13} color={couleurs.terracottaLight} />
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            {morceaux} morceau{morceaux > 1 ? "x" : ""}
          </Texte>
        </View>
      </View>
    </Pressable>
  );
}

export function OngletProjets({
  groupeId,
  estGestionnaire,
}: {
  groupeId: string;
  estGestionnaire: boolean;
}) {
  const { data: projets = [], isLoading } = useProjetsGroupe(groupeId);
  const [modeCreation, setModeCreation] = useState(false);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
          {projets.length} projet{projets.length > 1 ? "s" : ""}
        </Texte>
        {estGestionnaire && !modeCreation && (
          <BoutonAjout titre="Nouveau" onPress={() => setModeCreation(true)} />
        )}
      </View>

      {isLoading ? (
        <>
          <SqueletteListe lignes={2} hauteur={110} />
        </>
      ) : projets.length === 0 && !modeCreation ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Ionicons name="albums-outline" size={32} color={couleurs.terracottaLight} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 10, textAlign: "center" }}>
            Aucun projet. {estGestionnaire ? "Crée un événement ou une production." : ""}
          </Texte>
        </View>
      ) : (
        projets.map((projet) => (
          <CarteProjet key={projet.id} projet={projet} morceaux={projet.morceaux?.count ?? 0} />
        ))
      )}

      <ModalNouveauProjet
        visible={modeCreation && estGestionnaire}
        groupeId={groupeId}
        onFermer={() => setModeCreation(false)}
      />
    </View>
  );
}
