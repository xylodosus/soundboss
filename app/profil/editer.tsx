import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useMettreAJourProfil, useProfil } from "@/lib/queries/profil";
import { GENRES, INSTRUMENTS, NIVEAUX } from "@/lib/profil-options";
import {
  basculer,
  modificationsProfil,
  validerProfil,
  type SaisieProfil,
} from "@/lib/profil-edition";
import { televerserFichier } from "@/lib/r2";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { AlerteErreur } from "@/components/ui/champ";
import { Squelette } from "@/components/ui/etat-vide";

const MAX_BIO = 500;

export default function EditerProfil() {
  const router = useRouter();
  const { data: profil, isLoading } = useProfil();
  const mettreAJour = useMettreAJourProfil();

  const [saisie, setSaisie] = useState<SaisieProfil | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Le formulaire s'amorce sur le profil chargé, une seule fois : le
  // réamorcer à chaque rendu écraserait la saisie en cours.
  if (profil && !saisie) {
    setSaisie({
      prenom: profil.prenom ?? "",
      nom: profil.nom ?? "",
      ville: profil.ville ?? "",
      pays: profil.pays ?? "",
      telephone: profil.telephone ?? "",
      bio: profil.bio ?? "",
      instruments: profil.instruments ?? [],
      genres: profil.genres_musicaux ?? [],
      niveau: profil.niveau_global ?? null,
    });
  }

  if (isLoading || !saisie) {
    return (
      <Ecran>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Squelette hauteur={120} />
          <Squelette hauteur={200} />
        </ScrollView>
      </Ecran>
    );
  }

  function modifier(champ: keyof SaisieProfil, valeur: SaisieProfil[keyof SaisieProfil]) {
    setSaisie((s) => (s ? { ...s, [champ]: valeur } : s));
  }

  async function choisirPhoto() {
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    setPhoto({
      uri: resultat.assets[0].uri,
      name: resultat.assets[0].fileName ?? "avatar.jpg",
      type: resultat.assets[0].mimeType ?? "image/jpeg",
    });
  }

  async function enregistrer() {
    if (!saisie) return;
    setErreur(null);
    const probleme = validerProfil(saisie);
    if (probleme) {
      setErreur(probleme);
      return;
    }

    const modifications = modificationsProfil(profil ?? {}, saisie);
    if (photo) {
      const { key } = await televerserFichier(photo, "avatars").catch(() => ({ key: "" }));
      if (!key) {
        setErreur("Impossible d'envoyer la photo.");
        return;
      }
      modifications.avatar_url = key;
    }

    // Rien n'a bougé : refermer sans écrire vaut mieux qu'un aller-retour qui
    // réécrirait les mêmes valeurs par-dessus celles d'un autre appareil.
    if (Object.keys(modifications).length === 0) {
      router.back();
      return;
    }

    setEnvoi(true);
    try {
      await mettreAJour.mutateAsync(modifications);
      router.back();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer le profil.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              hitSlop={8}
              style={{ width: 40, height: 40, justifyContent: "center" }}
            >
              <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
            </Pressable>
            <Texte variante="titre3" poids="extrabold">
              Modifier mon profil
            </Texte>
          </View>

          {erreur && <AlerteErreur message={erreur} />}

          {/* Photo : l'aperçu montre le fichier choisi avant même l'envoi. */}
          <Pressable
            onPress={choisirPhoto}
            accessibilityRole="button"
            accessibilityLabel="Changer la photo de profil"
            style={{ alignSelf: "center", marginTop: 20, marginBottom: 8 }}
          >
            <Avatar
              prenom={saisie.prenom}
              nom={saisie.nom}
              url={photo ? photo.uri : profil?.avatar_url}
              taille={96}
            />
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: couleurs.warmGold,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: couleurs.fond,
              }}
            >
              <Ionicons name="camera" size={16} color={couleurs.charcoal} />
            </View>
          </Pressable>

          <Section titre="Identité">
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Champ
                  label="Prénom"
                  valeur={saisie.prenom}
                  surChanger={(v) => modifier("prenom", v)}
                  placeholder="Prénom"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Champ
                  label="Nom"
                  valeur={saisie.nom}
                  surChanger={(v) => modifier("nom", v)}
                  placeholder="Facultatif"
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Champ
                  label="Ville"
                  valeur={saisie.ville}
                  surChanger={(v) => modifier("ville", v)}
                  placeholder="Abidjan"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Champ
                  label="Pays"
                  valeur={saisie.pays}
                  surChanger={(v) => modifier("pays", v)}
                  placeholder="Côte d'Ivoire"
                />
              </View>
            </View>
            <Champ
              label="Téléphone"
              valeur={saisie.telephone}
              surChanger={(v) => modifier("telephone", v)}
              placeholder="+225 ..."
              clavier="phone-pad"
            />
            <Champ
              label="Bio"
              valeur={saisie.bio}
              surChanger={(v) => modifier("bio", v)}
              placeholder="Quelques mots sur toi, ton parcours, ce que tu cherches."
              multiligne
              compteur={`${saisie.bio.trim().length} / ${MAX_BIO}`}
            />
          </Section>

          <Section titre="Instruments" detail="Ce que tu joues">
            <Puces
              options={INSTRUMENTS}
              choisies={saisie.instruments}
              surBasculer={(v) => modifier("instruments", basculer(saisie.instruments, v))}
            />
          </Section>

          <Section titre="Genres musicaux">
            <Puces
              options={GENRES}
              choisies={saisie.genres}
              surBasculer={(v) => modifier("genres", basculer(saisie.genres, v))}
            />
          </Section>

          <Section titre="Niveau">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {NIVEAUX.map((n) => (
                <Puce
                  key={n.valeur}
                  libelle={n.label}
                  actif={saisie.niveau === n.valeur}
                  // Un second appui retire le niveau : rien n'oblige à en
                  // déclarer un.
                  onPress={() => modifier("niveau", saisie.niveau === n.valeur ? null : n.valeur)}
                />
              ))}
            </View>
          </Section>

          <Bouton
            titre={envoi ? "Enregistrement…" : "Enregistrer"}
            chargement={envoi}
            onPress={enregistrer}
            style={{ marginTop: 28 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

function Section({
  titre,
  detail,
  children,
}: {
  titre: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 26, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Texte
          variante="micro"
          poids="bold"
          couleur={couleurs.texteSecondaire}
          style={{ letterSpacing: 1 }}
        >
          {titre.toUpperCase()}
        </Texte>
        {detail && (
          <Texte variante="micro" couleur={couleurs.muted}>
            {detail}
          </Texte>
        )}
      </View>
      {children}
    </View>
  );
}

function Champ({
  label,
  valeur,
  surChanger,
  placeholder,
  multiligne = false,
  clavier,
  compteur,
}: {
  label: string;
  valeur: string;
  surChanger: (v: string) => void;
  placeholder: string;
  multiligne?: boolean;
  clavier?: "phone-pad";
  compteur?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
          {label}
        </Texte>
        {compteur && (
          <Texte variante="micro" couleur={couleurs.muted}>
            {compteur}
          </Texte>
        )}
      </View>
      <TextInput
        value={valeur}
        onChangeText={surChanger}
        placeholder={placeholder}
        placeholderTextColor={couleurs.texteFaible}
        multiline={multiligne}
        keyboardType={clavier}
        accessibilityLabel={label}
        style={{
          backgroundColor: couleurs.surfaceCarte,
          borderRadius: rayons.md,
          borderWidth: 1,
          borderColor: couleurs.bordure,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: multiligne ? 96 : 48,
          textAlignVertical: multiligne ? "top" : "center",
          color: couleurs.texte,
          fontFamily: police.regular,
          fontSize: 15,
        }}
      />
    </View>
  );
}

function Puces({
  options,
  choisies,
  surBasculer,
}: {
  options: readonly string[];
  choisies: string[];
  surBasculer: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Puce
          key={o}
          libelle={o}
          actif={choisies.includes(o)}
          onPress={() => surBasculer(o)}
        />
      ))}
    </View>
  );
}

function Puce({
  libelle,
  actif,
  onPress,
}: {
  libelle: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={libelle}
      style={{
        minHeight: 40,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: rayons.pill,
        borderWidth: 1,
        borderColor: actif ? couleurs.warmGold : couleurs.bordure,
        backgroundColor: actif ? couleurs.warmGold15 : couleurs.surfaceCarte,
      }}
    >
      <Texte
        variante="petit"
        poids={actif ? "bold" : "medium"}
        couleur={actif ? couleurs.warmGold : couleurs.texte}
      >
        {libelle}
      </Texte>
    </Pressable>
  );
}
