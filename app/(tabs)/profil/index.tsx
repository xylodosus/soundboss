import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfil } from "@/lib/queries/profil";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Squelette } from "@/components/ui/etat-vide";

export default function Profil() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profil, isLoading } = useProfil();

  async function deconnexion() {
    // Vide le store et le cache (profil, groupes, messages, etc.) pour
    // éviter toute fuite de données entre deux comptes sur le même appareil.
    queryClient.clear();
    await supabase.auth.signOut();
  }

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isLoading ? (
          <Squelette hauteur={160} />
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Avatar
              prenom={profil?.prenom}
              nom={profil?.nom}
              url={profil?.avatar_url}
              taille={88}
            />
            <Texte variante="titre2" poids="extrabold" style={{ marginTop: 14 }}>
              {profil?.prenom} {profil?.nom}
            </Texte>
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {profil?.email}
            </Texte>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {profil?.ville ? (
                <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(224,122,86,0.14)", paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight}>
                    {profil.ville} · {profil.pays}
                  </Texte>
                </View>
              ) : null}
              {(profil?.instruments?.length ?? 0) > 0 && (
                <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(251,191,36,0.1)", paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                    {profil?.instruments?.slice(0, 2).join(", ")}
                  </Texte>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ gap: 10, marginTop: 10 }}>
          <Ligne icone="wallet-outline" label="Wallet (crédits)" onAppui={() => router.push("/wallet")} />
          <Ligne icone="notifications-outline" label="Notifications" onAppui={() => router.push("/profil/notifications")} />
          <Ligne icone="settings-outline" label="Paramètres" onAppui={() => router.push("/profil/parametres")} />
          <Ligne icone="sparkles-outline" label="Mes jobs IA" onAppui={() => router.push("/profil/jobs-ia")} />
          <Ligne icone="calendar-outline" label="Mes réservations de studios" onAppui={() => router.push("/studios/mes-reservations")} />
          <Ligne icone="log-out-outline" label="Se déconnecter" couleur={couleurs.danger} onAppui={deconnexion} />
        </View>

        <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ textAlign: "center", marginTop: 32 }}>
          SoundBoss v0.1.0 · Thème sombre
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

function Ligne({
  icone,
  label,
  onAppui,
  couleur = couleurs.texte,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  onAppui: () => void;
  couleur?: string;
}) {
  return (
    <Pressable
      onPress={onAppui}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 16,
      }}
    >
      <Ionicons name={icone} size={20} color={couleur === couleurs.danger ? couleur : couleurs.warmGold} />
      <Texte variante="corps" poids="semibold" style={{ flex: 1 }} couleur={couleur}>
        {label}
      </Texte>
      <Ionicons name="chevron-forward" size={18} color={couleurs.muted} />
    </Pressable>
  );
}
