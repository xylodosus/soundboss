import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useConflitsReservations,
  useCreerReservation,
  useServicesStudio,
  useStudio,
  libelleService,
  type StudioService,
} from "@/lib/queries/studios";
import { useMesGroupes } from "@/lib/queries/groupes";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { AlerteErreur } from "@/components/ui/champ";
import {
  ChampDatePicker,
  chaineDepuisDate,
  dateDepuisHeure,
  heureDepuisDate,
} from "@/components/ui/champ-date";
import { formatFCFA } from "@/lib/format";

export default function Reserver() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: studio } = useStudio(id);
  const { data: services = [] } = useServicesStudio(id);
  const { data: groupes = [] } = useMesGroupes();
  const creer = useCreerReservation();

  const [service, setService] = useState<StudioService | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [date, setDate] = useState<Date | null>(null);
  const [heure, setHeure] = useState<Date | null>(dateDepuisHeure("10:00"));
  const [groupeId, setGroupeId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const jour = date ? chaineDepuisDate(date) : null;
  const { data: conflits = [] } = useConflitsReservations(id, jour);

  if (!studio) return null;

  function choisirService(s: StudioService) {
    setService(s);
    setQuantite(1);
  }

  const estCreneau = service?.unite === "heure" || service?.unite === "bloc_4h";
  const dureeHeures = service
    ? service.unite === "bloc_4h"
      ? quantite * 4
      : estCreneau
        ? quantite
        : 0
    : 0;
  const prixTotal = service ? service.prix * quantite : 0;
  const caution = studio.caution ?? 0;

  const heureDebut = heure ? heureDepuisDate(heure) : "";
  const creneauDebut = estCreneau && date && heureDebut ? new Date(`${jour}T${heureDebut}:00`) : null;
  const creneauFin =
    creneauDebut && dureeHeures > 0
      ? new Date(creneauDebut.getTime() + dureeHeures * 3600 * 1000)
      : null;

  function creneauxConflictuels(heureDebut: string, dureeH: number): boolean {
    if (!estCreneau || !date) return false;
    const debut = new Date(`${jour}T${heureDebut}`);
    const fin = new Date(debut.getTime() + dureeH * 3600 * 1000);
    return conflits.some((c) => {
      const cDebut = new Date(c.date_debut);
      const cFin = new Date(c.date_fin);
      return debut < cFin && fin > cDebut;
    });
  }

  const conflit = creneauxConflictuels(heureDebut, dureeHeures);

  async function reserver() {
    setErreur(null);
    if (!service) {
      setErreur("Choisis le service à réserver.");
      return;
    }
    if (!date) {
      setErreur("Choisis la date.");
      return;
    }
    if (estCreneau && !heure) {
      setErreur("Choisis l'heure de début.");
      return;
    }
    if (conflit) {
      setErreur("Ce créneau est déjà réservé. Choisis-en un autre.");
      return;
    }
    try {
      const heureDebut = heure ? heureDepuisDate(heure) : "10:00";
      const dateDebut = new Date(`${jour}T${heureDebut}:00`).toISOString();
      const dateFin = estCreneau
        ? new Date(new Date(`${jour}T${heureDebut}:00`).getTime() + dureeHeures * 3600 * 1000).toISOString()
        : dateDebut;
      await creer.mutateAsync({
        studioId: id,
        serviceId: service.id,
        quantite,
        dateDebut,
        dateFin,
        prixTotal,
        caution,
        nombrePersonnes: null,
        groupeId,
      });
      router.replace("/studios/mes-reservations");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de réserver.");
    }
  }

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: couleurs.surfaceCarte,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color={couleurs.texte} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Texte variante="titre3" poids="extrabold" numberOfLines={1}>
              Réserver {studio.nom}
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {studio.ville}
            </Texte>
          </View>
        </View>

        <AlerteErreur message={erreur} />

        {/* Service */}
        <View style={{ marginTop: 20 }}>
          <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
            Choisis un service
          </Texte>
          {services.length === 0 ? (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              Aucun service proposé pour le moment.
            </Texte>
          ) : (
            <View style={{ gap: 8 }}>
              {services.map((s) => {
                const actif = service?.id === s.id;
                const vedette = s.est_vedette;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => choisirService(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choisir ${libelleService(s)}`}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: rayons.md,
                        borderWidth: 1,
                        borderColor: actif
                          ? couleurs.warmGold
                          : vedette
                            ? "rgba(251,191,36,0.45)"
                            : couleurs.bordure,
                        backgroundColor: actif
                          ? "rgba(251,191,36,0.12)"
                          : vedette
                            ? "rgba(251,191,36,0.07)"
                            : "rgba(255,255,255,0.03)",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      },
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    {vedette && <Ionicons name="star" size={14} color={couleurs.warmGold} />}
                    <Texte variante="petit" poids="semibold" style={{ flex: 1 }}>
                      {libelleService(s)}
                    </Texte>
                    <Texte variante="petit" poids="bold" couleur={actif ? couleurs.warmGold : couleurs.texte}>
                      {formatFCFA(s.prix)}
                    </Texte>
                    {actif ? (
                      <Ionicons name="checkmark-circle" size={20} color={couleurs.warmGold} />
                    ) : (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.2)",
                        }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Quantité */}
        {service && (
          <View style={{ marginTop: 24 }}>
            <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
              {service.unite === "bloc_4h"
                ? "Nombre de blocs (4 h)"
                : service.unite === "heure"
                  ? "Durée"
                  : "Nombre de titres"}
            </Texte>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                borderRadius: rayons.lg,
                borderWidth: 1,
                borderColor: couleurs.bordure,
                backgroundColor: couleurs.surfaceCarte,
                padding: 16,
              }}
            >
              <Pressable
                onPress={() => setQuantite((q) => Math.max(1, q - 1))}
                accessibilityRole="button"
                accessibilityLabel="Diminuer"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="remove" size={20} color={couleurs.texte} />
              </Pressable>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Texte poids="extrabold" variante="titre2" couleur={couleurs.warmGold}>
                  {quantite}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {service.unite === "bloc_4h"
                    ? quantite > 1
                      ? `blocs = ${quantite * 4} h`
                      : "bloc = 4 h"
                    : service.unite === "heure"
                      ? quantite > 1
                        ? "heures"
                        : "heure"
                      : "titres"}
                </Texte>
              </View>
              <Pressable
                onPress={() => setQuantite((q) => Math.min(8, q + 1))}
                accessibilityRole="button"
                accessibilityLabel="Augmenter"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={20} color={couleurs.texte} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Date / heure */}
        <View style={{ marginTop: 24 }}>
          <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
            {estCreneau ? "Créneau" : "Date"}
          </Texte>
          <View style={{ gap: 10 }}>
            <ChampDatePicker valeur={date} onChange={setDate} mode="date" placeholder="Choisis la date *" />
            {estCreneau && (
              <ChampDatePicker valeur={heure} onChange={setHeure} mode="time" placeholder="Heure de début" />
            )}
          </View>
        </View>

        {/* Créneau horaire */}
        {estCreneau && creneauDebut && creneauFin && (
          <View
            style={{
              marginTop: 16,
              borderRadius: rayons.lg,
              borderWidth: 1,
              borderColor: conflit ? "rgba(224,82,74,0.4)" : "rgba(251,191,36,0.35)",
              backgroundColor: conflit ? "rgba(224,82,74,0.08)" : "rgba(251,191,36,0.08)",
              padding: 16,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
              CRÉNEAU HORAIRE
            </Texte>
            <Texte variante="titre2" poids="extrabold" couleur={conflit ? couleurs.danger : couleurs.warmGold}>
              {heureCourte(creneauDebut)} - {heureCourte(creneauFin)}
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {quantite > 1
                ? `${quantite} × ${service!.unite === "bloc_4h" ? "4 h" : "1 h"} · ${dureeHeures} h au total`
                : `${dureeHeures} h`}
            </Texte>
          </View>
        )}

        {/* Groupe */}
        {groupes.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
              Groupe concerné
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ marginBottom: 10 }}>
              Optionnel
            </Texte>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pressable
                onPress={() => setGroupeId(null)}
                style={{
                  borderRadius: rayons.pill,
                  borderWidth: 1,
                  borderColor: groupeId === null ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                  backgroundColor: groupeId === null ? "rgba(251,191,36,0.14)" : "transparent",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Texte variante="micro" poids={groupeId === null ? "bold" : "medium"} couleur={groupeId === null ? couleurs.warmGold : couleurs.texte}>
                  Personnel
                </Texte>
              </Pressable>
              {groupes.map((g) => {
                const actif = groupeId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupeId(g.id)}
                    style={{
                      borderRadius: rayons.pill,
                      borderWidth: 1,
                      borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                      backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Texte variante="micro" poids={actif ? "bold" : "medium"} couleur={actif ? couleurs.warmGold : couleurs.texte}>
                      {g.nom}
                    </Texte>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Conflits */}
        {estCreneau && jour && conflits.length > 0 && (
          <View style={{ borderRadius: rayons.md, backgroundColor: "rgba(224,82,74,0.08)", padding: 12, marginTop: 16 }}>
            <Texte variante="micro" poids="bold" couleur={couleurs.danger}>
              {conflits.length} réservation{conflits.length > 1 ? "s" : ""} déjà sur ce jour
            </Texte>
            {conflits.map((c) => (
              <Texte key={c.id} variante="micro" couleur={couleurs.texteSecondaire} style={{ marginTop: 4 }}>
                {new Date(c.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} à{" "}
                {new Date(c.date_fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Texte>
            ))}
          </View>
        )}

        {/* Récapitulatif */}
        <View
          style={{
            marginTop: 24,
            borderRadius: rayons.lg,
            borderWidth: 1,
            borderColor: "rgba(251,191,36,0.2)",
            backgroundColor: "rgba(251,191,36,0.05)",
            padding: 16,
            gap: 8,
          }}
        >
          <Texte poids="extrabold" variante="petit">
            Récapitulatif
          </Texte>
          {service ? (
            <Ligne label={`${libelleService(service)} × ${quantite}`} valeur={formatFCFA(prixTotal)} />
          ) : (
            <Ligne label="Service" valeur="—" />
          )}
          {caution > 0 && <Ligne label="Caution" valeur={formatFCFA(caution)} />}
          <Ligne label="Total" valeur={formatFCFA(prixTotal + caution)} gras />
          <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ marginTop: 4 }}>
            Paiement simulé (Mobile Money) pour le moment.
          </Texte>
        </View>

        <Bouton
          titre={conflit ? "Créneau indisponible" : "Confirmer la réservation"}
          taille="lg"
          chargement={creer.isPending}
          disabled={conflit || !service}
          onPress={reserver}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </Ecran>
  );
}

function heureCourte(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function Ligne({ label, valeur, gras = false }: { label: string; valeur: string; gras?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Texte variante="petit" couleur={couleurs.texteSecondaire}>
        {label}
      </Texte>
      <Texte variante="petit" poids={gras ? "extrabold" : "semibold"} couleur={gras ? couleurs.warmGold : couleurs.texte}>
        {valeur}
      </Texte>
    </View>
  );
}
