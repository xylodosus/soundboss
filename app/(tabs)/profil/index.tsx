import { Pressable, ScrollView, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNotifications, useProfil, useWallet } from "@/lib/queries/profil";
import { useStockagePersonnel } from "@/lib/queries/stockage";
import { tailleLisible } from "@/lib/format";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Squelette } from "@/components/ui/etat-vide";

export default function Profil() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profil, isLoading } = useProfil();
  const { data: wallet } = useWallet();
  const { data: stockage } = useStockagePersonnel();
  const { data: notifications = [] } = useNotifications();

  const nonLues = notifications.filter((n) => !n.est_lue).length;
  const version = Constants.expoConfig?.version ?? "—";

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
          <Squelette hauteur={92} />
        ) : (
          // Identité à gauche, comme sur la fiche d'un groupe : elle ne change
          // jamais et n'a pas à repousser les actions sous la ligne de flottaison.
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar
              prenom={profil?.prenom}
              nom={profil?.nom}
              url={profil?.avatar_url}
              taille={64}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Texte variante="titre3" poids="extrabold" numberOfLines={1}>
                {profil?.prenom} {profil?.nom}
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                {profil?.email}
              </Texte>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {profil?.ville ? (
                  <Etiquette
                    texte={`${profil.ville} · ${profil.pays}`}
                    couleur={couleurs.terracottaLight}
                    fond="rgba(224,122,86,0.14)"
                  />
                ) : null}
                {(profil?.instruments?.length ?? 0) > 0 && (
                  <Etiquette
                    texte={profil!.instruments!.slice(0, 2).join(", ")}
                    couleur={couleurs.warmGold}
                    fond={couleurs.warmGold10}
                  />
                )}
              </View>
            </View>
          </View>
        )}

        <Groupe titre="Mon compte">
          <Ligne
            icone="notifications-outline"
            label="Notifications"
            valeur={nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? "s" : ""}` : undefined}
            accent={nonLues > 0}
            onAppui={() => router.push("/profil/notifications")}
          />
          <Ligne
            icone="settings-outline"
            label="Paramètres"
            detail="Langue, devise, alertes"
            onAppui={() => router.push("/profil/parametres")}
            dernier
          />
        </Groupe>

        <Groupe titre="Mes ressources">
          <Ligne
            icone="wallet-outline"
            label="Crédits"
            valeur={`${wallet?.solde_credits ?? 0}`}
            accent
            onAppui={() => router.push("/wallet")}
          />
          <Ligne
            icone="cloud-outline"
            label="Stockage"
            valeur={stockage ? tailleLisible(stockage.total) : undefined}
            detail={stockage ? `${stockage.nb} fichier${stockage.nb > 1 ? "s" : ""}` : undefined}
            onAppui={() => router.push("/profil/stockage" as Href)}
            dernier
          />
        </Groupe>

        <Groupe titre="Mon activité">
          <Ligne
            icone="calendar-outline"
            label="Réservations de studios"
            onAppui={() => router.push("/studios/mes-reservations")}
            dernier
          />
        </Groupe>

        {/* Hors des groupes et sans chevron : une action destructive ne doit
            pas se confondre avec une navigation. */}
        <Pressable
          onPress={deconnexion}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 48,
            marginTop: 32,
            borderRadius: rayons.pill,
            borderWidth: 1,
            borderColor: "rgba(224,82,74,0.35)",
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={couleurs.danger} />
          <Texte variante="petit" poids="bold" couleur={couleurs.danger}>
            Se déconnecter
          </Texte>
        </Pressable>

        <Texte
          variante="micro"
          couleur={couleurs.muted}
          style={{ textAlign: "center", marginTop: 24 }}
        >
          SoundBoss {version}
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

function Etiquette({ texte, couleur, fond }: { texte: string; couleur: string; fond: string }) {
  return (
    <View
      style={{
        borderRadius: rayons.pill,
        backgroundColor: fond,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Texte variante="micro" poids="bold" couleur={couleur}>
        {texte}
      </Texte>
    </View>
  );
}

/**
 * Section du menu.
 *
 * Les lignes partagent un seul contour, séparées par un filet, plutôt que
 * d'être sept cartes identiques empilées : c'est l'idiome des écrans de
 * réglages, et il rend le regroupement lisible.
 */
function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Texte
        variante="micro"
        poids="bold"
        couleur={couleurs.texteSecondaire}
        style={{ letterSpacing: 1, marginBottom: 10, marginLeft: 4 }}
      >
        {titre.toUpperCase()}
      </Texte>
      <View
        style={{
          borderRadius: rayons.md,
          borderWidth: 1,
          borderColor: couleurs.bordure,
          backgroundColor: couleurs.surfaceCarte,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Ligne({
  icone,
  label,
  detail,
  valeur,
  accent = false,
  dernier = false,
  onAppui,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Ce que recouvre l'entrée, quand le libellé seul reste vague. */
  detail?: string;
  /** Le chiffre que l'entrée cache. Une étiquette seule n'apprend rien. */
  valeur?: string;
  accent?: boolean;
  dernier?: boolean;
  onAppui: () => void;
}) {
  return (
    <Pressable
      onPress={onAppui}
      accessibilityRole="button"
      accessibilityLabel={valeur ? `${label}, ${valeur}` : label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 60,
        paddingHorizontal: 14,
        borderBottomWidth: dernier ? 0 : 1,
        borderBottomColor: couleurs.bordure,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: couleurs.warmGold10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icone} size={18} color={couleurs.warmGold} />
      </View>

      <View style={{ flex: 1 }}>
        <Texte variante="petit" poids="semibold">
          {label}
        </Texte>
        {detail && (
          <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
            {detail}
          </Texte>
        )}
      </View>

      {valeur && (
        <Texte
          variante="petit"
          poids="bold"
          couleur={accent ? couleurs.warmGold : couleurs.texteSecondaire}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {valeur}
        </Texte>
      )}
      <Ionicons name="chevron-forward" size={16} color={couleurs.muted} />
    </Pressable>
  );
}
