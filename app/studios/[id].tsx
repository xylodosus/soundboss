import { ScrollView, View , Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useAvisStudio,
  useMettreEnAvantService,
  useServicesStudio,
  useStudio,
  libelleService,
} from "@/lib/queries/studios";
import { useSession } from "@/lib/session";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { VisuelGroupe } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { formatFCFA, formatDateHeure } from "@/lib/format";

export default function FicheStudio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { data: studio, isLoading } = useStudio(id);
  const { data: services = [] } = useServicesStudio(id);
  const { data: avis = [] } = useAvisStudio(id);
  const mettreEnAvant = useMettreEnAvantService(id);
  const dialogue = useDialogue();

  if (isLoading || !studio) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <SqueletteListe lignes={2} hauteur={180} />
        </View>
      </Ecran>
    );
  }

  const equipements = studio.equipements ?? [];
  const estProprietaire = session?.user?.id === studio.proprietaire_id;
  // Le service mis en avant remonte en tête de liste.
  const servicesTries = [...services].sort((a, b) => Number(b.est_vedette) - Number(a.est_vedette));

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} style={{ width: 40 }}>
              <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
            </Pressable>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              {studio.nom}
            </Texte>
          </View>

          <VisuelGroupe
            url={studio.photos_urls?.[0]}
            style={{ width: "100%", height: 180, borderRadius: 20, marginTop: 16 }}
          />

          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location-outline" size={16} color={couleurs.terracottaLight} />
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              {studio.adresse}, {studio.ville}
            </Texte>
          </View>

          <View
            style={{
              marginTop: 16,
              borderRadius: rayons.lg,
              borderWidth: 1,
              borderColor: couleurs.bordure,
              backgroundColor: couleurs.surfaceCarte,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {services.length > 0 ? "Services & tarifs" : "Tarif à l&apos;heure"}
                </Texte>
                {services.length === 0 && studio.tarif_heure != null && (
                  <Texte variante="titre2" poids="extrabold" couleur={couleurs.warmGold}>
                    {formatFCFA(studio.tarif_heure)}
                  </Texte>
                )}
              </View>
              {studio.note_moyenne ? (
                <View style={{ alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="star" size={18} color={couleurs.warmGold} />
                    <Texte poids="extrabold" variante="corps">
                      {studio.note_moyenne.toFixed(1)}
                    </Texte>
                  </View>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {studio.nombre_avis} avis
                  </Texte>
                </View>
              ) : null}
            </View>

            {services.length > 0 && (
              <View style={{ gap: 8, marginTop: 14 }}>
                {servicesTries.map((service) => {
                  const vedette = service.est_vedette;
                  return (
                    <View
                      key={service.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: rayons.md,
                        borderWidth: 1,
                        borderColor: vedette ? "rgba(251,191,36,0.45)" : couleurs.bordure,
                        backgroundColor: vedette ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.03)",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      {vedette && (
                        <Ionicons name="star" size={14} color={couleurs.warmGold} />
                      )}
                      <Texte variante="petit" poids="semibold" style={{ flex: 1 }}>
                        {libelleService(service)}
                      </Texte>
                      <Texte variante="petit" poids="bold" couleur={couleurs.warmGold}>
                        {formatFCFA(service.prix)}
                      </Texte>
                      {estProprietaire && (
                        <Pressable
                          onPress={async () => {
                            if (vedette || mettreEnAvant.isPending) return;
                            try {
                              await mettreEnAvant.mutateAsync(service.id);
                              dialogue.succes("Service mis en avant.");
                            } catch {
                              dialogue.erreur("Impossible de mettre ce service en avant.");
                            }
                          }}
                          disabled={vedette || mettreEnAvant.isPending}
                          accessibilityRole="button"
                          accessibilityLabel={vedette ? "Service mis en avant" : "Mettre en avant ce service"}
                          hitSlop={8}
                          style={{ padding: 4, opacity: vedette || mettreEnAvant.isPending ? 0.6 : 1 }}
                        >
                          <Ionicons
                            name={vedette ? "star" : "star-outline"}
                            size={18}
                            color={vedette ? couleurs.warmGold : couleurs.texteSecondaire}
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {studio.description && (
              <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 14, lineHeight: 21 }}>
                {studio.description}
              </Texte>
            )}

            {equipements.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {equipements.map((eq) => (
                  <View key={eq} style={{ borderRadius: rayons.pill, backgroundColor: "rgba(251,191,36,0.1)", paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Texte variante="micro" poids="semibold" couleur={couleurs.warmGold}>
                      {eq}
                    </Texte>
                  </View>
                ))}
              </View>
            )}

            <Bouton
              titre="Réserver ce studio"
              taille="lg"
              onPress={() => router.push(`/studios/${id}/reserver`)}
              style={{ marginTop: 20 }}
            />
          </View>

          {/* Avis */}
          <View style={{ marginTop: 24 }}>
            <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
              Avis
            </Texte>
            {avis.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Aucun avis pour le moment.
              </Texte>
            ) : (
              <View style={{ gap: 8 }}>
                {avis.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      borderRadius: rayons.md,
                      borderWidth: 1,
                      borderColor: couleurs.bordure,
                      backgroundColor: couleurs.surfaceCarte,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="star" size={14} color={couleurs.warmGold} />
                      <Texte variante="petit" poids="semibold" style={{ flex: 1 }}>
                        {a.user?.prenom} {a.user?.nom}
                      </Texte>
                      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                        {formatDateHeure(a.created_at)}
                      </Texte>
                    </View>
                    {a.commentaire && (
                      <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 8, lineHeight: 20 }}>
                        {a.commentaire}
                      </Texte>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Ecran>
  );
}
