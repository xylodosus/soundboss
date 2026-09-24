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
  onValeur,
}: {
  libelle: string;
  valeurAffichee: string;
  auNeutre: boolean;
  onMoins: () => void;
  onPlus: () => void;
  onNeutre: () => void;
  /** Appui court sur la valeur — ouvre un choix quand il y en a un. */
  onValeur?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.md }}>
      <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
        {libelle}
      </Texte>
      <Bouton icone="remove" label={`Diminuer ${libelle}`} onPress={onMoins} />
      <Pressable
        onPress={onValeur}
        onLongPress={onNeutre}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${valeurAffichee}.${onValeur ? " Appuyer pour choisir." : ""} Appui long pour revenir à la normale.`}
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

      {/* Retour au neutre.
          L'appui long sur la valeur le fait aussi, mais un testeur a conclu que
          l'option n'existait pas : un geste caché n'est pas une option. La place
          est réservée en permanence pour que les boutons ne se déplacent pas
          quand il apparaît. */}
      <View style={{ width: 32, alignItems: "center" }}>
        {!auNeutre && (
          <Pressable
            onPress={onNeutre}
            accessibilityRole="button"
            accessibilityLabel={`Revenir au ${libelle.toLowerCase()} d'origine`}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Ionicons name="refresh" size={17} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </View>
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
