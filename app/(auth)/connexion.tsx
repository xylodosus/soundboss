import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { erreurFrancaise } from "@/lib/erreurs";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Logo } from "@/components/ui/logo";
import { BoutonDore, BoutonBorde } from "@/components/ui/bouton-dore";
import { AlerteErreur } from "@/components/ui/champ";

const INDICATIF = "+225";

/**
 * Connexion — onglets Téléphone (OTP SMS) / Email, logo doré,
 * footer inscription. Page scrollable (le clavier ne masque
 * jamais les champs). Système de couleurs : design system
 * centralisé (src/lib/theme.ts).
 */
export default function Connexion() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"telephone" | "email">("telephone");

  // Téléphone (OTP)
  const [telephone, setTelephone] = useState("");
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [code, setCode] = useState("");
  const [envoiCode, setEnvoiCode] = useState(false);

  // Email (mot de passe)
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  const [erreur, setErreur] = useState<string | null>(null);

  async function recevoirCode() {
    setErreur(null);
    const numero = telephone.replace(/[\s.-]/g, "");
    if (numero.length < 8) {
      setErreur("Indique ton numéro de téléphone.");
      return;
    }
    setEnvoiCode(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: `${INDICATIF}${numero}`,
    });
    setEnvoiCode(false);
    if (error) {
      setErreur(erreurFrancaise(error.message));
      return;
    }
    setCodeEnvoye(true);
  }

  async function verifierCode() {
    setErreur(null);
    if (code.length < 4) {
      setErreur("Saisis le code reçu par SMS.");
      return;
    }
    setEnvoiCode(true);
    const numero = telephone.replace(/[\s.-]/g, "");
    const { error } = await supabase.auth.verifyOtp({
      phone: `${INDICATIF}${numero}`,
      token: code.trim(),
      type: "sms",
    });
    setEnvoiCode(false);
    if (error) {
      setErreur(erreurFrancaise(error.message));
    }
    // Succès : la garde de session (tabs) prend le relais
  }

  async function seConnecterEmail() {
    setErreur(null);
    if (!email.trim() || !motDePasse) {
      setErreur("Renseigne ton email et ton mot de passe.");
      return;
    }
    setEnvoiCode(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: motDePasse,
    });
    setEnvoiCode(false);
    if (error) {
      setErreur(erreurFrancaise(error.message));
    }
  }

  const chargement = envoiCode;

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Header minimal */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
            {router.canGoBack() && (
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: couleurs.carte,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="arrow-back" size={20} color={couleurs.texte} />
              </Pressable>
            )}
          </View>

          {/* Logo */}
          <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 16 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: couleurs.warmGold,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: couleurs.warmGold,
                shadowOpacity: 0.4,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 0 },
                elevation: 12,
              }}
            >
              <Ionicons name="musical-notes" size={36} color={couleurs.charcoal} />
            </View>
            <Logo taille={34} />
            <Texte
              variante="petit"
              couleur={couleurs.texteSecondaire}
              style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 }}
            >
              L&apos;écosystème digital des musiciens africains
            </Texte>
          </View>

          {/* Conteneur formulaire */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
            {/* Onglets */}
            <View
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: couleurs.bordure,
                marginBottom: 32,
              }}
            >
              {(
                [
                  { id: "telephone", label: "Téléphone" },
                  { id: "email", label: "Email" },
                ] as const
              ).map((o) => {
                const actif = onglet === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setOnglet(o.id)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingTop: 16,
                      paddingBottom: 13,
                      borderBottomWidth: 3,
                      borderBottomColor: actif ? couleurs.warmGold : "transparent",
                    }}
                  >
                    <Texte
                      variante="corps"
                      poids="bold"
                      couleur={actif ? couleurs.texte : couleurs.texteSecondaire}
                    >
                      {o.label}
                    </Texte>
                  </Pressable>
                );
              })}
            </View>

            <AlerteErreur message={erreur} />

            {onglet === "telephone" ? (
              <View style={{ gap: 24 }}>
                {/* Champ téléphone */}
                <View style={{ gap: 16 }}>
                  <Texte variante="corps" poids="medium" style={{ paddingBottom: 8 }}>
                    Numéro de téléphone
                  </Texte>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {/* Sélecteur de pays (indicatif fixe pour l'instant) */}
                    <View
                      style={{
                        minWidth: 90,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        borderRadius: rayons.md,
                        borderWidth: 1,
                        borderColor: couleurs.bordureForte,
                        backgroundColor: couleurs.carte,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Texte variante="corps" poids="medium">
                        {INDICATIF}
                      </Texte>
                      <Ionicons name="chevron-down" size={14} color={couleurs.texteSecondaire} />
                    </View>
                    <TextInput
                      placeholder="00 00 00 00 00"
                      placeholderTextColor={couleurs.texteFaible}
                      keyboardType="phone-pad"
                      value={telephone}
                      onChangeText={setTelephone}
                      style={champStyle}
                    />
                  </View>
                </View>

                {/* Bouton principal OTP */}
                <BoutonDore
                  titre={codeEnvoye ? "Vérifier le code" : "Recevoir le code SMS"}
                  icone={codeEnvoye ? "checkmark" : "send"}
                  chargement={chargement}
                  onPress={codeEnvoye ? verifierCode : recevoirCode}
                />

                {codeEnvoye && (
                  <TextInput
                    placeholder="Code SMS (ex : 123456)"
                    placeholderTextColor={couleurs.texteFaible}
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                    style={[
                      champStyle,
                      {
                        textAlign: "center",
                        fontSize: 18,
                        fontFamily: police.semibold,
                        letterSpacing: 6,
                      },
                    ]}
                  />
                )}

                {/* Séparateur */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bordure }} />
                  <Texte
                    variante="micro"
                    poids="bold"
                    couleur={couleurs.texteSecondaire}
                    style={{ letterSpacing: 2 }}
                  >
                    OU
                  </Texte>
                  <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bordure }} />
                </View>

                {/* Action secondaire → onglet email */}
                <BoutonBorde
                  titre="Continuer avec l'email"
                  icone="mail-outline"
                  onPress={() => setOnglet("email")}
                />
              </View>
            ) : (
              <View style={{ gap: 20 }}>
                <View style={{ gap: 8 }}>
                  <Texte variante="corps" poids="medium" style={{ paddingBottom: 4 }}>
                    Email
                  </Texte>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="toi@exemple.com"
                    placeholderTextColor={couleurs.texteFaible}
                    value={email}
                    onChangeText={setEmail}
                    style={champStyle}
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <Texte variante="corps" poids="medium" style={{ paddingBottom: 4 }}>
                    Mot de passe
                  </Texte>
                  <TextInput
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor={couleurs.texteFaible}
                    value={motDePasse}
                    onChangeText={setMotDePasse}
                    onSubmitEditing={seConnecterEmail}
                    style={champStyle}
                  />
                  <Link href="/mot-de-passe-oublie" style={{ alignSelf: "flex-end", marginTop: 8 }}>
                    <Texte variante="petit" poids="semibold" couleur={couleurs.warmGold}>
                      Mot de passe oublié ?
                    </Texte>
                  </Link>
                </View>
                <BoutonDore
                  titre="Se connecter"
                  icone="log-in-outline"
                  chargement={chargement}
                  onPress={seConnecterEmail}
                />
              </View>
            )}
          </View>

          {/* Footer inscription */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Pas encore de compte ?
              </Texte>
              <Link href="/inscription" style={{ marginLeft: 4 }}>
                <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
                  Créer ton profil
                </Texte>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const champStyle = {
  flex: 1,
  minHeight: 56,
  borderRadius: rayons.md,
  borderWidth: 1,
  borderColor: couleurs.bordureForte,
  backgroundColor: couleurs.carte,
  paddingHorizontal: 15,
  color: couleurs.texte,
  fontSize: 16,
  lineHeight: 22,
  fontFamily: police.regular,
  includeFontPadding: false,
} as const;
