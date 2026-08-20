import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs } from "@/lib/theme";
import { Texte } from "./texte";

/**
 * Bouton principal doré (pill) du design system — utilisé sur les écrans
 * d'authentification. Fond warmGold, texte charcoal, glow doux.
 */
export function BoutonDore({
  titre,
  icone,
  chargement = false,
  onPress,
}: {
  titre: string;
  icone: keyof typeof Ionicons.glyphMap;
  chargement?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={chargement}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 999,
        backgroundColor: couleurs.warmGold,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: chargement ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: couleurs.warmGold,
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      })}
    >
      {chargement ? (
        <ActivityIndicator size="small" color={couleurs.charcoal} />
      ) : (
        <>
          <Texte poids="bold" variante="corps" couleur={couleurs.charcoal}>
            {titre}
          </Texte>
          <Ionicons name={icone} size={18} color={couleurs.charcoal} />
        </>
      )}
    </Pressable>
  );
}

/** Bouton secondaire bordé (pill) — ex : « Continuer avec l'email ». */
export function BoutonBorde({
  titre,
  icone,
  onPress,
}: {
  titre: string;
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 12,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icone && <Ionicons name={icone} size={20} color={couleurs.texte} />}
      <Texte poids="bold">{titre}</Texte>
    </Pressable>
  );
}

/** Séparateur « ou » centré. */
export function SeparateurOu() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
      <Texte
        variante="micro"
        poids="bold"
        couleur={couleurs.texteSecondaire}
        style={{ letterSpacing: 2, marginHorizontal: 16 }}
      >
        ou
      </Texte>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
    </View>
  );
}
