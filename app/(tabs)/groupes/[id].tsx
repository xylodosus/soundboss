import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGroupe } from "@/lib/queries/groupes";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { VisuelGroupe } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { libelleTypeGroupe } from "@/lib/format";
import { OngletMembres } from "@/components/groupe/onglet-membres";
import { OngletPupitres } from "@/components/groupe/onglet-pupitres";
import { OngletProjets } from "@/components/projet/onglet-projets";
import { OngletSeances } from "@/components/groupe/onglet-seances";
import { OngletFichiers } from "@/components/groupe/onglet-fichiers";
import { OngletStockage } from "@/components/groupe/onglet-stockage";

const ONGLETS = [
  { id: "projets", label: "Projets", icone: "albums-outline" as const },
  { id: "seances", label: "Répétitions", icone: "calendar-outline" as const },
  { id: "chat", label: "Discussion", icone: "chatbubble-ellipses-outline" as const },
  { id: "fichiers", label: "Fichiers", icone: "folder-open-outline" as const },
  { id: "pupitres", label: "Pupitres", icone: "musical-notes-outline" as const },
  { id: "membres", label: "Membres", icone: "people-outline" as const },
  { id: "stockage", label: "Stockage", icone: "pie-chart-outline" as const },
];

export default function DetailGroupe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: groupe, isLoading } = useGroupe(id);
  const [photoAgrandie, setPhotoAgrandie] = useState(false);
  const [onglet, setOnglet] = useState("projets");

  if (isLoading || !groupe) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <SqueletteListe lignes={3} hauteur={180} />
        </View>
      </Ecran>
    );
  }

  const estGestionnaire = groupe.monRole === "chef" || groupe.monRole === "admin";
  const estChef = groupe.monRole === "chef";

  const libelleRole =
    groupe.monRole === "chef"
      ? "Chef du groupe"
      : groupe.monRole === "admin"
        ? "Administrateur"
        : groupe.monRole === "invite"
          ? "Visiteur"
          : "Membre";

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Bandeau */}
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.surfaceCarte }}
            >
              <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: rayons.pill,
                backgroundColor:
                  groupe.monRole === "chef"
                    ? "rgba(251,191,36,0.14)"
                    : groupe.monRole === "admin"
                      ? "rgba(224,122,86,0.14)"
                      : "rgba(255,255,255,0.06)",
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              {groupe.monRole === "chef" && <Ionicons name="sparkles" size={14} color={couleurs.warmGold} />}
              <Texte variante="micro" poids="bold" couleur={couleurs.texte}>
                {libelleRole}
              </Texte>
            </View>
          </View>

          {/* Identité : photo compacte à gauche, nom et métadonnées à droite.
              La couverture pleine largeur de 170 px coûtait un tiers de l'écran
              pour une information que la vignette porte aussi bien. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 16 }}>
            <Pressable
              onPress={() => setPhotoAgrandie(true)}
              disabled={!groupe.photo_url}
              accessibilityRole="imagebutton"
              accessibilityLabel="Agrandir la photo du groupe"
              hitSlop={8}
            >
              <VisuelGroupe
                url={groupe.photo_url}
                rayonsImg={36}
                style={{ width: 72, height: 72, borderRadius: 36 }}
              />
            </Pressable>

            <View style={{ flex: 1, gap: 6 }}>
              <Texte variante="titre3" poids="extrabold" numberOfLines={2}>
                {groupe.nom}
              </Texte>

              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <View
              style={{
                borderRadius: rayons.pill,
                backgroundColor: "rgba(224,122,86,0.14)",
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight}>
                {libelleTypeGroupe(groupe.type_groupe)}
              </Texte>
            </View>
            {groupe.ville && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={couleurs.muted} />
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {groupe.ville}
                </Texte>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="people-outline" size={13} color={couleurs.muted} />
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {groupe.nombre_membres ?? 0} membre{(groupe.nombre_membres ?? 0) > 1 ? "s" : ""}
              </Texte>
            </View>
              </View>
            </View>

            {estChef && (
              <Pressable
                onPress={() => router.push(`/groupes/${id}/editer`)}
                accessibilityRole="button"
                accessibilityLabel="Modifier le groupe"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.carte,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="create-outline" size={18} color={couleurs.texte} />
              </Pressable>
            )}
          </View>

          {groupe.description && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 16, lineHeight: 20 }}>
              {groupe.description}
            </Texte>
          )}
        </View>

        {/* Onglets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
        >
          {ONGLETS.filter((o) => o.id !== "stockage" || estChef).map((o) => {
            const actif = onglet === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setOnglet(o.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: rayons.pill,
                  backgroundColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.06)",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Ionicons
                  name={o.icone}
                  size={15}
                  color={actif ? couleurs.charcoal : couleurs.muted}
                />
                <Texte
                  variante="petit"
                  poids={actif ? "bold" : "medium"}
                  couleur={actif ? couleurs.charcoal : couleurs.texteSecondaire}
                  style={{ fontFamily: actif ? police.bold : police.medium }}
                >
                  {o.label}
                </Texte>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Contenu */}
        <View style={{ padding: 20 }}>
          {onglet === "membres" && <OngletMembres groupeId={id} chefId={groupe.chef_id ?? ""} estGestionnaire={estGestionnaire} groupeNom={groupe.nom} />}
          {onglet === "pupitres" && <OngletPupitres groupeId={id} estGestionnaire={estGestionnaire} />}
          {onglet === "projets" && <OngletProjets groupeId={id} estGestionnaire={estGestionnaire} />}
          {onglet === "seances" && <OngletSeances groupeId={id} estGestionnaire={estGestionnaire} />}
          {onglet === "fichiers" && <OngletFichiers groupeId={id} estGestionnaire={estGestionnaire} photoGroupe={groupe.photo_url} />}
          {onglet === "stockage" && estChef && <OngletStockage groupeId={id} />}
          {onglet === "chat" && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={couleurs.terracottaLight} />
              <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 12, textAlign: "center" }}>
                Discute avec ton groupe en temps réel.
              </Texte>
              <Pressable
                onPress={() => router.push(`/groupes/${id}/chat`)}
                style={{
                  marginTop: 16,
                  borderRadius: rayons.pill,
                  backgroundColor: couleurs.warmGold,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }}
              >
                <Texte poids="bold" couleur={couleurs.charcoal}>
                  Ouvrir le chat
                </Texte>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Agrandissement de la photo. Fond quasi opaque plutôt que translucide :
          la photo est le sujet, pas un calque au-dessus de la page. */}
      <Modal
        visible={photoAgrandie}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoAgrandie(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setPhotoAgrandie(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer la photo"
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.94)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 24,
          }}
        >
          <VisuelGroupe
            url={groupe.photo_url}
            rayonsImg={rayons.lg}
            style={{ width: "100%", aspectRatio: 1, borderRadius: rayons.lg }}
          />
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            Touche l&apos;écran pour fermer
          </Texte>
        </Pressable>
      </Modal>
    </Ecran>
  );
}
