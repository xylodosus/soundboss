import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreerSeance } from "@/lib/queries/seances";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "./texte";
import { Bouton } from "./bouton";
import { Champ, AlerteErreur } from "./champ";
import {
  ChampDatePicker,
  chaineDepuisDate,
  dateDepuisHeure,
  heureDepuisDate,
} from "./champ-date";

/**
 * Modal de création d'une répétition (chef/admin).
 * Si `projetId` est fourni, la séance créée est directement liée au projet.
 */
export function ModalCreerSeance({
  visible,
  groupeId,
  projetId,
  onFermer,
}: {
  visible: boolean;
  groupeId?: string | null;
  projetId?: string | null;
  onFermer: () => void;
}) {
  const creer = useCreerSeance();
  const dialogue = useDialogue();

  const [titre, setTitre] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [heureDebut, setHeureDebut] = useState(() => dateDepuisHeure("18:00"));
  const [heureFin, setHeureFin] = useState(() => dateDepuisHeure("21:00"));
  const [lieu, setLieu] = useState("");
  const [programme, setProgramme] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitre("");
      setDate(null);
      setHeureDebut(dateDepuisHeure("18:00"));
      setHeureFin(dateDepuisHeure("21:00"));
      setLieu("");
      setProgramme("");
      setErreur(null);
    }
  }, [visible]);

  async function planifier() {
    setErreur(null);
    if (!date) {
      setErreur("Choisis la date de la répétition.");
      return;
    }
    if (!heureDebut || !heureFin || heureDebut >= heureFin) {
      setErreur("L'heure de fin doit être après l'heure de début.");
      return;
    }
    try {
      await creer.mutateAsync({
        groupeId,
        projetId,
        seance: {
          titre: titre.trim() || null,
          date_seance: chaineDepuisDate(date),
          heure_debut: `${heureDepuisDate(heureDebut)}:00`,
          heure_fin: `${heureDepuisDate(heureFin)}:00`,
          lieu: lieu.trim() || null,
          programme: programme.trim() || null,
          presence_obligatoire: true,
        },
      });
      onFermer();
      dialogue.succes(projetId ? "Répétition créée et liée au projet." : "Répétition planifiée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de planifier la répétition.");
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.arrierePlan}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onFermer} />
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={styles.enTete}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              Planifier une répétition
            </Texte>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={styles.boutonFermer}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1 }}
          >
            <View style={{ gap: 12 }}>
              <AlerteErreur message={erreur} />

              <Champ placeholder="Titre (ex : Mise en place)" value={titre} onChangeText={setTitre} />
              <ChampDatePicker
                valeur={date}
                onChange={setDate}
                mode="date"
                placeholder="Date de la répétition *"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ChampDatePicker
                    valeur={heureDebut}
                    onChange={setHeureDebut}
                    mode="time"
                    placeholder="Début"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ChampDatePicker
                    valeur={heureFin}
                    onChange={setHeureFin}
                    mode="time"
                    placeholder="Fin"
                  />
                </View>
              </View>
              <Champ placeholder="Lieu" value={lieu} onChangeText={setLieu} />
              <Champ
                multiline
                placeholder="Programme, objectifs…"
                value={programme}
                onChangeText={setProgramme}
                style={{ minHeight: 72, textAlignVertical: "top" }}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Bouton titre="Planifier" chargement={creer.isPending} onPress={planifier} />
                <Bouton variante="secondaire" titre="Annuler" onPress={onFermer} />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arrierePlan: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  feuille: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
    borderRadius: rayons.lg,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    padding: 20,
  },
  enTete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  boutonFermer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.surfaceCarte,
  },
});
