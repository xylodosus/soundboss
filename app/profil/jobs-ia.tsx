import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useJobsIA } from "@/lib/queries/profil";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { formatDateHeure } from "@/lib/format";

const STATUTS: Record<string, { label: string; couleur: string }> = {
  queued: { label: "En file", couleur: couleurs.warmGold },
  processing: { label: "En cours", couleur: "#60A5FA" },
  completed: { label: "Terminé", couleur: "#34D399" },
  failed: { label: "Échoué", couleur: couleurs.danger },
  cancelled: { label: "Annulé", couleur: couleurs.muted },
};

export default function JobsIA() {
  const router = useRouter();
  const { data: jobs = [], isLoading } = useJobsIA();

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <View>
            <Texte variante="titre3" poids="extrabold">
              Mes jobs IA
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              Studio IA & Labo Audio (Phase 3)
            </Texte>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 20 }}>
          {!isLoading && jobs.length === 0 && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ textAlign: "center", marginTop: 40 }}>
              Aucun job pour le moment.
            </Texte>
          )}
          {jobs.map((job) => {
            const statut = STATUTS[job.statut ?? "queued"] ?? STATUTS.queued;
            return (
              <View
                key={job.id}
                style={{
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "rgba(251,191,36,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={18} color={couleurs.warmGold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Texte variante="petit" poids="semibold">
                      {job.type.replaceAll("_", " ")}
                    </Texte>
                    <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                      {formatDateHeure(job.created_at)}
                    </Texte>
                  </View>
                  <View style={{ borderRadius: rayons.pill, backgroundColor: `${statut.couleur}20`, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Texte variante="micro" poids="bold" couleur={statut.couleur}>
                      {statut.label}
                    </Texte>
                  </View>
                </View>
                {job.statut === "failed" && job.message_erreur && (
                  <Texte variante="micro" couleur={couleurs.danger} style={{ marginTop: 8 }}>
                    {job.message_erreur}
                  </Texte>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Ecran>
  );
}
