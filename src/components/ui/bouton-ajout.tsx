import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

/** Bouton d'ajout standard : pilule jaune, texte noir (taille uniforme sur toute l'app). */
export function BoutonAjout({
  titre = "Ajouter",
  onPress,
  style,
}: {
  titre?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titre}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: rayons.pill,
          backgroundColor: couleurs.warmGold,
          paddingHorizontal: 14,
          paddingVertical: 7,
        },
        style,
      ]}
    >
      <Ionicons name="add" size={16} color={couleurs.charcoal} />
      <Texte variante="micro" poids="bold" couleur={couleurs.charcoal}>
        {titre}
      </Texte>
    </Pressable>
  );
}
