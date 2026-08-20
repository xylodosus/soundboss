import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { couleurs, police, rayons } from "@/lib/theme";

type Variante = "primaire" | "secondaire" | "fantome" | "danger";
type Taille = "md" | "lg" | "sm";

const VARIANTS: Record<Variante, ViewStyle> = {
  primaire: { backgroundColor: couleurs.warmGold },
  secondaire: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  fantome: { backgroundColor: "transparent" },
  danger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(224,82,74,0.35)",
  },
};

const TAILLES: Record<Taille, ViewStyle> = {
  sm: { minHeight: 40, paddingHorizontal: 16, borderRadius: rayons.pill },
  md: { minHeight: 48, paddingHorizontal: 24, borderRadius: rayons.pill },
  lg: { minHeight: 56, paddingHorizontal: 32, borderRadius: rayons.pill },
};

const COULEUR_TEXTE: Record<Variante, string> = {
  primaire: couleurs.charcoal,
  secondaire: couleurs.cream,
  fantome: couleurs.muted,
  danger: couleurs.danger,
};

export function Bouton({
  variante = "primaire",
  taille = "md",
  chargement = false,
  titre,
  style,
  children,
  ...props
}: PressableProps & {
  variante?: Variante;
  taille?: Taille;
  chargement?: boolean;
  titre?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const desactive = props.disabled || chargement;
  const couleurTexte = COULEUR_TEXTE[variante];

  return (
    <Pressable
      {...props}
      disabled={desactive}
      style={({ pressed }) => [
        {
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: desactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !desactive ? 0.98 : 1 }],
        },
        VARIANTS[variante],
        TAILLES[taille],
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator size="small" color={couleurTexte} />
      ) : (
        <>
          {children}
          {titre && (
            <Text
              style={{
                fontFamily: police.bold,
                fontSize: taille === "lg" ? 16 : 15,
                lineHeight: taille === "lg" ? 22 : 21,
                color: couleurTexte,
                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
              }}
            >
              {titre}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}
