import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { KeyboardAvoidingView, Platform, FlatList, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProjetsPersonnels } from "@/lib/queries/projets";
import { couleurs } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { CarteProjet } from "@/components/projet/onglet-projets";
import { ModalNouveauProjet } from "@/components/projet/modal-nouveau-projet";
import { OngletRessources } from "@/components/ressources/onglet-ressources";
import { OngletFichiersPersonnels } from "@/components/personnel/onglet-fichiers-personnels";
import { ModalRecherche } from "@/components/ui/modal-recherche";
import { OngletGenerations } from "@/components/audio/onglet-generations";
import { BarreOnglets, type OngletBarre } from "@/components/ui/barre-onglets";
import { useRecherchePersonnelle } from "@/lib/queries/recherche";

const ONGLETS = [
  { id: "projets", label: "Projets", icone: "albums-outline" },
  { id: "fichiers", label: "Fichiers", icone: "folder-open-outline" },
  { id: "ressources", label: "Ressources", icone: "library-outline" },
  { id: "generations", label: "Générations IA", icone: "sparkles-outline" },
] as const satisfies readonly OngletBarre<string>[];

type OngletId = (typeof ONGLETS)[number]["id"];

export default function MesProjets() {
  const { data: projets = [], isLoading } = useProjetsPersonnels();
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [terme, setTerme] = useState("");
  const { data: resultats = [], isFetching: rechercheEnCours } = useRecherchePersonnelle(
    rechercheOuverte ? terme : ""
  );
  const [onglet, setOnglet] = useState<OngletId>("projets");
  const [modeCreation, setModeCreation] = useState(false);
  const router = useRouter();

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {/* En-tête */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Texte variante="titre2" poids="extrabold">
                Espace perso
              </Texte>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setRechercheOuverte(true)}
              accessibilityRole="button"
              accessibilityLabel="Rechercher dans l'espace perso"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: couleurs.surfaceCarte,
              }}
            >
              <Ionicons name="search" size={20} color={couleurs.texte} />
            </Pressable>
            {onglet === "projets" && !modeCreation && (
              <Pressable
                onPress={() => setModeCreation(true)}
                accessibilityRole="button"
                accessibilityLabel="Nouveau projet"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: couleurs.warmGold,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={26} color={couleurs.charcoal} />
              </Pressable>
            )}
            </View>
          </View>

          {/* Onglets */}
          <View style={{ paddingBottom: 10 }}>
            <BarreOnglets onglets={ONGLETS} valeur={onglet} surChanger={setOnglet} />
          </View>

          {/* Contenu */}
          {onglet === "projets" && (
            <FlatList
              data={projets}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                isLoading ? (
                  <View>
                    <SqueletteListe lignes={2} hauteur={110} />
                  </View>
                ) : (
                  <EtatVide
                    icone="albums-outline"
                    titre="Aucun projet perso"
                    message="Prépare un concert, un EP ou un album en solo."
                    action={() => setModeCreation(true)}
                    actionTitre="Nouveau projet"
                  />
                )
              }
              renderItem={({ item }) => (
                <CarteProjet projet={item} morceaux={item.morceaux?.count ?? 0} />
              )}
            />
          )}

          {onglet === "fichiers" && (
            <View style={{ padding: 20, paddingTop: 8 }}>
              <OngletFichiersPersonnels />
            </View>
          )}

          {onglet === "ressources" && (
            <View style={{ padding: 20, paddingTop: 8 }}>
              <OngletRessources />
            </View>
          )}

          {onglet === "generations" && (
            <View style={{ padding: 20, paddingTop: 8 }}>
              <OngletGenerations />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <ModalNouveauProjet
        visible={modeCreation}
        onFermer={() => setModeCreation(false)}
      />

      <ModalRecherche
        visible={rechercheOuverte}
        onFermer={() => {
          setRechercheOuverte(false);
          setTerme("");
        }}
        terme={terme}
        surTerme={setTerme}
        resultats={resultats}
        chargement={rechercheEnCours}
        placeholder="Rechercher un fichier, un projet…"
        surChoisir={(r) => {
          setRechercheOuverte(false);
          setTerme("");
          if (r.type === "projet") {
            router.push(`/projets/${r.id}` as Href);
          } else {
            // Un fichier personnel n'a pas d'écran à lui : on ouvre son onglet.
            setOnglet("fichiers");
          }
        }}
      />
    </Ecran>
  );
}
