import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMembresGroupe } from "@/lib/queries/groupes";
import {
  useStatistiquesPresences,
  useStatistiquesPresencesMembre,
} from "@/lib/queries/seances";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Avatar } from "@/components/ui/avatar";
import { SqueletteListe } from "@/components/ui/etat-vide";

type MembreAvecInfos = {
  id: string;
  user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  role: { id: string; nom: string | null; couleur: string | null; ordre: number | null } | null;
};

/** Page assiduité du groupe : stats globales + assiduité par personne (détail au clic). */
export default function Assiduite() {
  const { id: groupeId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: stats } = useStatistiquesPresences(groupeId);
  const { data: membres = [], isLoading: chargementMembres } = useMembresGroupe(groupeId);
  const [membreSelectionne, setMembreSelectionne] = useState<MembreAvecInfos | null>(null);

  const actifs = membres
    .filter((m) => m.statut === "actif")
    .sort((a, b) => {
      const roleA = a.role?.ordre ?? 99;
      const roleB = b.role?.ordre ?? 99;
      return roleA - roleB;
    });

  return (
    <Ecran>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: couleurs.surfaceCarte,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Texte variante="titre3" poids="extrabold">
              Assiduité du groupe
            </Texte>
            {membreSelectionne && (
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Détail par personne
              </Texte>
            )}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, marginTop: 20 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {membreSelectionne ? (
            <DetailMembre
              membre={membreSelectionne}
              surRetour={() => setMembreSelectionne(null)}
            />
          ) : (
            <>
              {/* Stats globales */}
              {stats ? (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {(
                      [
                        { label: "Présences", valeur: stats.totaux.presents, couleur: "#34D399" },
                        { label: "Retards", valeur: stats.totaux.retards, couleur: couleurs.warmGold },
                        { label: "Absences", valeur: stats.totaux.absents, couleur: couleurs.danger },
                        { label: "Excusés", valeur: stats.totaux.excuses, couleur: couleurs.muted },
                      ] as const
                    ).map((stat) => (
                      <View
                        key={stat.label}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          gap: 4,
                          borderRadius: rayons.md,
                          borderWidth: 1,
                          borderColor: couleurs.bordure,
                          backgroundColor: couleurs.surfaceCarte,
                          paddingVertical: 14,
                          paddingHorizontal: 2,
                        }}
                      >
                        <Texte poids="extrabold" variante="titre3" couleur={stat.couleur}>
                          {stat.valeur ?? 0}
                        </Texte>
                        <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                          {stat.label}
                        </Texte>
                      </View>
                    ))}
                  </View>

                  {stats.totaux.taux_presence != null && (
                    <View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          Taux de présence
                        </Texte>
                        <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                          {stats.totaux.taux_presence}%
                        </Texte>
                      </View>
                      <View
                        style={{
                          marginTop: 6,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: `${Math.min(100, stats.totaux.taux_presence)}%`,
                            height: "100%",
                            borderRadius: 4,
                            backgroundColor: couleurs.warmGold,
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {stats.evolution.length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                        Évolution (6 mois)
                      </Texte>
                      {stats.evolution.map((mois) => (
                        <View
                          key={mois.mois}
                          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                        >
                          <Texte variante="micro" poids="bold" style={{ width: 34 }}>
                            {new Date(`${mois.mois}-01`).toLocaleDateString("fr-FR", { month: "short" })}
                          </Texte>
                          <View
                            style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.min(100, mois.taux_presence ?? 0)}%`,
                                height: "100%",
                                borderRadius: 3,
                                backgroundColor:
                                  (mois.taux_presence ?? 0) >= 70
                                    ? "#34D399"
                                    : (mois.taux_presence ?? 0) >= 40
                                      ? couleurs.warmGold
                                      : couleurs.danger,
                              }}
                            />
                          </View>
                          <Texte
                            variante="micro"
                            couleur={couleurs.texteSecondaire}
                            style={{ width: 46, textAlign: "right" }}
                          >
                            {mois.taux_presence ?? 0}%
                          </Texte>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <SqueletteListe lignes={2} hauteur={48} />
              )}

              {/* Assiduité par personne */}
              <View style={{ marginTop: 24 }}>
                <Texte poids="extrabold" variante="petit" style={{ marginBottom: 10 }}>
                  Par personne
                </Texte>
                {chargementMembres ? (
                  <SqueletteListe lignes={2} hauteur={56} />
                ) : actifs.length === 0 ? (
                  <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                    Aucun membre actif dans le groupe.
                  </Texte>
                ) : (
                  <View style={{ gap: 8 }}>
                    {actifs.map((membre) => (
                      <Pressable
                        key={membre.id}
                        onPress={() => setMembreSelectionne(membre)}
                        accessibilityRole="button"
                        accessibilityLabel={`Voir l'assiduité de ${membre.user?.prenom ?? ""} ${membre.user?.nom ?? ""}`}
                        style={({ pressed }) => [
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: rayons.md,
                            borderWidth: 1,
                            borderColor: couleurs.bordure,
                            backgroundColor: couleurs.surfaceCarte,
                            padding: 12,
                          },
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Avatar
                          prenom={membre.user?.prenom}
                          nom={membre.user?.nom}
                          url={membre.user?.avatar_url}
                          taille={38}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Texte variante="petit" poids="semibold" numberOfLines={1}>
                            {membre.user?.prenom} {membre.user?.nom}
                          </Texte>
                          {membre.role ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: membre.role.couleur ?? couleurs.muted,
                                }}
                              />
                              <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                                {membre.role.nom}
                              </Texte>
                            </View>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={couleurs.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Ecran>
  );
}

/** Détail de l'assiduité d'un membre (au clic sur sa carte). */
function DetailMembre({
  membre,
  surRetour,
}: {
  membre: MembreAvecInfos;
  surRetour: () => void;
}) {
  const { data: statsMembre } = useStatistiquesPresencesMembre(membre.id, true);
  const totaux = statsMembre?.totaux;

  const nom = `${membre.user?.prenom ?? ""} ${membre.user?.nom ?? ""}`.trim();

  return (
    <View>
      <Pressable
        onPress={surRetour}
        accessibilityRole="button"
        accessibilityLabel="Retour à la liste"
        style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}
      >
        <Ionicons name="arrow-back" size={16} color={couleurs.texteSecondaire} />
        <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
          Retour à la liste
        </Texte>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
        <Avatar
          prenom={membre.user?.prenom}
          nom={membre.user?.nom}
          url={membre.user?.avatar_url}
          taille={48}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texte poids="extrabold" variante="corps" numberOfLines={1}>
            {nom}
          </Texte>
          {membre.role ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: membre.role.couleur ?? couleurs.muted,
                }}
              />
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {membre.role.nom}
              </Texte>
            </View>
          ) : null}
        </View>
      </View>

      {statsMembre ? (
        <View style={{ gap: 14, marginTop: 16 }}>
          {totaux?.taux_assiduite != null && (
            <View
              style={{
                alignItems: "center",
                gap: 4,
                borderRadius: rayons.md,
                borderWidth: 1,
                borderColor: "rgba(251,191,36,0.25)",
                backgroundColor: "rgba(251,191,36,0.08)",
                paddingVertical: 14,
              }}
            >
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Taux d&apos;assiduité
              </Texte>
              <Texte variante="titre2" poids="extrabold" couleur={couleurs.warmGold}>
                {totaux.taux_assiduite}%
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                sur {totaux.seances} répétition{totaux.seances > 1 ? "s" : ""}
              </Texte>
            </View>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                { label: "Présences", valeur: totaux?.presents ?? 0, couleur: "#34D399" },
                { label: "Retards", valeur: totaux?.retards ?? 0, couleur: couleurs.warmGold },
                { label: "Absences", valeur: totaux?.absents ?? 0, couleur: couleurs.danger },
                { label: "Excusés", valeur: totaux?.excuses ?? 0, couleur: couleurs.muted },
              ] as const
            ).map((stat) => (
              <View
                key={stat.label}
                style={{
                  flexBasis: "47%",
                  flexGrow: 1,
                  alignItems: "center",
                  gap: 4,
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  paddingVertical: 14,
                }}
              >
                <Texte poids="extrabold" variante="corps" couleur={stat.couleur}>
                  {stat.valeur}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {stat.label}
                </Texte>
              </View>
            ))}
          </View>

          {statsMembre.evolution.length > 0 && (
            <View style={{ gap: 8 }}>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Évolution (6 mois)
              </Texte>
              {statsMembre.evolution.map((mois) => {
                const total = mois.present + mois.absent + mois.retard;
                const taux = total > 0 ? Math.round((100 * mois.present) / total) : null;
                return (
                  <View key={mois.mois} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Texte variante="micro" poids="bold" style={{ width: 34 }}>
                      {new Date(`${mois.mois}-01`).toLocaleDateString("fr-FR", { month: "short" })}
                    </Texte>
                    <View
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, taux ?? 0)}%`,
                          height: "100%",
                          borderRadius: 3,
                          backgroundColor:
                            (taux ?? 0) >= 70
                              ? "#34D399"
                              : (taux ?? 0) >= 40
                                ? couleurs.warmGold
                                : couleurs.danger,
                        }}
                      />
                    </View>
                    <Texte
                      variante="micro"
                      couleur={couleurs.texteSecondaire}
                      style={{ width: 46, textAlign: "right" }}
                    >
                      {taux ?? 0}%
                    </Texte>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <SqueletteListe lignes={2} hauteur={56} />
        </View>
      )}
    </View>
  );
}
