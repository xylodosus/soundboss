import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { couleurs, police, rayons } from "@/lib/theme";
import { urlLectureR2 } from "@/lib/r2";
import { Texte } from "./texte";

/**
 * Avatar : photo (URL ou clé R2 signée) sinon initiales.
 */
export function Avatar({
  prenom,
  nom,
  url,
  taille = 40,
}: {
  prenom?: string | null;
  nom?: string | null;
  url?: string | null;
  taille?: number;
}) {
  const [resolue, setResolue] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    setResolue(null);
    if (!url) return;
    if (url.startsWith("http")) {
      setResolue(url);
      return;
    }
    urlLectureR2(url).then((u) => {
      if (actif) setResolue(u);
    });
    return () => {
      actif = false;
    };
  }, [url]);

  const initiales =
    [prenom, nom]
      .filter(Boolean)
      .map((v) => (v as string)[0]?.toUpperCase())
      .join("") || "?";

  if (resolue) {
    return (
      <Image
        source={{ uri: resolue }}
        style={{ width: taille, height: taille, borderRadius: taille / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: taille,
        height: taille,
        borderRadius: taille / 2,
        backgroundColor: "rgba(251,191,36,0.2)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Texte
        poids="extrabold"
        couleur={couleurs.warmGold}
        style={{ fontFamily: police.extrabold, fontSize: taille * 0.38 }}
      >
        {initiales}
      </Texte>
    </View>
  );
}

/**
 * Visuel (photo de groupe/studio) : image signée R2 ou dégradé + note.
 */
export function VisuelGroupe({
  url,
  style,
  rayonsImg = rayons.md,
}: {
  url?: string | null;
  style?: object;
  rayonsImg?: number;
}) {
  const [resolue, setResolue] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    setResolue(null);
    if (!url) return;
    if (url.startsWith("http")) {
      setResolue(url);
      return;
    }
    urlLectureR2(url).then((u) => {
      if (actif) setResolue(u);
    });
    return () => {
      actif = false;
    };
  }, [url]);

  if (resolue) {
    return (
      <Image
        source={{ uri: resolue }}
        style={[{ borderRadius: rayonsImg }, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: rayonsImg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(251,191,36,0.08)",
        },
        style,
      ]}
    >
      <Ionicons name="musical-notes" size={26} color={couleurs.warmGold} />
    </View>
  );
}
