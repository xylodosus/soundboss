import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSeancesGroupe } from "@/lib/queries/seances";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { Bouton } from "@/components/ui/bouton";
import { ModalCreerSeance } from "@/components/ui/modal-creer-seance";
import { formatDateCourte, libelleStatutSeance } from "@/lib/format";

const STATUTS: Record<string, { fond: string; texte: string }> = {
  planifiee: { fond: "rgba(251,191,36,0.14)", texte: couleurs.warmGold },
  en_cours: { fond: "rgba(52,211,153,0.14)", texte: "#34D399" },
  terminee: { fond: "rgba(255,255,255,0.06)", texte: couleurs.muted },
  annulee: { fond: "rgba(224,82,74,0.14)", texte: couleurs.danger },
};

export function OngletSeances({
  groupeId,
  estGestionnaire,
}: {
  groupeId: string;
  estGestionnaire: boolean;
}) {
  const router = useRouter();
  const { data: seances = [], isLoading } = useSeancesGroupe(groupeId);

  const [modeCreation, setModeCreation] = useState(false);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const aVenir = seances.filter((s) => s.date_seance >= aujourdhui).sort((a, b) => a.date_seance.localeCompare(b.date_seance));
  const historique = seances.filter((s) => s.date_seance < aujourdhui);

  return (
    <View style={{ gap: 14 }}>
      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {estGestionnaire && (
          <Bouton titre="Planifier" onPress={() => setModeCreation(true)} style={{ flex: 1 }}>
            <Ionicons name="add" size={18} color={couleurs.charcoal} />
          </Bouton>
        )}
        <Bouton
          variante="secondaire"
          onPress={() => router.push(`/groupes/${groupeId}/assiduite`)}
          style={{ flex: 1 }}
        >
          <Ionicons name="stats-chart-outline" size={18} color={couleurs.cream} />
          <Texte poids="bold" variante="corps" couleur={couleurs.cream}>
            Assiduité
          </Texte>
        </Bouton>
      </View>

      {/* Liste */}
      {isLoading ? (
        <>
          <SqueletteListe lignes={2} hauteur={70} />
        </>
      ) : seances.length === 0 ? (
        <EtatVide
          icone="calendar-outline"
          titre="Aucune répétition"
          message={
            estGestionnaire
              ? "Planifie une séance pour donner un rendez-vous au groupe."
              : "Le chef de groupe n'a pas encore planifié de répétition."
          }
        />
      ) : (
        <>
          {aVenir.map((seance) => (
            <LigneSeance key={seance.id} titre={seance.titre ?? "Répétition"} date={seance.date_seance} heure={seance.heure_debut.slice(0, 5)} statut={seance.statut ?? "planifiee"} lieu={seance.lieu} onAppui={() => router.push(`/groupes/${groupeId}/seances/${seance.id}`)} />
          ))}
          {historique.length > 0 && (
            <>
              <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ marginTop: 8 }}>
                HISTORIQUE
              </Texte>
              {historique.map((seance) => (
                <LigneSeance key={seance.id} titre={seance.titre ?? "Répétition"} date={seance.date_seance} heure={seance.heure_debut.slice(0, 5)} statut={seance.statut ?? "planifiee"} lieu={seance.lieu} onAppui={() => router.push(`/groupes/${groupeId}/seances/${seance.id}`)} />
              ))}
            </>
          )}
        </>
      )}

      <ModalCreerSeance
        visible={modeCreation && estGestionnaire}
        groupeId={groupeId}
        onFermer={() => setModeCreation(false)}
      />
    </View>
  );
}

function LigneSeance({
  titre,
  date,
  heure,
  statut,
  lieu,
  onAppui,
}: {
  titre: string;
  date: string;
  heure: string;
  statut: string;
  lieu: string | null;
  onAppui: () => void;
}) {
  const classe = STATUTS[statut] ?? STATUTS.planifiee;
  return (
    <Pressable
      onPress={onAppui}
      style={{
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: "rgba(224,122,86,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="calendar" size={20} color={couleurs.terracottaLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Texte poids="semibold" variante="petit">
          {titre}
        </Texte>
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          {formatDateCourte(date)} · {heure}
          {lieu ? ` · ${lieu}` : ""}
        </Texte>
      </View>
      <View style={{ borderRadius: rayons.pill, backgroundColor: classe.fond, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Texte variante="micro" poids="bold" couleur={classe.texte}>
          {libelleStatutSeance(statut)}
        </Texte>
      </View>
    </Pressable>
  );
}
