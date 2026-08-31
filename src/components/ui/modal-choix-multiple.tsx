import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, espacement, rayons } from "@/lib/theme";
import { Texte } from "./texte";
import { Bouton } from "./bouton";

export interface ElementChoixMultiple {
  id: string;
  titre: string;
  sousTitre?: string;
  couleur?: string | null;
}

/**
 * Sélection de plusieurs éléments, validée explicitement.
 *
 * Distincte de ModalChoix, qui ferme au premier appui : ici l'utilisateur
 * compose un ensemble, il faut donc qu'il puisse cocher plusieurs entrées puis
 * confirmer. Ne rien cocher est un choix valide et signifie « tout le groupe ».
 */
export function ModalChoixMultiple({
  visible,
  titre,
  sousTitre,
  elements,
  selectionInitiale = [],
  messageVide,
  libelleValider = "Valider",
  surValider,
  onFermer,
}: {
  visible: boolean;
  titre: string;
  sousTitre?: string;
  elements: ElementChoixMultiple[];
  selectionInitiale?: string[];
  messageVide?: string;
  libelleValider?: string;
  surValider: (ids: string[]) => void;
  onFermer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<string[]>(selectionInitiale);

  // Repart de la sélection fournie à chaque ouverture : sans ça, la modale
  // rouvrirait avec les cases du média précédent.
  useEffect(() => {
    if (visible) setSelection(selectionInitiale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function basculer(id: string) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onFermer} accessibilityLabel="Fermer" />

        <View
          style={{
            maxHeight: "80%",
            backgroundColor: couleurs.carte,
            borderTopLeftRadius: rayons.xl,
            borderTopRightRadius: rayons.xl,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: couleurs.bordure,
            paddingHorizontal: espacement.xl,
            paddingTop: espacement.md,
            paddingBottom: Math.max(insets.bottom, espacement.lg),
          }}
        >
          <View
            style={{
              width: 48,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignSelf: "center",
              marginBottom: espacement.lg,
            }}
          />

          <Texte variante="titre3" poids="extrabold">
            {titre}
          </Texte>
          {sousTitre && (
            <Texte
              variante="micro"
              couleur={couleurs.texteSecondaire}
              style={{ marginTop: 4 }}
            >
              {sousTitre}
            </Texte>
          )}

          <ScrollView
            style={{ marginTop: espacement.lg }}
            contentContainerStyle={{ gap: espacement.sm }}
          >
            {elements.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                {messageVide ?? "Aucun élément."}
              </Texte>
            ) : (
              elements.map((el) => {
                const coche = selection.includes(el.id);
                return (
                  <Pressable
                    key={el.id}
                    onPress={() => basculer(el.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: coche }}
                    accessibilityLabel={el.titre}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: espacement.md,
                      minHeight: 52,
                      paddingHorizontal: espacement.md,
                      borderRadius: rayons.md,
                      borderWidth: 1,
                      borderColor: coche ? couleurs.warmGold : couleurs.bordure,
                      backgroundColor: coche ? couleurs.warmGold10 : couleurs.surfaceCarte,
                    }}
                  >
                    <Ionicons
                      name={coche ? "checkbox" : "square-outline"}
                      size={20}
                      color={coche ? couleurs.warmGold : couleurs.texteSecondaire}
                    />
                    <View style={{ flex: 1 }}>
                      <Texte variante="petit" poids="semibold" numberOfLines={1}>
                        {el.titre}
                      </Texte>
                      {el.sousTitre && (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {el.sousTitre}
                        </Texte>
                      )}
                    </View>
                    {el.couleur && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: el.couleur,
                        }}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: espacement.md, marginTop: espacement.lg }}>
            <Bouton
              titre={libelleValider}
              onPress={() => surValider(selection)}
              style={{ flex: 1 }}
            />
            <Bouton variante="secondaire" titre="Annuler" onPress={onFermer} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
