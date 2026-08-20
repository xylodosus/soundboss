import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { erreurFrancaise } from "@/lib/erreurs";
import { couleurs } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";
import { Texte } from "@/components/ui/texte";

export default function MotDePasseOublie() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyerLien() {
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setChargement(false);
    if (error) {
      setErreur(erreurFrancaise(error.message));
      return;
    }
    setEnvoye(true);
  }

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Texte variante="titre2" poids="extrabold" style={{ marginTop: 24 }}>
            Mot de passe oublié
          </Texte>
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 6 }}>
            Reçois un lien de réinitialisation par email.
          </Texte>

          <View style={{ marginTop: 24 }}>
            <AlerteErreur message={erreur} />
            {envoye ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Texte variante="titre3" poids="bold" style={{ textAlign: "center" }}>
                  Vérifie ta boîte mail 📩
                </Texte>
                <Texte
                  variante="petit"
                  couleur={couleurs.texteSecondaire}
                  style={{ textAlign: "center", marginTop: 8 }}
                >
                  Un lien de réinitialisation vient de t&apos;être envoyé à {email}.
                </Texte>
                <Bouton
                  titre="Retour à la connexion"
                  style={{ marginTop: 24 }}
                  onPress={() => router.replace("/connexion")}
                />
              </View>
            ) : (
              <>
                <Champ
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="toi@exemple.com"
                  value={email}
                  onChangeText={setEmail}
                  style={{ marginTop: 16 }}
                />
                <Bouton
                  titre="Envoyer le lien"
                  taille="lg"
                  chargement={chargement}
                  onPress={envoyerLien}
                  style={{ marginTop: 20 }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
