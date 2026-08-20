import { TextInput, View, type TextInputProps } from "react-native";
import { couleurs, police, rayons } from "@/lib/theme";
import { Texte } from "./texte";

export function Champ({
  erreur = false,
  style,
  ...props
}: TextInputProps & { erreur?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={couleurs.texteFaible}
      selectionColor={couleurs.warmGold}
      {...props}
      style={[
        {
          minHeight: 52,
          borderRadius: rayons.md,
          borderWidth: 1,
          borderColor: erreur ? "rgba(224,82,74,0.6)" : "rgba(255,255,255,0.1)",
          backgroundColor: couleurs.charcoal,
          paddingHorizontal: 16,
          color: couleurs.texte,
          fontSize: 16,
          fontFamily: police.regular,
        },
        style,
      ]}
    />
  );
}

export function ZoneTexte({
  erreur = false,
  style,
  ...props
}: TextInputProps & { erreur?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={couleurs.texteFaible}
      selectionColor={couleurs.warmGold}
      multiline
      textAlignVertical="top"
      {...props}
      style={[
        {
          minHeight: 96,
          borderRadius: rayons.md,
          borderWidth: 1,
          borderColor: erreur ? "rgba(224,82,74,0.6)" : "rgba(255,255,255,0.1)",
          backgroundColor: couleurs.charcoal,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: couleurs.texte,
          fontSize: 15,
          fontFamily: police.regular,
        },
        style,
      ]}
    />
  );
}

export function Etiquette({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Texte variante="petit" poids="medium" couleur={couleurs.texte}>
        {children}
      </Texte>
    </View>
  );
}

export function ErreurChamp({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={{ marginTop: 4 }}>
      <Texte variante="micro" couleur={couleurs.danger}>
        {message}
      </Texte>
    </View>
  );
}

export function AlerteErreur({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View
      style={{
        borderRadius: rayons.md,
        backgroundColor: "rgba(224,82,74,0.12)",
        borderWidth: 1,
        borderColor: "rgba(224,82,74,0.35)",
        padding: 14,
      }}
    >
      <Texte variante="petit" couleur="#E07A56">
        {message}
      </Texte>
    </View>
  );
}
