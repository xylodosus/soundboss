import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { FournisseurReseau } from "@/lib/reseau";
import { FournisseurSession } from "@/lib/session";
import { FournisseurAudio } from "@/lib/audio-context";
import { FournisseurDialogue } from "@/lib/dialogue";
import { FournisseurPush } from "@/lib/push";
import { couleurs } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

export default function LayoutRacine() {
  const [policesChargees] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (policesChargees) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [policesChargees]);

  // Fond natif sombre : évite le flash blanc pendant les transitions
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(couleurs.fond).catch(() => {});
  }, []);

  if (!policesChargees) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <FournisseurReseau>
        <FournisseurSession>
          <FournisseurAudio>
            <FournisseurDialogue>
              <FournisseurPush>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: couleurs.fond },
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="wallet" options={{ headerShown: false }} />
                  <Stack.Screen name="studios" options={{ headerShown: false }} />
                  <Stack.Screen name="studios/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="studios/[id]/reserver" options={{ headerShown: false }} />
                  <Stack.Screen name="studios/mes-reservations" options={{ headerShown: false }} />
                  <Stack.Screen name="groupes/[id]/seances/[seanceId]" options={{ headerShown: false }} />
                  <Stack.Screen name="groupes/[id]/chat" options={{ headerShown: false }} />
                  <Stack.Screen name="projets/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="profil/parametres" options={{ headerShown: false }} />
                  <Stack.Screen name="profil/notifications" options={{ headerShown: false }} />
                  <Stack.Screen name="profil/jobs-ia" options={{ headerShown: false }} />
                </Stack>
              </FournisseurPush>
            </FournisseurDialogue>
          </FournisseurAudio>
        </FournisseurSession>
      </FournisseurReseau>
    </QueryClientProvider>
  );
}
