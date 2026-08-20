import { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs } from "@/lib/theme";

/** URL de lecture signée R2 (mise en cache) pour une clé. */
export function useUrlR2(cle: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    if (!cle) {
      setUrl(null);
      return;
    }
    setUrl(null);
    urlLectureR2(cle).then((u) => {
      if (actif) setUrl(u);
    });
    return () => {
      actif = false;
    };
  }, [cle]);

  return url;
}

/** Aperçu réel d'une image depuis R2 (repli : icône). */
export function VignetteImage({
  cle,
  hauteur,
  contenir = false,
}: {
  cle: string;
  hauteur: number;
  contenir?: boolean;
}) {
  const url = useUrlR2(cle);

  if (!url) {
    return (
      <View
        style={{
          height: hauteur,
          width: "100%",
          backgroundColor: "rgba(52,211,153,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="image-outline" size={30} color={couleurs.texteSecondaire} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ height: hauteur, width: "100%" }}
      contentFit={contenir ? "contain" : "cover"}
      transition={150}
      placeholder={{ blurhash: undefined }}
    />
  );
}
