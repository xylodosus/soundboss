import { useState } from "react";
import { KeyboardAvoidingView, Platform, FlatList, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProjetsPersonnels } from "@/lib/queries/projets";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { CarteProjet } from "@/components/projet/onglet-projets";
import { ModalNouveauProjet } from "@/components/projet/modal-nouveau-projet";
import { OngletRessources } from "@/components/ressources/onglet-ressources";
import { OngletFichiersPersonnels } from "@/components/personnel/onglet-fichiers-personnels";

const ONGLETS = [
  { id: "projets", label: "Projets" },
  { id: "fichiers", label: "Fichiers" },
  { id: "ressources", label: "Ressources" },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

export default function MesProjets() {
  const { data: projets = [], isLoading } = useProjetsPersonnels();
  const [onglet, setOnglet] = useState<OngletId>("projets");
  const [modeCreation, setModeCreation] = useState(false);

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

          {/* Onglets */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              paddingHorizontal: 20,
              paddingBottom: 10,
            }}
          >
            {ONGLETS.map((o) => {
              const actif = onglet === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setOnglet(o.id)}
                  accessibilityRole="button"
                  accessibilityState={actif ? { selected: true } : undefined}
                  accessibilityLabel={`Onglet ${o.label}`}
                  style={{
                    flex: 1,
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                    backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Texte
                    variante="petit"
                    poids={actif ? "bold" : "medium"}
                    couleur={actif ? couleurs.warmGold : couleurs.texteSecondaire}
                    style={{ fontFamily: actif ? police.bold : police.medium }}
                  >
                    {o.label}
                  </Texte>
                </Pressable>
              );
            })}
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
        </View>
      </KeyboardAvoidingView>

      <ModalNouveauProjet
        visible={modeCreation}
        onFermer={() => setModeCreation(false)}
      />
    </Ecran>
  );
}
