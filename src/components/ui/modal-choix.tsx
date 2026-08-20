import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export type ElementChoix = {
  id: string;
  titre: string;
  sousTitre?: string;
  icone?: keyof typeof Ionicons.glyphMap;
};

/**
 * Modal de sélection dans une liste (feuille centrée).
 * Un appui sur un élément appelle `surChoisir(id)` puis l'appelant ferme la modal.
 */
export function ModalChoix({
  visible,
  titre,
  elements,
  surChoisir,
  onFermer,
  messageVide,
}: {
  visible: boolean;
  titre: string;
  elements: ElementChoix[];
  surChoisir: (id: string) => void;
  onFermer: () => void;
  messageVide?: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <Pressable style={styles.arrierePlan} onPress={onFermer}>
        {/* Le Pressable vide capture l'appui pour ne pas fermer la feuille */}
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={styles.enTete}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              {titre}
            </Texte>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={styles.boutonFermer}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} bounces={false}>
            {elements.length === 0 ? (
              <Texte
                variante="petit"
                couleur={couleurs.texteSecondaire}
                style={{ textAlign: "center", paddingVertical: 28 }}
              >
                {messageVide ?? "Aucun élément disponible."}
              </Texte>
            ) : (
              <View style={{ gap: 8 }}>
                {elements.map((element) => (
                  <Pressable
                    key={element.id}
                    onPress={() => surChoisir(element.id)}
                    accessibilityRole="button"
                    accessibilityLabel={element.titre}
                    style={({ pressed }) => [
                      styles.ligne,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    {element.icone && (
                      <Ionicons
                        name={element.icone}
                        size={18}
                        color={couleurs.terracottaLight}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Texte variante="petit" poids="semibold" numberOfLines={1}>
                        {element.titre}
                      </Texte>
                      {element.sousTitre && (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {element.sousTitre}
                        </Texte>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={couleurs.muted} />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arrierePlan: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  feuille: {
    width: "100%",
    maxWidth: 380,
    borderRadius: rayons.lg,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    padding: 20,
  },
  enTete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  boutonFermer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.surfaceCarte,
  },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surfaceCarte,
    padding: 12,
  },
});
