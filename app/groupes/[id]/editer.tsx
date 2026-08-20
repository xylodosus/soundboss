import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useGroupe, useModifierGroupe } from "@/lib/queries/groupes";
import { televerserFichier, urlLectureR2 } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Etiquette, AlerteErreur } from "@/components/ui/champ";
import { Squelette } from "@/components/ui/etat-vide";

const TYPES_GROUPE = [
  { valeur: "orchestre", label: "Orchestre" },
  { valeur: "choeur", label: "Chœur" },
  { valeur: "band", label: "Band" },
  { valeur: "ensemble", label: "Ensemble" },
  { valeur: "duo", label: "Duo" },
  { valeur: "autre", label: "Autre" },
] as const;

export default function EditerGroupe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: groupe, isLoading } = useGroupe(id);
  const modifier = useModifierGroupe();

  const [nom, setNom] = useState("");
  const [typeGroupe, setTypeGroupe] = useState("orchestre");
  const [genre, setGenre] = useState("");
  const [ville, setVille] = useState("");
  const [description, setDescription] = useState("");
  const [estPrive, setEstPrive] = useState(false);
  const [accepteMembres, setAccepteMembres] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoNouvelle, setPhotoNouvelle] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [apercuExistant, setApercuExistant] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Pré-remplissage
  useEffect(() => {
    if (!groupe) return;
    setNom(groupe.nom);
    setTypeGroupe(groupe.type_groupe);
    setGenre(groupe.genre_musical ?? "");
    setVille(groupe.ville ?? "");
    setDescription(groupe.description ?? "");
    setEstPrive(groupe.est_prive ?? false);
    setAccepteMembres(groupe.accepte_nouveaux_membres ?? true);
    setPhotoUrl(groupe.photo_url ?? null);
    if (groupe.photo_url && !groupe.photo_url.startsWith("http")) {
      urlLectureR2(groupe.photo_url).then(setApercuExistant);
    } else {
      setApercuExistant(groupe.photo_url ?? null);
    }
  }, [groupe]);

  if (isLoading || !groupe) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <Squelette hauteur={140} />
        </View>
      </Ecran>
    );
  }

  if (groupe.monRole !== "chef") {
    return (
      <Ecran>
        <View style={{ padding: 20, alignItems: "center", marginTop: 60 }}>
          <Ionicons name="lock-closed-outline" size={32} color={couleurs.terracottaLight} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 12, textAlign: "center" }}>
            Seul le chef du groupe peut modifier ses informations.
          </Texte>
        </View>
      </Ecran>
    );
  }

  async function choisirPhoto() {
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    setPhotoNouvelle({
      uri: resultat.assets[0].uri,
      name: resultat.assets[0].fileName ?? "photo.jpg",
      type: resultat.assets[0].mimeType ?? "image/jpeg",
    });
  }

  async function enregistrer() {
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom du groupe est requis.");
      return;
    }
    setEnvoi(true);
    try {
      let photoFinale = photoUrl;
      if (photoNouvelle) {
        const resultat = await televerserFichier(photoNouvelle, "groupes");
        photoFinale = resultat.key;
      }
      await modifier.mutateAsync({
        groupeId: id,
        modifications: {
          nom: nom.trim(),
          type_groupe: typeGroupe as "orchestre",
          genre_musical: genre || null,
          ville: ville.trim() || null,
          description: description.trim() || null,
          photo_url: photoFinale,
          est_prive: estPrive,
          accepte_nouveaux_membres: accepteMembres,
        },
      });
      router.back();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de modifier le groupe.");
    } finally {
      setEnvoi(false);
    }
  }

  const apercu = photoNouvelle ? photoNouvelle.uri : apercuExistant;

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="titre3" poids="extrabold">
            Modifier le groupe
          </Texte>
        </View>

        <AlerteErreur message={erreur} />

        {/* Photo */}
        <Pressable
          onPress={choisirPhoto}
          style={{
            marginTop: 20,
            borderRadius: rayons.lg,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(255,255,255,0.18)",
            backgroundColor: couleurs.surfaceCarte,
            padding: 16,
            alignItems: "center",
            gap: 10,
          }}
        >
          {apercu ? (
            <Image source={{ uri: apercu }} style={{ width: "100%", height: 140, borderRadius: 14 }} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={32} color={couleurs.warmGold} />
          )}
          <Texte variante="petit" poids="semibold" couleur={couleurs.warmGold}>
            {photoUrl ? "Changer la photo" : "Ajouter une photo"}
          </Texte>
        </Pressable>

        <View style={{ marginTop: 20, gap: 16 }}>
          <View>
            <Etiquette>Nom du groupe *</Etiquette>
            <Champ value={nom} onChangeText={setNom} />
          </View>

          <View>
            <Etiquette>Type de groupe</Etiquette>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TYPES_GROUPE.map((type) => {
                const actif = typeGroupe === type.valeur;
                return (
                  <View
                    key={type.valeur}
                    onTouchEnd={() => setTypeGroupe(type.valeur)}
                    style={{
                      borderRadius: rayons.pill,
                      borderWidth: 1,
                      borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                      backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Texte variante="petit" poids={actif ? "bold" : "medium"} couleur={actif ? couleurs.warmGold : couleurs.texte}>
                      {type.label}
                    </Texte>
                  </View>
                );
              })}
            </View>
          </View>

          <View>
            <Etiquette>Genre musical</Etiquette>
            <Champ value={genre} onChangeText={setGenre} />
          </View>

          <View>
            <Etiquette>Ville</Etiquette>
            <Champ value={ville} onChangeText={setVille} />
          </View>

          <View>
            <Etiquette>Description</Etiquette>
            <Champ
              multiline
              value={description}
              onChangeText={setDescription}
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
          </View>

          <ToggleD ligne="Groupe privé" valeur={estPrive} onChange={setEstPrive} />
          <ToggleD ligne="Accepte de nouveaux membres" valeur={accepteMembres} onChange={setAccepteMembres} />
        </View>

        <Bouton
          titre={envoi ? "Enregistrement…" : "Enregistrer"}
          taille="lg"
          chargement={envoi || modifier.isPending}
          onPress={enregistrer}
          style={{ marginTop: 24, marginBottom: 40 }}
        />
      </ScrollView>
    </Ecran>
  );
}

function ToggleD({
  ligne,
  valeur,
  onChange,
}: {
  ligne: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!valeur)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: couleurs.charcoal,
        padding: 16,
      }}
    >
      <Texte variante="petit" poids="semibold">
        {ligne}
      </Texte>
      <View
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: valeur ? couleurs.warmGold : "rgba(255,255,255,0.15)",
          alignItems: valeur ? "flex-end" : "flex-start",
          padding: 2,
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: couleurs.cream }} />
      </View>
    </Pressable>
  );
}
