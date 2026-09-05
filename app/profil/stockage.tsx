import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { VueStockage } from "@/components/groupe/onglet-stockage";
import { useStockagePersonnel } from "@/lib/queries/stockage";
import { couleurs, espacement } from "@/lib/theme";

/**
 * Stockage personnel : fichiers propres et répétitions sans groupe, pistes
 * extraites comprises.
 *
 * Ce qui appartient à un groupe est compté chez lui, pas ici — c'est le groupe
 * qui possède ses audios de répétition, quel que soit le membre qui les a
 * déposés ou en a extrait les pistes.
 */
export default function StockagePersonnel() {
  const router = useRouter();
  const { data: stockage, isLoading } = useStockagePersonnel();

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: espacement.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{ width: 40 }}
          >
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
            Mon stockage
          </Texte>
        </View>
        <VueStockage
          stockage={stockage}
          isLoading={isLoading}
          messageVide="Tes fichiers personnels et tes répétitions solo apparaîtront ici."
        />
        <View>
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            Les fichiers et répétitions d&apos;un groupe sont comptés dans le stockage de ce
            groupe, pas ici.
          </Texte>
        </View>
      </ScrollView>
    </Ecran>
  );
}
