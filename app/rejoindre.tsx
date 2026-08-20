import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRejoindreParCode } from "@/lib/queries/groupes";
import { useDialogue } from "@/lib/dialogue";
import { couleurs } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";

/** Page « Rejoindre un groupe » — accessible via le lien soundboss://rejoindre?code=123456 */
export default function Rejoindre() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const rejoindre = useRejoindreParCode();
  const dialogue = useDialogue();

  const [code, setCode] = useState((codeParam ?? "").replace(/[^0-9]/g, "").slice(0, 6));
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (codeParam) setCode(codeParam.replace(/[^0-9]/g, "").slice(0, 6));
  }, [codeParam]);

  async function rejoindreGroupe() {
    setErreur(null);
    if (code.length !== 6) {
      setErreur("Le code d'invitation contient 6 chiffres.");
      return;
    }
    try {
      const resultat = await rejoindre.mutateAsync(code);
      dialogue.succes(`Bienvenue dans « ${resultat.groupe_nom} » !`);
      router.replace(`/groupes/${resultat.groupe_id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Code invalide.");
    }
  }

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: couleurs.surfaceCarte,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>

          <View style={{ alignItems: "center", gap: 8, marginBottom: 24 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(251,191,36,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="key" size={34} color={couleurs.warmGold} />
            </View>
            <Texte variante="titre2" poids="extrabold" style={{ marginTop: 8 }}>
              Rejoindre un groupe
            </Texte>
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ textAlign: "center" }}>
              Saisis le code d&apos;invitation reçu pour rejoindre le groupe.
            </Texte>
          </View>

          <AlerteErreur message={erreur} />

          <View style={{ gap: 12, marginTop: 8 }}>
            <Champ
              placeholder="Code à 6 chiffres"
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              style={{ textAlign: "center", fontSize: 22, letterSpacing: 8, fontFamily: "PlusJakartaSans_700Bold" }}
            />
            <Bouton
              titre="Rejoindre"
              taille="lg"
              chargement={rejoindre.isPending}
              disabled={code.length !== 6}
              onPress={rejoindreGroupe}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
