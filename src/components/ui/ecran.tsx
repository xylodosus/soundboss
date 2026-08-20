import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { couleurs } from "@/lib/theme";

/**
 * Coquille d'écran : SafeArea + fond sombre + barre de statut claire.
 */
export function Ecran({
  children,
  bordHaut = true,
}: {
  children: React.ReactNode;
  bordHaut?: boolean;
}) {
  return (
    <SafeAreaView
      edges={bordHaut ? ["top"] : []}
      style={{ flex: 1, backgroundColor: couleurs.fond }}
    >
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>{children}</View>
    </SafeAreaView>
  );
}
