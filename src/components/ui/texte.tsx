import { Platform, Text as NativeText, type TextProps, type TextStyle } from "react-native";
import { couleurs, police, tailles } from "@/lib/theme";

type Variante = "titre1" | "titre2" | "titre3" | "corps" | "petit" | "micro" | "etiquette";
type Poids = "regular" | "medium" | "semibold" | "bold" | "extrabold";

const TAILLES: Record<Variante, number> = {
  titre1: tailles.titre1,
  titre2: tailles.titre2,
  titre3: tailles.titre3,
  corps: tailles.corps,
  petit: tailles.petit,
  micro: tailles.micro,
  etiquette: 12,
};

// lineHeight légèrement supérieur à la taille : centrage vertical propre
// avec les polices custom (Plus Jakarta a une métrique haute).
const HAUTEURS_LIGNE: Record<Variante, number> = {
  titre1: 34,
  titre2: 28,
  titre3: 24,
  corps: 21,
  petit: 18,
  micro: 15,
  etiquette: 16,
};

const FONTS: Record<Poids, string> = {
  regular: police.regular,
  medium: police.medium,
  semibold: police.semibold,
  bold: police.bold,
  extrabold: police.extrabold,
};

export function Texte({
  variante = "corps",
  poids = "regular",
  couleur = couleurs.texte,
  style,
  ...props
}: TextProps & {
  variante?: Variante;
  poids?: Poids;
  couleur?: string;
  style?: TextStyle | TextStyle[];
}) {
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: FONTS[poids],
          fontSize: TAILLES[variante],
          lineHeight: HAUTEURS_LIGNE[variante],
          color: couleur,
          // Android ajoute un padding au-dessus/au-dessous du texte custom,
          // ce qui fausse le centrage vertical dans les boutons.
          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
        },
        style,
      ]}
    />
  );
}
