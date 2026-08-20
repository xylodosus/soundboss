import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { FormulaireProjet } from "@/components/projet/formulaire-projet";

/** Modal de création d'un nouveau projet (groupe ou perso). */
export function ModalNouveauProjet({
  visible,
  groupeId,
  onFermer,
}: {
  visible: boolean;
  groupeId?: string | null;
  onFermer: () => void;
}) {
  const dialogue = useDialogue();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.arrierePlan}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onFermer} />
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={styles.enTete}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              Nouveau projet
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

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1 }}
          >
            <FormulaireProjet
              groupeId={groupeId}
              onAnnuler={() => {
                onFermer();
                dialogue.succes("Projet créé.");
              }}
            />
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
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
});
