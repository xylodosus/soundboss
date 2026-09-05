import { Pressable, ScrollView, View } from "react-native";
import { EtatVide } from "@/components/ui/etat-vide";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAnnulerReservation, useMesReservations } from "@/lib/queries/studios";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { formatDateHeure } from "@/lib/format";

const STATUTS: Record<string, { label: string; couleur: string }> = {
  pending: { label: "En attente", couleur: couleurs.warmGold },
  confirmed: { label: "Confirmée", couleur: "#34D399" },
  in_progress: { label: "En cours", couleur: "#34D399" },
  completed: { label: "Terminée", couleur: couleurs.muted },
  cancelled: { label: "Annulée", couleur: couleurs.danger },
};

export default function MesReservations() {
  const router = useRouter();
  const { data: reservations = [], isLoading } = useMesReservations();
  const annuler = useAnnulerReservation();

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="titre3" poids="extrabold">
            Mes réservations
          </Texte>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          {!isLoading && reservations.length === 0 && (
            <EtatVide
              icone="calendar-clear-outline"
              titre="Aucune réservation"
              message="Réserve un studio depuis l'onglet Studios ; tes créneaux apparaîtront ici."
            />
          )}
          {reservations.map((reservation) => {
            const statut = STATUTS[reservation.statut ?? "pending"] ?? STATUTS.pending;
            return (
              <View
                key={reservation.id}
                style={{
                  borderRadius: rayons.lg,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  padding: 16,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Texte poids="extrabold" style={{ flex: 1 }}>
                    {reservation.studio?.nom}
                  </Texte>
                  <View style={{ borderRadius: rayons.pill, backgroundColor: `${statut.couleur}20`, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Texte variante="micro" poids="bold" couleur={statut.couleur}>
                      {statut.label}
                    </Texte>
                  </View>
                </View>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {reservation.studio?.ville} · {formatDateHeure(reservation.date_debut)} à{" "}
                  {new Date(reservation.date_fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Texte>
                {reservation.statut === "pending" && (
                  <Bouton
                    variante="danger"
                    titre="Annuler"
                    chargement={annuler.isPending}
                    onPress={() => annuler.mutate(reservation.id)}
                    style={{ marginTop: 8, alignSelf: "flex-start" }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Ecran>
  );
}
