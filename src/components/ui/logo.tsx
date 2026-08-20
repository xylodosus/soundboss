import { Text, View } from "react-native";
import { couleurs, police } from "@/lib/theme";

/**
 * Wordmark SoundBoss : « Sound » en blanc, « Boss » en jaune primaire.
 */
export function Logo({ taille = 32 }: { taille?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text style={{ fontFamily: police.extrabold, fontSize: taille, color: couleurs.texte }}>
        Sound
      </Text>
      <Text style={{ fontFamily: police.extrabold, fontSize: taille, color: couleurs.warmGold }}>
        Boss
      </Text>
    </View>
  );
}
