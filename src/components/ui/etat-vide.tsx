import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs } from "@/lib/theme";
import { Texte } from "./texte";
import { Bouton } from "./bouton";
import { Shimmer, SqueletteListe } from "./shimmer";

export { SqueletteListe };

/**
 * État vide guidé : icône + message + CTA optionnel.
 */
export function EtatVide({
  icone,
  titre,
  message,
  action,
  actionTitre,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  message?: string;
  action?: () => void;
  actionTitre?: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 48,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: "rgba(224,122,86,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icone} size={28} color={couleurs.terracottaLight} />
      </View>
      <Texte
        variante="titre3"
        poids="bold"
        style={{ marginTop: 16, textAlign: "center" }}
      >
        {titre}
      </Texte>
      {message && (
        <Texte
          variante="petit"
          couleur={couleurs.texteSecondaire}
          style={{ marginTop: 6, textAlign: "center", lineHeight: 20 }}
        >
          {message}
        </Texte>
      )}
      {action && actionTitre && (
        <Bouton style={{ marginTop: 20 }} onPress={action} titre={actionTitre} />
      )}
    </View>
  );
}

/** Ligne de chargement (skeleton avec effet shimmer). */
export function Squelette({
  hauteur = 80,
  style,
}: {
  hauteur?: number;
  style?: object;
}) {
  return <Shimmer style={[{ height: hauteur, marginBottom: 8 }, style]} />;
}
