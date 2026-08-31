import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEcoutesEnregistrement } from "@/lib/queries/seances";
import { nomAuteur } from "@/lib/chat-affichage";
import { couleurs, espacement, rayons } from "@/lib/theme";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";

/**
 * Détail des écoutes d'un audio, réservé au chef et aux admins.
 *
 * En modale plutôt qu'en liste dépliée dans la carte : une répétition peut
 * compter vingt membres, et déplier vingt noms sous chaque audio rendait la
 * section illisible.
 */
export function ModalEcoutes({
  enregistrementId,
  titreAudio,
  visible,
  onFermer,
}: {
  enregistrementId: string | null;
  titreAudio?: string | null;
  visible: boolean;
  onFermer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data: ecoutes = [], isLoading } = useEcoutesEnregistrement(
    enregistrementId ?? "",
    visible && !!enregistrementId
  );

  const total = ecoutes.reduce((somme, e) => somme + (e.nombre_ecoutes ?? 0), 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onFermer} accessibilityLabel="Fermer" />

        <View
          style={{
            maxHeight: "75%",
            backgroundColor: couleurs.carte,
            borderTopLeftRadius: rayons.xl,
            borderTopRightRadius: rayons.xl,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: couleurs.bordure,
            paddingHorizontal: espacement.xl,
            paddingTop: espacement.md,
            paddingBottom: Math.max(insets.bottom, espacement.lg),
          }}
        >
          <View
            style={{
              width: 48,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignSelf: "center",
              marginBottom: espacement.lg,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacement.md }}>
            <View style={{ flex: 1 }}>
              <Texte variante="titre3" poids="extrabold" numberOfLines={1}>
                Écoutes
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                {titreAudio ?? "Audio de la répétition"}
              </Texte>
            </View>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel="Fermer le détail des écoutes"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: couleurs.surfaceCarte,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          {!isLoading && ecoutes.length > 0 && (
            <Texte
              variante="micro"
              poids="bold"
              couleur={couleurs.warmGold}
              style={{ marginTop: espacement.sm }}
            >
              {ecoutes.length} auditeur{ecoutes.length > 1 ? "s" : ""} · {total} écoute
              {total > 1 ? "s" : ""}
            </Texte>
          )}

          <ScrollView
            style={{ marginTop: espacement.lg }}
            contentContainerStyle={{ gap: espacement.sm, paddingBottom: espacement.lg }}
          >
            {isLoading ? (
              <SqueletteListe />
            ) : ecoutes.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Personne n&apos;a encore écouté cet audio.
              </Texte>
            ) : (
              ecoutes.map((ecoute) => (
                <View
                  key={ecoute.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: espacement.md,
                    borderRadius: rayons.md,
                    backgroundColor: couleurs.surfaceCarte,
                    paddingHorizontal: espacement.md,
                    paddingVertical: espacement.md,
                  }}
                >
                  <Avatar
                    prenom={ecoute.auditeur?.prenom}
                    nom={ecoute.auditeur?.nom}
                    url={ecoute.auditeur?.avatar_url}
                    taille={36}
                  />
                  <Texte variante="petit" poids="semibold" numberOfLines={1} style={{ flex: 1 }}>
                    {nomAuteur(ecoute.auditeur)}
                  </Texte>
                  <View
                    style={{
                      paddingHorizontal: espacement.md,
                      paddingVertical: 4,
                      borderRadius: rayons.pill,
                      backgroundColor: couleurs.warmGold10,
                    }}
                  >
                    <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                      {ecoute.nombre_ecoutes} écoute{ecoute.nombre_ecoutes > 1 ? "s" : ""}
                    </Texte>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
