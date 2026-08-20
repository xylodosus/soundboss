import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMarquerNotifications, useNotifications } from "@/lib/queries/profil";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { formatDateHeure } from "@/lib/format";

export default function Notifications() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const marquer = useMarquerNotifications();

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
            Notifications
          </Texte>
          <Pressable onPress={() => marquer.mutate({ tout: true })}>
            <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
              Tout lire
            </Texte>
          </Pressable>
        </View>

        <View style={{ gap: 8, marginTop: 20 }}>
          {isLoading ? (
            <>
              <SqueletteListe lignes={2} hauteur={70} />
            </>
          ) : notifications.length === 0 ? (
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ textAlign: "center", marginTop: 40 }}>
              Aucune notification.
            </Texte>
          ) : (
            notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  marquer.mutate({ ids: [notification.id] });
                  if (notification.lien_url) {
                    router.push(notification.lien_url as never);
                  }
                }}
                style={{
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: notification.est_lue ? couleurs.bordure : "rgba(251,191,36,0.25)",
                  backgroundColor: notification.est_lue ? couleurs.surfaceCarte : "rgba(251,191,36,0.06)",
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Texte variante="petit" poids="semibold" style={{ flex: 1 }} couleur={notification.est_lue ? couleurs.texte : couleurs.cream}>
                    {notification.titre}
                  </Texte>
                  {!notification.est_lue && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: couleurs.warmGold }} />
                  )}
                </View>
                {notification.contenu && (
                  <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ marginTop: 4 }}>
                    {notification.contenu}
                  </Texte>
                )}
                <Texte variante="micro" couleur={couleurs.texteFaible} style={{ marginTop: 6 }}>
                  {formatDateHeure(notification.created_at)}
                </Texte>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Ecran>
  );
}
