import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export type VarianteDialogue = "confirmation" | "succes" | "erreur";

type Configuration = {
  icone: keyof typeof Ionicons.glyphMap;
  couleur: string;
  fond: string;
};

const CONFIGURATIONS: Record<VarianteDialogue, Configuration> = {
  confirmation: {
    icone: "warning",
    couleur: couleurs.danger,
    fond: couleurs.danger15,
  },
  succes: {
    icone: "checkmark-circle",
    couleur: couleurs.success,
    fond: couleurs.success15,
  },
  erreur: {
    icone: "close-circle",
    couleur: couleurs.danger,
    fond: couleurs.danger15,
  },
};

/**
 * Boîte de dialogue custom (succès / erreur / confirmation).
 * - confirmation : deux boutons (annuler / confirmer), le fond est « danger » par défaut.
 * - succes / erreur : un bouton unique pour fermer.
 * La pression sur le fond ferme la boîte (annule une confirmation).
 */
export function BoiteDialogue({
  visible,
  variante = "confirmation",
  titre,
  message,
  boutonConfirmer = "OK",
  boutonAnnuler = "Annuler",
  danger = true,
  surConfirmer,
  surAnnuler,
  surFermer,
}: {
  visible: boolean;
  variante?: VarianteDialogue;
  titre: string;
  message?: string;
  boutonConfirmer?: string;
  boutonAnnuler?: string;
  danger?: boolean;
  surConfirmer?: () => void;
  surAnnuler?: () => void;
  surFermer?: () => void;
}) {
  const config = CONFIGURATIONS[variante];
  const configConfirmation = danger ? CONFIGURATIONS.confirmation : {
    icone: "information-circle",
    couleur: couleurs.warmGold,
    fond: couleurs.warmGold10,
  } as Configuration;

  const opacite = useSharedValue(0);
  const echelle = useSharedValue(0.92);

  useEffect(() => {
    if (!visible) return;
    opacite.value = withTiming(1, { duration: 180 });
    echelle.value = withTiming(1, { duration: 180 });
  }, [visible, opacite, echelle]);

  const styleCarte = useAnimatedStyle(() => ({
    opacity: opacite.value,
    transform: [{ scale: echelle.value }],
  }));

  const icone = variante === "confirmation" ? configConfirmation.icone : config.icone;
  const couleurIcone = variante === "confirmation" ? configConfirmation.couleur : config.couleur;
  const fondIcone = variante === "confirmation" ? configConfirmation.fond : config.fond;

  function fermer() {
    if (variante === "confirmation") surAnnuler?.();
    else surFermer?.();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={fermer}
      statusBarTranslucent
    >
      <View style={styles.arrierePlan}>
        <Pressable
          onPress={fermer}
          accessibilityRole="button"
          accessibilityLabel="Fermer la boîte de dialogue"
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.carte, styleCarte]}>
          <View style={[styles.cercle, { backgroundColor: fondIcone }]}>
            <Ionicons name={icone} size={32} color={couleurIcone} />
          </View>

          <Texte
            variante="titre3"
            poids="extrabold"
            style={{ textAlign: "center", marginTop: 16 }}
          >
            {titre}
          </Texte>

          {message ? (
            <Texte
              variante="petit"
              couleur={couleurs.texteSecondaire}
              style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}
            >
              {message}
            </Texte>
          ) : null}

          {variante === "confirmation" ? (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <BoutonDialogue
                variante="secondaire"
                titre={boutonAnnuler}
                surAppui={surAnnuler}
                style={{ flex: 1 }}
              />
              <BoutonDialogue
                variante={danger ? "danger" : "primaire"}
                titre={boutonConfirmer}
                surAppui={surConfirmer}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <BoutonDialogue
              variante="primaire"
              titre={boutonConfirmer}
              surAppui={surConfirmer}
              style={{ marginTop: 24, alignSelf: "stretch" }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function BoutonDialogue({
  titre,
  surAppui,
  variante,
  style,
}: {
  titre: string;
  surAppui?: () => void;
  variante: "primaire" | "secondaire" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  const stylesParVariante: Record<typeof variante, ViewStyle> = {
    primaire: { backgroundColor: couleurs.warmGold },
    secondaire: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
    },
    danger: { backgroundColor: couleurs.danger },
  };
  const couleurTexte =
    variante === "secondaire" ? couleurs.texte : variante === "danger" ? couleurs.cream : couleurs.charcoal;

  return (
    <Pressable
      onPress={surAppui}
      accessibilityRole="button"
      accessibilityLabel={titre}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: rayons.pill,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        stylesParVariante[variante],
        style,
      ]}
    >
      <Texte poids="bold" couleur={couleurTexte}>
        {titre}
      </Texte>
    </Pressable>
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
  carte: {
    width: "100%",
    maxWidth: 360,
    borderRadius: rayons.lg,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    padding: 24,
    alignItems: "center",
    shadowColor: couleurs.ombre,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cercle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
