import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { couleurs, police } from "@/lib/theme";
import { obtenirProfilComplet, profilEstComplet } from "@/lib/queries/profil";

const ICONES: Record<string, { actif: string; inactif: string }> = {
  index: { actif: "home", inactif: "home-outline" },
  "groupes/index": { actif: "people", inactif: "people-outline" },
  "projets/index": { actif: "albums", inactif: "albums-outline" },
  "profil/index": { actif: "person", inactif: "person-outline" },
};

/** Onglets visibles : Accueil · Groupes · Projets · Profil. */
const ONGLETS = [
  { nom: "index", label: "Accueil" },
  { nom: "groupes/index", label: "Groupes" },
  { nom: "projets/index", label: "Projets" },
  { nom: "profil/index", label: "Profil" },
] as const;

/** Routes du dossier (tabs) à NE PAS afficher dans la barre (masquées). */
const ONGLETS_MASQUES = [
  "groupes/nouveau",
  "groupes/[id]",
] as const;

export default function LayoutTabs() {
  const { session, pret } = useSession();

  // Profil du compte courant (clé scopée par utilisateur : pas de fuite
  // de cache entre deux comptes sur le même appareil).
  const { data: profil } = useQuery({
    queryKey: ["profil-existant", session?.user.id],
    queryFn: obtenirProfilComplet,
    enabled: !!session,
  });

  if (!pret) return null;
  if (!session) return <Redirect href="/connexion" />;
  if (profil === undefined) return null; // chargement
  if (!profilEstComplet(profil)) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.warmGold,
        tabBarInactiveTintColor: couleurs.muted,
        tabBarStyle: {
          backgroundColor: couleurs.charcoalLight,
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 78,
          paddingTop: 8,
          paddingBottom: 22,
        },
        tabBarLabelStyle: {
          fontFamily: police.medium,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {ONGLETS.map(({ nom, label }) => (
        <Tabs.Screen
          key={nom}
          name={nom}
          options={{
            title: label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={
                  focused
                    ? (ICONES[nom].actif as keyof typeof Ionicons.glyphMap)
                    : (ICONES[nom].inactif as keyof typeof Ionicons.glyphMap)
                }
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
      {/* Routes du groupe (tabs) masquées de la barre mais navigables */}
      {ONGLETS_MASQUES.map((nom) => (
        <Tabs.Screen key={nom} name={nom} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
