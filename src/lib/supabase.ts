import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "./database.types";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const CLE_ANONYME = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!URL || !CLE_ANONYME) {
  throw new Error(
    "Variables EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY manquantes dans .env"
  );
}

/** Stockage sécurisé de la session (tokens JWT). */
const stockage = {
  async getItem(cle: string): Promise<string | null> {
    return SecureStore.getItemAsync(cle);
  },
  async setItem(cle: string, valeur: string): Promise<void> {
    await SecureStore.setItemAsync(cle, valeur);
  },
  async removeItem(cle: string): Promise<void> {
    await SecureStore.deleteItemAsync(cle);
  },
};

export const supabase = createClient<Database>(URL, CLE_ANONYME, {
  auth: {
    storage: stockage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Récupère l'id de l'utilisateur connecté (throws si absent). */
export async function utilisateurId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return user.id;
}

export type ReponseJson = {
  success: boolean;
  message: string;
  data: Record<string, unknown> | null;
};

/** Parse l'enveloppe JSON des fonctions métier ; throw sur échec. */
export function reponseRpc(data: unknown): ReponseJson {
  const r = (data ?? {}) as ReponseJson;
  if (!r.success) throw new Error(r.message ?? "Opération impossible.");
  return r;
}
