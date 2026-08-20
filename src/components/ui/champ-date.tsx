import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";

/** « 2026-08-16 » → Date locale (pas de décalage UTC). */
export function dateDepuisChaine(valeur: string | null | undefined): Date | null {
  if (!valeur) return null;
  const [a, m, j] = valeur.split("-").map(Number);
  if (!a || !m || !j) return null;
  return new Date(a, m - 1, j);
}

/** Date locale → « 2026-08-16 ». */
export function chaineDepuisDate(date: Date): string {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

/** « 18:00 » → Date (aujourd'hui + heure). */
export function dateDepuisHeure(valeur: string | null | undefined): Date | null {
  if (!valeur) return null;
  const [h, m] = valeur.split(":").map(Number);
  if (h == null || m == null) return null;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

/** Date → « 18:00 ». */
export function heureDepuisDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Champ date/heure avec picker natif (iOS spinner, Android dialogue),
 * aux couleurs du design (fond charcoal, accent warmGold, thème sombre).
 */
export function ChampDatePicker({
  valeur,
  onChange,
  mode = "date",
  placeholder,
}: {
  valeur: Date | null;
  onChange: (date: Date) => void;
  mode?: "date" | "time";
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [provisoire, setProvisoire] = useState<Date | null>(null);

  const texte =
    mode === "time"
      ? valeur
        ? heureDepuisDate(valeur)
        : (placeholder ?? "Heure (HH:MM)")
      : valeur
        ? valeur.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
        : (placeholder ?? "Date (AAAA-MM-JJ)");

  function ouvrir() {
    setProvisoire(valeur);
    setVisible(true);
  }

  function surChangement(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setVisible(false);
      if (event.type === "set" && date) onChange(date);
      return;
    }
    if (event.type === "set" && date) setProvisoire(date);
  }

  function confirmer() {
    setVisible(false);
    if (provisoire) onChange(provisoire);
  }

  return (
    <View>
      <Pressable
        onPress={ouvrir}
        accessibilityRole="button"
        style={{
          minHeight: 52,
          borderRadius: rayons.md,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          backgroundColor: couleurs.charcoal,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Texte
          variante="corps"
          poids={valeur ? "medium" : "regular"}
          couleur={valeur ? couleurs.texte : couleurs.texteFaible}
        >
          {texte}
        </Texte>
        <Ionicons
          name={mode === "time" ? "time-outline" : "calendar-outline"}
          size={18}
          color={couleurs.warmGold}
        />
      </Pressable>

      {visible && (
        <View
          style={{
            marginTop: 8,
            borderRadius: rayons.md,
            borderWidth: 1,
            borderColor: couleurs.bordureForte,
            backgroundColor: couleurs.carte,
            padding: 12,
            gap: 10,
          }}
        >
          <DateTimePicker
            value={provisoire ?? valeur ?? new Date()}
            mode={mode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant="dark"
            accentColor={couleurs.warmGold}
            textColor={couleurs.texte}
            onChange={surChangement}
            locale="fr-FR"
          />
          {Platform.OS === "ios" && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: rayons.pill,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Texte poids="bold">Annuler</Texte>
              </Pressable>
              <Pressable
                onPress={confirmer}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: rayons.pill,
                  backgroundColor: couleurs.warmGold,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Texte poids="bold" couleur={couleurs.charcoal}>
                  OK
                </Texte>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
