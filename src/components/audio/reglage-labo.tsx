import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { couleurs, espacement, rayons } from "@/lib/theme";

/**
 * Réglage par paliers du labo.
 *
 * Volontairement pas un curseur continu : sur un morceau qu'on travaille, on
 * veut des valeurs reproductibles d'une séance à l'autre, pas une position de
 * doigt qu'on ne retrouvera pas demain.
 */
export function ReglageLabo({
  libelle,
  valeurAffichee,
  auNeutre,
  onMoins,
  onPlus,
  onNeutre,
}: {
  libelle: string;
  valeurAffichee: string;
  auNeutre: boolean;
  onMoins: () => void;
  onPlus: () => void;
  onNeutre: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.md }}>
      <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
        {libelle}
      </Texte>
      <Bouton icone="remove" label={`Diminuer ${libelle}`} onPress={onMoins} />
      {/* L'appui long ramène au neutre : plus rapide que dix appuis, et sans
          bouton supplémentaire dans une barre déjà chargée. */}
      <Pressable
        onLongPress={onNeutre}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${valeurAffichee}. Appui long pour revenir à la normale.`}
        style={{ minWidth: 72, minHeight: 44, justifyContent: "center", alignItems: "center" }}
      >
        <Texte
          variante="corps"
          poids="semibold"
          couleur={auNeutre ? couleurs.texteSecondaire : couleurs.warmGold}
        >
          {valeurAffichee}
        </Texte>
      </Pressable>
      <Bouton icone="add" label={`Augmenter ${libelle}`} onPress={onPlus} />
    </View>
  );
}

function Bouton({
  icone,
  label,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: rayons.pill,
        backgroundColor: couleurs.surfaceCarte,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icone} size={18} color={couleurs.texte} />
    </Pressable>
  );
}
