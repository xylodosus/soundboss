import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useCreerGroupe } from "@/lib/queries/groupes";
import { televerserFichier } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ErreurChamp, Etiquette, AlerteErreur } from "@/components/ui/champ";
import { Texte } from "@/components/ui/texte";

const TYPES_GROUPE = [
  { valeur: "orchestre", label: "Orchestre" },
  { valeur: "choeur", label: "Chœur" },
  { valeur: "band", label: "Band" },
  { valeur: "ensemble", label: "Ensemble" },
  { valeur: "duo", label: "Duo" },
  { valeur: "autre", label: "Autre" },
] as const;

export default function NouveauGroupe() {
  const router = useRouter();
  const creer = useCreerGroupe();

  const [nom, setNom] = useState("");
  const [typeGroupe, setTypeGroupe] = useState("orchestre");
  const [genre, setGenre] = useState("");
  const [ville, setVille] = useState("");
  const [description, setDescription] = useState("");
  const [estPrive, setEstPrive] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreurs, setErreurs] = useState<{ [k: string]: string | null }>({});
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisirPhoto() {
    setErreur(null);
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    setPhoto({
      uri: resultat.assets[0].uri,
      name: resultat.assets[0].fileName ?? "photo.jpg",
      type: resultat.assets[0].mimeType ?? "image/jpeg",
    });
  }

  async function soumettre() {
    setErreur(null);
    setErreurs({});
    if (!nom.trim()) {
      setErreurs({ nom: "Donne un nom à ton groupe." });
      return;
    }

    setUploadEnCours(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const resultat = await televerserFichier(photo, "groupes");
        photoUrl = resultat.key;
      }

      const id = await creer.mutateAsync({
        nom: nom.trim(),
        type_groupe: typeGroupe as "orchestre",
        genre_musical: genre || null,
        ville: ville.trim() || null,
        description: description.trim() || null,
        photo_url: photoUrl,
        est_prive: estPrive,
      });
      router.replace(`/groupes/${id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de créer le groupe.");
    } finally {
      setUploadEnCours(false);
    }
  }

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Bouton variante="fantome" onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Bouton>
          <Texte variante="titre3" poids="extrabold">
            Nouveau groupe
          </Texte>
        </View>

        <AlerteErreur message={erreur} />

        {/* Photo */}
        <View style={{ marginTop: 20 }}>
          <Pressable
            onPress={choisirPhoto}
            style={{
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
            {photo ? (
              <Image
                source={{ uri: photo.uri }}
                style={{ width: "100%", height: 140, borderRadius: 14 }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={32} color={couleurs.warmGold} />
            )}
            <Texte variante="petit" poids="semibold" couleur={couleurs.warmGold}>
              {photo ? "Changer la photo" : "Ajouter une photo"}
            </Texte>
          </Pressable>
        </View>

        <View style={{ marginTop: 20, gap: 16 }}>
          <View>
            <Etiquette>Nom du groupe *</Etiquette>
            <Champ placeholder="ex : Mekano Afrique" value={nom} onChangeText={setNom} erreur={!!erreurs.nom} />
            <ErreurChamp message={erreurs.nom} />
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
                    <Texte
                      variante="petit"
                      poids={actif ? "bold" : "medium"}
                      couleur={actif ? couleurs.warmGold : couleurs.texte}
                    >
                      {type.label}
                    </Texte>
                  </View>
                );
              })}
            </View>
          </View>

          <View>
            <Etiquette>Genre musical</Etiquette>
            <Champ placeholder="ex : Gospel" value={genre} onChangeText={setGenre} />
          </View>

          <View>
            <Etiquette>Ville</Etiquette>
            <Champ placeholder="ex : Abidjan" value={ville} onChangeText={setVille} />
          </View>

          <View>
            <Etiquette>Description</Etiquette>
            <Champ
              multiline
              placeholder="Présente ton groupe…"
              value={description}
              onChangeText={setDescription}
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
          </View>

          {/* Visibilité */}
          <Pressable
            onPress={() => setEstPrive((v) => !v)}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={18} color={couleurs.terracottaLight} />
              <Texte variante="petit" poids="semibold">
                Groupe privé
              </Texte>
            </View>
            <View
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: estPrive ? couleurs.warmGold : "rgba(255,255,255,0.15)",
                alignItems: estPrive ? "flex-end" : "flex-start",
                padding: 2,
              }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: couleurs.cream }} />
            </View>
          </Pressable>
        </View>

        <Bouton
          titre={uploadEnCours ? "Création…" : "Créer le groupe"}
          taille="lg"
          chargement={uploadEnCours || creer.isPending}
          onPress={soumettre}
          style={{ marginTop: 24, marginBottom: 40 }}
        />
      </ScrollView>
    </Ecran>
  );
}
