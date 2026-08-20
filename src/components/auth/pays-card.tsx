import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Drapeau } from "@/components/ui/drapeau";

export const PAYS_AFRIQUE = [
  "Côte d'Ivoire",
  "Sénégal",
  "Cameroun",
  "Mali",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Guinée",
  "Niger",
  "Tchad",
  "Gabon",
  "Congo (RDC)",
  "Congo (Brazzaville)",
  "Madagascar",
  "Rwanda",
  "Burundi",
  "Centrafrique",
  "Mauritanie",
  "Comores",
  "Djibouti",
  "Autre",
] as const;

export const INSTRUMENTS = [
  "Voix / Chant",
  "Piano",
  "Guitare",
  "Basse",
  "Batterie",
  "Percussions",
  "Saxophone",
  "Trompette",
  "Trombone",
  "Violon",
  "Kora",
  "Balafon",
  "Djembé",
  "Clavier / Synthé",
  "Autre",
] as const;

export const GENRES_MUSICAUX = [
  "Gospel",
  "Afrobeat",
  "Coupé-décalé",
  "Zouglou",
  "Zouk",
  "Reggae",
  "Soul",
  "Jazz",
  "Rumba",
  "Hip-hop",
  "Chorale classique",
  "Fusion",
  "Autre",
] as const;

export function PaysCard({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (pays: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {PAYS_AFRIQUE.map((pays) => {
        const actif = pays === valeur;
        return (
            <View
              key={pays}
              onTouchEnd={() => onChange(pays)}
              style={{
                borderRadius: rayons.pill,
                borderWidth: 1,
                borderColor: actif ? couleurs.terracottaLight : "rgba(255,255,255,0.12)",
                backgroundColor: actif ? "rgba(224,122,86,0.12)" : "transparent",
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Drapeau pays={pays} largeur={20} />
              <Texte
                variante="petit"
                poids={actif ? "bold" : "medium"}
                couleur={actif ? couleurs.terracottaLight : couleurs.texte}
              >
                {pays}
              </Texte>
            </View>
        );
      })}
    </View>
  );
}

export function SelectionPuces({
  options,
  valeurs,
  onChange,
  couleur = couleurs.warmGold,
}: {
  options: readonly string[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  couleur?: string;
}) {
  function basculer(option: string) {
    onChange(
      valeurs.includes(option)
        ? valeurs.filter((v) => v !== option)
        : [...valeurs, option]
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const actif = valeurs.includes(option);
        return (
          <View
            key={option}
            onTouchEnd={() => basculer(option)}
            style={{
              borderRadius: rayons.pill,
              borderWidth: 1,
              borderColor: actif ? couleur : "rgba(255,255,255,0.12)",
              backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            {actif && (
              <Ionicons name="checkmark" size={14} color={couleur} />
            )}
            <Texte
              variante="petit"
              poids={actif ? "bold" : "medium"}
              couleur={actif ? couleur : couleurs.texte}
            >
              {option}
            </Texte>
          </View>
        );
      })}
    </View>
  );
}
