import { Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, police, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export type OngletBarre<T extends string> = {
  id: T;
  label: string;
  icone: keyof typeof Ionicons.glyphMap;
};

/**
 * Barre d'onglets d'un écran.
 *
 * Les pastilles se dimensionnent sur leur libellé et la rangée défile : à
 * largeur partagée, un intitulé comme « Générations IA » se retrouvait tronqué
 * sur un quart d'écran. Mieux vaut faire glisser que deviner.
 */
export function BarreOnglets<T extends string>({
  onglets,
  valeur,
  surChanger,
}: {
  onglets: readonly OngletBarre<T>[];
  valeur: T;
  surChanger: (id: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
    >
      {onglets.map((o) => {
        const actif = o.id === valeur;
        return (
          <Pressable
            key={o.id}
            onPress={() => surChanger(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            accessibilityLabel={`Onglet ${o.label}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 40,
              borderRadius: rayons.pill,
              backgroundColor: actif ? couleurs.warmGold : couleurs.surfaceCarte,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons
              name={o.icone}
              size={15}
              color={actif ? couleurs.charcoal : couleurs.muted}
            />
            <Texte
              variante="petit"
              poids={actif ? "bold" : "medium"}
              couleur={actif ? couleurs.charcoal : couleurs.texteSecondaire}
              style={{ fontFamily: actif ? police.bold : police.medium }}
            >
              {o.label}
            </Texte>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
