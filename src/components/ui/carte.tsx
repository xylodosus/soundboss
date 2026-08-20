import { View, type StyleProp, type ViewStyle } from "react-native";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export function Carte({
  children,
  style,
  surAppui,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  surAppui?: () => void;
}) {
  return (
    <View
      onTouchEnd={surAppui}
      style={[
        {
          borderRadius: rayons.lg,
          borderWidth: 1,
          borderColor: couleurs.bordureCarte,
          backgroundColor: couleurs.surfaceCarte,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Pastille de statut (badge pill). */
export function Pastille({
  texte,
  couleurFond = "rgba(255,255,255,0.08)",
  couleurTexte = couleurs.texte,
}: {
  texte: string;
  couleurFond?: string;
  couleurTexte?: string;
}) {
  return (
    <View
      style={{
        borderRadius: rayons.pill,
        backgroundColor: couleurFond,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Texte variante="micro" poids="bold" couleur={couleurTexte}>
        {texte}
      </Texte>
    </View>
  );
}

export function EnTeteSection({
  titre,
  sousTitre,
  action,
}: {
  titre: string;
  sousTitre?: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Texte variante="titre3" poids="extrabold">
          {titre}
        </Texte>
        {sousTitre && (
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            {sousTitre}
          </Texte>
        )}
      </View>
      {action}
    </View>
  );
}
