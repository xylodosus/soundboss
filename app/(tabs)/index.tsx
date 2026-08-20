import { FlatList, Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMesGroupes } from "@/lib/queries/groupes";
import { useProchainesSeances, useStudiosRecommandes } from "@/lib/queries/dashboard";
import { libelleUniteCourt, vedetteDe } from "@/lib/queries/studios";
import { useNonLues, useProfil, useWallet } from "@/lib/queries/profil";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { VisuelGroupe } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Squelette } from "@/components/ui/etat-vide";
import { libelleTypeGroupe, initiales } from "@/lib/format";

const STATUTS_SEANCE: Record<string, { label: string; couleur: string }> = {
  planifiee: { label: "Planifiée", couleur: couleurs.warmGold },
  en_cours: { label: "En cours", couleur: "#34D399" },
  terminee: { label: "Terminée", couleur: couleurs.muted },
  annulee: { label: "Annulée", couleur: couleurs.danger },
};

const JOURS_COURTS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

// Surface de carte douce : translucide, moins de teinte que la carte pleine
const SURFACE_CARTE = "rgba(255,255,255,0.04)";
const BORD_CARTE = "rgba(255,255,255,0.05)";

export default function Accueil() {
  const router = useRouter();
  const { data: profil } = useProfil();
  const { data: wallet } = useWallet();
  const { data: groupes = [], isLoading: chargementGroupes } = useMesGroupes();
  const { data: seances = [], isLoading: chargementSeances } = useProchainesSeances();
  const { data: studios = [] } = useStudiosRecommandes();
  const { data: nonLues = 0 } = useNonLues();

  // Prochaine répétition de chaque groupe (depuis la liste globale)
  const prochaineParGroupe = new Map<string, (typeof seances)[number]>();
  for (const seance of seances) {
    if (seance.groupe_id && !prochaineParGroupe.has(seance.groupe_id)) {
      prochaineParGroupe.set(seance.groupe_id, seance);
    }
  }

  return (
    <Ecran>
      <FlatList
        data={[0]}
        keyExtractor={() => "accueil"}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <View style={{ paddingBottom: 32 }}>
            {/* TopAppBar */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: couleurs.terracottaLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Texte poids="bold" couleur={couleurs.charcoal}>
                    {initiales(profil?.prenom, profil?.nom)}
                  </Texte>
                </View>
                <View>
                  <Texte variante="titre3" poids="extrabold">
                    Salut, {profil?.prenom ?? "Musicien"}
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {[profil?.ville, profil?.pays].filter(Boolean).join(", ")}
                  </Texte>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {/* Solde crédits */}
                <Link href="/wallet" asChild>
                  <Pressable
                    style={{
                      height: 36,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name="wallet" size={16} color={couleurs.warmGold} />
                    <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                      {wallet?.solde_credits ?? 0}
                    </Texte>
                  </Pressable>
                </Link>

                {/* Notifications */}
                <Link href="/profil/notifications" asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="notifications-outline" size={24} color={couleurs.texte} />
                    {nonLues > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: couleurs.terracottaLight,
                        }}
                      />
                    )}
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* ===== Mes groupes ===== */}
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Texte variante="titre3" poids="extrabold">
                  Mes groupes
                </Texte>
                <Link href="/groupes" asChild>
                  <Pressable style={{ paddingVertical: 4 }}>
                    <Texte variante="petit" poids="semibold" couleur={couleurs.terracottaLight}>
                      Tout voir
                    </Texte>
                  </Pressable>
                </Link>
              </View>

              {chargementGroupes ? (
                <Squelette hauteur={88} />
              ) : groupes.length === 0 ? (
                <Pressable
                  onPress={() => router.push("/groupes/nouveau")}
                  style={{
                    borderRadius: rayons.lg,
                    borderWidth: 1,
                    borderColor: BORD_CARTE,
                    backgroundColor: SURFACE_CARTE,
                    padding: 20,
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="people-outline" size={28} color={couleurs.terracottaLight} />
                  <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 8 }}>
                    Crée ton premier groupe →
                  </Texte>
                </Pressable>
              ) : (
                <View style={{ gap: 8 }}>
                  {groupes.slice(0, 4).map((groupe) => {
                    const prochaine = prochaineParGroupe.get(groupe.id);
                    return (
                      <Link key={groupe.id} href={`/groupes/${groupe.id}`} asChild>
                        <Pressable
                          style={{
                            borderRadius: rayons.lg,
                            borderWidth: 1,
                            borderColor: BORD_CARTE,
                            backgroundColor: SURFACE_CARTE,
                            padding: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <VisuelGroupe
                            url={groupe.photo_url}
                            style={{ width: 64, height: 64, borderRadius: 12 }}
                          />
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Texte poids="bold" variante="corps" style={{ flexShrink: 1 }}>
                                {groupe.nom}
                              </Texte>
                              {groupe.monRole === "chef" && (
                                <View style={{ borderRadius: 999, backgroundColor: "rgba(251,191,36,0.16)", paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                                    Chef
                                  </Texte>
                                </View>
                              )}
                              {groupe.monRole === "admin" && (
                                <View style={{ borderRadius: 999, backgroundColor: "rgba(224,122,86,0.16)", paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight}>
                                    Admin
                                  </Texte>
                                </View>
                              )}
                              {groupe.monRole === "membre" && (
                                <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire}>
                                    Membre
                                  </Texte>
                                </View>
                              )}
                            </View>
                            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                              {libelleTypeGroupe(groupe.type_groupe)} · {groupe.nombre_membres ?? 0} membre
                              {(groupe.nombre_membres ?? 0) > 1 ? "s" : ""}
                            </Texte>
                            {prochaine && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <Ionicons name="calendar-outline" size={13} color={couleurs.terracottaLight} />
                                <Texte variante="micro" couleur={couleurs.terracottaLight}>
                                  Répét.{" "}
                                  {new Date(prochaine.date_seance).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}{" "}
                                  · {prochaine.heure_debut.slice(0, 5)}
                                </Texte>
                              </View>
                            )}
                          </View>
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ===== Prochaines répétitions ===== */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Texte variante="titre3" poids="extrabold" style={{ marginBottom: 12 }}>
                Prochaines répétitions
              </Texte>
              {chargementSeances ? (
                <Squelette hauteur={80} />
              ) : seances.length === 0 ? (
                <View style={{ borderRadius: rayons.lg, borderWidth: 1, borderColor: BORD_CARTE, backgroundColor: SURFACE_CARTE, padding: 20, alignItems: "center" }}>
                  <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                    Aucune répétition à venir.
                  </Texte>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {seances.slice(0, 3).map((seance) => {
                    const date = new Date(`${seance.date_seance}T00:00:00`);
                    const statut = STATUTS_SEANCE[seance.statut ?? "planifiee"] ?? STATUTS_SEANCE.planifiee;
                    return (
                      <Link
                        key={seance.id}
                        href={`/groupes/${seance.groupe_id}/seances/${seance.id}`}
                        asChild
                      >
                        <Pressable
                          style={{
                            borderRadius: rayons.lg,
                            borderWidth: 1,
                            borderColor: BORD_CARTE,
                            backgroundColor: SURFACE_CARTE,
                            padding: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <View
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 12,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight} style={{ letterSpacing: 1 }}>
                              {JOURS_COURTS[date.getDay()]}
                            </Texte>
                            <Texte poids="extrabold" variante="corps">
                              {date.getDate()}
                            </Texte>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Texte poids="bold" variante="corps">
                              {seance.titre ?? "Répétition"}
                            </Texte>
                            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                              {seance.groupe?.nom} · {seance.heure_debut.slice(0, 5)} à {seance.heure_fin.slice(0, 5)}
                            </Texte>
                          </View>
                          <View style={{ borderRadius: 999, backgroundColor: `${statut.couleur}1F`, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Texte variante="micro" poids="bold" couleur={statut.couleur}>
                              {statut.label}
                            </Texte>
                          </View>
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ===== Studios recommandés ===== */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Texte variante="titre3" poids="extrabold" style={{ marginBottom: 12 }}>
                Studios recommandés
              </Texte>
              <FlatList
                horizontal
                data={studios}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 16 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push(`/studios/${item.id}`)}
                    style={{
                      width: 200,
                      borderRadius: rayons.lg,
                      borderWidth: 1,
                      borderColor: BORD_CARTE,
                      backgroundColor: SURFACE_CARTE,
                      overflow: "hidden",
                    }}
                  >
                    <VisuelGroupe url={item.photos_urls?.[0]} style={{ width: "100%", height: 100 }} />
                    <View style={{ padding: 12, gap: 4 }}>
                      <Texte poids="bold" variante="petit" numberOfLines={1}>
                        {item.nom}
                      </Texte>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                          {(() => {
                            const vedette = vedetteDe(item);
                            return vedette
                              ? `${new Intl.NumberFormat("fr-FR").format(vedette.prix)} F · ${libelleUniteCourt(vedette.unite)}`
                              : item.tarif_heure
                                ? `${new Intl.NumberFormat("fr-FR").format(item.tarif_heure)} F/h`
                                : "Tarif sur demande";
                          })()}
                        </Texte>
                        {item.note_moyenne ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name="star" size={13} color={couleurs.warmGold} />
                            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                              {item.note_moyenne.toFixed(1)}
                            </Texte>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                )}
               />

            </View>
          </View>
        )}
      />
    </Ecran>
  );
}
