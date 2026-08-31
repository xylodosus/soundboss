import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, espacement } from "@/lib/theme";
import { Ecran } from "./ecran";
import { Texte } from "./texte";
import { Bouton } from "./bouton";

/**
 * Affiché quand la session n'a pas pu être établie faute de réseau. On ne
 * renvoie pas au login : l'utilisateur n'est pas déconnecté, il est injoignable.
 * Le lien de secours reste offert au cas où il souhaite vraiment se reconnecter.
 */
export function EcranHorsLigne() {
  const router = useRouter();

  return (
    <Ecran>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: espacement.xl,
          gap: espacement.lg,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={64} color={couleurs.texteSecondaire} />
        <Texte variante="titre3" poids="extrabold" style={{ textAlign: "center" }}>
          Pas de connexion
        </Texte>
        <Texte couleur={couleurs.texteSecondaire} style={{ textAlign: "center" }}>
          SoundBoss a besoin d&apos;Internet pour retrouver ta session. Tes données
          restent en place, reconnecte-toi au réseau et réessaie.
        </Texte>
        <Bouton
          titre="Se connecter au compte"
          variante="fantome"
          onPress={() => router.replace("/connexion")}
        />
      </View>
    </Ecran>
  );
}
