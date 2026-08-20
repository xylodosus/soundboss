import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { erreurFrancaise } from "@/lib/erreurs";
import { couleurs } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Logo } from "@/components/ui/logo";
import { BoutonDore } from "@/components/ui/bouton-dore";
import { Champ, ErreurChamp, Etiquette, AlerteErreur } from "@/components/ui/champ";

const INDICATIF = "+225";

/**
 * Inscription — cohérente avec la connexion (même structure, un champ par
 * ligne). Prénom / Nom / Email / Téléphone / Mot de passe. Le choix du pays,
 * les préférences et le profil musical se font dans l'onboarding après la
 * création du compte.
 */
export default function Inscription() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteCree, setCompteCree] = useState(false);
  const [erreursChamp, setErreursChamp] = useState<{ [k: string]: string | null }>({});

  async function creerCompte() {
    setErreur(null);
    setErreursChamp({});

    const nouvelles: { [k: string]: string | null } = {};
    if (!prenom.trim()) nouvelles.prenom = "Ton prénom est requis.";
    if (!email.trim()) nouvelles.email = "Ton email est requis.";
    if (motDePasse.length < 6) nouvelles.motDePasse = "6 caractères minimum.";
    setErreursChamp(nouvelles);
    if (Object.keys(nouvelles).length > 0) return;

    setChargement(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: motDePasse,
      options: {
        data: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.replace(/[\s.-]/g, ""),
        },
      },
    });
    setChargement(false);

    if (error) {
      setErreur(erreurFrancaise(error.message));
      return;
    }

    // Confirmation email requise ?
    if (!data.session) {
      setCompteCree(true);
      return;
    }

    // Session directe : l'onboarding complète le profil
    router.replace("/onboarding");
  }

  if (compteCree) {
    return (
      <Ecran>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: couleurs.warmGold,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="mail" size={36} color={couleurs.charcoal} />
          </View>
          <Texte variante="titre2" poids="extrabold" style={{ marginTop: 20, textAlign: "center" }}>
            Vérifie ta boîte mail 📩
          </Texte>
          <Texte
            variante="petit"
            couleur={couleurs.texteSecondaire}
            style={{ marginTop: 8, textAlign: "center", lineHeight: 20 }}
          >
            Un email de confirmation vient de t&apos;être envoyé à {email}. Confirme ton compte
            puis connecte-toi.
          </Texte>
          <Link href="/connexion" style={{ marginTop: 24 }}>
            <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
              Aller à la connexion →
            </Texte>
          </Link>
        </View>
      </Ecran>
    );
  }

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

          {/* Logo + titre */}
          <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
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
            <Texte
              variante="titre1"
              poids="extrabold"
              style={{ marginTop: 16, textAlign: "center", paddingHorizontal: 24 }}
            >
              Crée ton profil
            </Texte>
            <Texte
              variante="petit"
              couleur={couleurs.texteSecondaire}
              style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 }}
            >
              Rejoins la plus grande communauté de musiciens en Afrique
            </Texte>
          </View>

          {/* Formulaire — un champ par ligne */}
          <View style={{ paddingHorizontal: 16, gap: 20 }}>
            <AlerteErreur message={erreur} />

            <View style={{ gap: 8 }}>
              <Etiquette>Prénom</Etiquette>
              <Champ
                placeholder="Prénom"
                value={prenom}
                onChangeText={setPrenom}
                erreur={!!erreursChamp.prenom}
              />
              <ErreurChamp message={erreursChamp.prenom} />
            </View>

            <View style={{ gap: 8 }}>
              <Etiquette>Nom</Etiquette>
              <Champ placeholder="Nom" value={nom} onChangeText={setNom} />
            </View>

            <View style={{ gap: 8 }}>
              <Etiquette>Email</Etiquette>
              <View style={{ position: "relative" }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 0,
                    bottom: 0,
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={couleurs.texteSecondaire} />
                </View>
                <Champ
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="adresse@email.com"
                  value={email}
                  onChangeText={setEmail}
                  erreur={!!erreursChamp.email}
                  style={{ paddingLeft: 44 }}
                />
              </View>
              <ErreurChamp message={erreursChamp.email} />
            </View>

            <View style={{ gap: 8 }}>
              <Etiquette>Numéro de téléphone</Etiquette>
              <View style={{ flexDirection: "row", gap: 0, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
                <View
                  style={{
                    width: 80,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRightWidth: 1,
                    borderRightColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <Texte variante="corps" poids="medium">
                    {INDICATIF}
                  </Texte>
                </View>
                <Champ
                  keyboardType="phone-pad"
                  placeholder="07 07 12 34 56"
                  value={telephone}
                  onChangeText={setTelephone}
                  style={{ flex: 1, borderWidth: 0, borderRadius: 0 }}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Etiquette>Mot de passe</Etiquette>
              <Champ
                secureTextEntry
                placeholder="6 caractères minimum"
                value={motDePasse}
                onChangeText={setMotDePasse}
                erreur={!!erreursChamp.motDePasse}
              />
              <ErreurChamp message={erreursChamp.motDePasse} />
            </View>

            <BoutonDore
              titre="Créer mon compte"
              icone="person-add-outline"
              chargement={chargement}
              onPress={creerCompte}
            />

            {/* Footer */}
            <View style={{ alignItems: "center", gap: 8, paddingTop: 16, paddingBottom: 32 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  Déjà un compte ?
                </Texte>
                <Link href="/connexion" style={{ marginLeft: 4 }}>
                  <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
                    Se connecter
                  </Texte>
                </Link>
              </View>
              <Texte
                variante="micro"
                couleur={couleurs.texteFaible}
                style={{ textAlign: "center", maxWidth: 300, lineHeight: 16 }}
              >
                En créant un compte, tu acceptes nos Conditions d&apos;utilisation et notre
                Politique de confidentialité.
              </Texte>
              <Logo taille={20} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
