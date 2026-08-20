import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { isDevice, modelName } from "expo-device";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { useSession } from "./session";

// Affichage des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Canal Android « default » (utilisé par l'edge function send-push). */
async function preparerCanalAndroid() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Notifications",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FBBF24",
  });
}

/** Demande la permission et retourne l'Expo Push Token (ou null). */
export async function obtenirTokenPush(): Promise<string | null> {
  if (!isDevice) return null;
  const existant = await Notifications.getPermissionsAsync();
  let statut = existant.status;
  if (statut !== "granted") {
    statut = (await Notifications.requestPermissionsAsync()).status;
  }
  if (statut !== "granted") return null;

  await preparerCanalAndroid();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** Redirige vers l'écran cible d'une notification (données `url`). */
function naviguerVersNotification(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url as string | undefined;
  if (url && typeof url === "string" && url.startsWith("/")) {
    router.push(url as never);
  }
}

/**
 * Fournisseur de push : enregistre l'appareil (device_token) à la connexion
 * et gère la navigation depuis une notification (au premier plan ou au tap).
 */
export function FournisseurPush({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let actif = true;
    (async () => {
      const token = await obtenirTokenPush();
      if (!actif || !token) return;
      const { error } = await supabase.from("device_token").upsert(
        {
          user_id: userId,
          expo_token: token,
          platform: Platform.OS,
          device_label: modelName ?? null,
          app_version: Constants.expoConfig?.version ?? null,
          last_seen_at: new Date().toISOString(),
          est_actif: true,
        },
        { onConflict: "user_id,expo_token" }
      );
      if (error) {
        console.warn("[push] enregistrement du token échoué", error.message);
      }
    })();
    return () => {
      actif = false;
    };
  }, [session?.user?.id]);

  // Tap sur une notification (app ouverte ou en arrière-plan)
  useEffect(() => {
    const souscription = Notifications.addNotificationResponseReceivedListener((reponse) => {
      naviguerVersNotification(reponse.notification);
    });

    // Lancement à froid depuis une notification
    Notifications.getLastNotificationResponseAsync().then((reponse) => {
      if (reponse) naviguerVersNotification(reponse.notification);
    });

    return () => souscription.remove();
  }, []);

  return <>{children}</>;
}
