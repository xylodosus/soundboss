import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMettreAJourProfil, useProfil } from "@/lib/queries/profil";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";

const LANGUES = [
  { valeur: "fr", label: "Français" },
  { valeur: "en", label: "English" },
  { valeur: "wo", label: "Wolof" },
  { valeur: "ln", label: "Lingala" },
];

const DEVISES = ["XOF", "GNF", "EUR", "USD", "MAD"];

export default function Parametres() {
  const router = useRouter();
  const { data: profil } = useProfil();
  const mettreAJour = useMettreAJourProfil();

  const [langue, setLangue] = useState(profil?.langue ?? "fr");
  const [devise, setDevise] = useState(profil?.devise_preferee ?? "XOF");
  const [notificationsEmail, setNotificationsEmail] = useState(profil?.notifications_email ?? true);
  const [notificationsPush, setNotificationsPush] = useState(profil?.notifications_push ?? true);
  const [sauvegarde, setSauvegarde] = useState(false);

  async function enregistrer() {
    setSauvegarde(true);
    await mettreAJour.mutateAsync({
      langue,
      devise_preferee: devise as "XOF",
      notifications_email: notificationsEmail,
      notifications_push: notificationsPush,
    });
    setSauvegarde(false);
    router.back();
  }

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="titre3" poids="extrabold">
            Paramètres
          </Texte>
        </View>

        <View style={{ marginTop: 24, gap: 24 }}>
          <Bloc titre="Langue">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LANGUES.map((l) => (
                <Pressable
                  key={l.valeur}
                  onPress={() => setLangue(l.valeur)}
                  style={{
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: langue === l.valeur ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                    backgroundColor: langue === l.valeur ? "rgba(251,191,36,0.14)" : "transparent",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Texte variante="petit" poids={langue === l.valeur ? "bold" : "medium"} couleur={langue === l.valeur ? couleurs.warmGold : couleurs.texte}>
                    {l.label}
                  </Texte>
                </Pressable>
              ))}
            </View>
          </Bloc>

          <Bloc titre="Devise">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DEVISES.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDevise(d as "XOF")}
                  style={{
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: devise === d ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                    backgroundColor: devise === d ? "rgba(251,191,36,0.14)" : "transparent",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Texte variante="petit" poids={devise === d ? "bold" : "medium"} couleur={devise === d ? couleurs.warmGold : couleurs.texte}>
                    {d}
                  </Texte>
                </Pressable>
              ))}
            </View>
          </Bloc>

          <Bloc titre="Notifications">
            <Toggle label="Notifications email" valeur={notificationsEmail} onChange={setNotificationsEmail} />
            <Toggle label="Notifications push" valeur={notificationsPush} onChange={setNotificationsPush} />
          </Bloc>
        </View>

        <Bouton
          titre={sauvegarde ? "Enregistrement…" : "Enregistrer"}
          taille="lg"
          chargement={sauvegarde}
          onPress={enregistrer}
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </Ecran>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View>
      <Texte variante="petit" poids="bold" couleur={couleurs.texteSecondaire} style={{ marginBottom: 10 }}>
        {titre.toUpperCase()}
      </Texte>
      {children}
    </View>
  );
}

function Toggle({
  label,
  valeur,
  onChange,
}: {
  label: string;
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
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <Texte variante="petit" poids="semibold">
        {label}
      </Texte>
      <View
        style={{
          width: 46,
          height: 26,
          borderRadius: 13,
          backgroundColor: valeur ? couleurs.warmGold : "rgba(255,255,255,0.15)",
          alignItems: valeur ? "flex-end" : "flex-start",
          padding: 3,
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: couleurs.cream }} />
      </View>
    </Pressable>
  );
}
