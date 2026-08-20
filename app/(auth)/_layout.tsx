import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/session";
import { couleurs } from "@/lib/theme";

export default function LayoutAuth() {
  const { session, pret } = useSession();

  if (!pret) return null;

  // Déjà connecté : direction l'app
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen name="connexion" />
      <Stack.Screen name="inscription" />
      <Stack.Screen name="mot-de-passe-oublie" />
    </Stack>
  );
}
