import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import type { Database } from "@/lib/database.types";
import {
  useAjouterMorceau,
  useDroitsProjet,
  useMajAvancement,
  useMorceauxProjet,
  useProjet,
  useSeancesProjet,
  useSupprimerMorceau,
  useSupprimerProjet,
} from "@/lib/queries/projets";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { ModalCreerSeance } from "@/components/ui/modal-creer-seance";
import { OngletTaches } from "@/components/projet/onglet-taches";
import { BoutonAjout } from "@/components/ui/bouton-ajout";
import { FormulaireProjet } from "@/components/projet/formulaire-projet";
import {
  formatDateCourte,
  libelleCategorieProjet,
  libelleStatutProjet,
  libelleStatutSeance,
  libelleTypeEvenement,
  libelleTypeProduction,
} from "@/lib/format";

export default function DetailProjet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: projet, isLoading } = useProjet(id);
  const { data: estGestionnaire = false } = useDroitsProjet(id);
  const supprimerProjet = useSupprimerProjet();
  const [modeEditionProjet, setModeEditionProjet] = useState(false);

  async function supprimerCeProjet() {
    // Le handler est déclaré avant le garde de chargement : projet n'y est pas
    // encore restreint. Le bouton n'existe de toute façon qu'une fois chargé.
    if (!projet) return;
    const confirme = await dialogue.confirmer({
      titre: "Supprimer ce projet ?",
      message: "Le projet, son répertoire et ses tâches seront définitivement supprimés.",
      danger: true,
    });
    if (!confirme) return;
    try {
      await supprimerProjet.mutateAsync({ projetId: id, groupeId: projet.groupe_id });
      router.back();
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }
  const { data: morceaux = [] } = useMorceauxProjet(id);
  const { data: seances = [] } = useSeancesProjet(id);

  const ajouterMorceau = useAjouterMorceau();
  const supprimerMorceau = useSupprimerMorceau();
  const dialogue = useDialogue();

  const [modeAjout, setModeAjout] = useState(false);
  const [titreMorceau, setTitreMorceau] = useState("");
  const [tonaliteMorceau, setTonaliteMorceau] = useState("");
  const [tempoMorceau, setTempoMorceau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [modeAjoutSeance, setModeAjoutSeance] = useState(false);

  async function supprimerMorceauProjet(morceauId: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer ce morceau ?",
      message: "Le morceau sera retiré du répertoire du projet. Cette action est irréversible.",
    });
    if (!ok) return;
    try {
      await supprimerMorceau.mutateAsync({ morceauId, projetId: id });
      dialogue.succes("Morceau supprimé du répertoire.");
    } catch {
      dialogue.erreur("Impossible de supprimer le morceau.");
    }
  }

  if (isLoading || !projet) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <SqueletteListe lignes={2} hauteur={140} />
        </View>
      </Ecran>
    );
  }

  const typeLabel =
    projet.categorie === "evenement"
      ? libelleTypeEvenement(projet.type_evenement)
      : libelleTypeProduction(projet.type_production);

  const avancementMoyen =
    morceaux.length > 0
      ? Math.round(morceaux.reduce((somme, m) => somme + (m.avancement ?? 0), 0) / morceaux.length)
      : 0;

  async function ajouter() {
    setErreur(null);
    if (!titreMorceau.trim()) return;
    const tempo = parseInt(tempoMorceau, 10);
    try {
      await ajouterMorceau.mutateAsync({
        projetId: id,
        titre: titreMorceau.trim(),
        tonalite: tonaliteMorceau.trim() || null,
        tempo: Number.isFinite(tempo) && tempo > 0 ? tempo : null,
      });
      setTitreMorceau("");
      setTonaliteMorceau("");
      setTempoMorceau("");
      setModeAjout(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ajouter le morceau.");
    }
  }

  return (
    <Ecran>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
            {projet.groupe_id ? "Projet du groupe" : "Projet personnel"}
          </Texte>
          {estGestionnaire && (
            <>
              <Pressable
                onPress={() => setModeEditionProjet(true)}
                accessibilityRole="button"
                accessibilityLabel="Modifier le projet"
                hitSlop={10}
                style={{ width: 40, alignItems: "center" }}
              >
                <Ionicons name="create-outline" size={20} color={couleurs.warmGold} />
              </Pressable>
              <Pressable
                onPress={supprimerCeProjet}
                accessibilityRole="button"
                accessibilityLabel="Supprimer le projet"
                hitSlop={10}
                style={{ width: 40, alignItems: "center" }}
              >
                <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
              </Pressable>
            </>
          )}
        </View>

        {/* Header */}
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(52,211,153,0.14)", paddingHorizontal: 10, paddingVertical: 4 }}>
              <Texte variante="micro" poids="bold" couleur="#34D399">
                {libelleStatutProjet(projet.statut)}
              </Texte>
            </View>
            <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(224,122,86,0.14)", paddingHorizontal: 10, paddingVertical: 4 }}>
              <Texte variante="micro" poids="bold" couleur={couleurs.terracottaLight}>
                {libelleCategorieProjet(projet.categorie)}
                {typeLabel ? ` · ${typeLabel}` : ""}
              </Texte>
            </View>
          </View>

          <Texte variante="titre2" poids="extrabold" style={{ marginTop: 12 }}>
            {projet.nom}
          </Texte>

          {projet.description && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 8, lineHeight: 20 }}>
              {projet.description}
            </Texte>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
            {projet.lieu_evenement && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={14} color={couleurs.terracottaLight} />
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {projet.lieu_evenement}
                </Texte>
              </View>
            )}
            {projet.date_realisation && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="flag-outline" size={14} color={couleurs.terracottaLight} />
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  Réalisation : {formatDateCourte(projet.date_realisation)}
                </Texte>
              </View>
            )}
            {projet.date_debut && (
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {formatDateCourte(projet.date_debut)} à {formatDateCourte(projet.date_fin)}
              </Texte>
            )}
          </View>

          {/* Avancement global */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Préparation du répertoire
              </Texte>
              <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                {avancementMoyen}%
              </Texte>
            </View>
            <View style={{ marginTop: 6, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <View
                style={{
                  width: `${avancementMoyen}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: couleurs.warmGold,
                }}
              />
            </View>
          </View>
        </View>

        <AlerteErreur message={erreur} />

        {/* Répertoire */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Texte poids="extrabold" variante="titre3">
                Répertoire
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {morceaux.length} morceau{morceaux.length > 1 ? "x" : ""}
              </Texte>
            </View>
            {estGestionnaire && !modeAjout && (
              <BoutonAjout onPress={() => setModeAjout(true)} />
            )}
          </View>

          {modeAjout && estGestionnaire && (
            <View style={{ gap: 10, marginTop: 12 }}>
              <Champ
                placeholder="Titre du morceau *"
                value={titreMorceau}
                onChangeText={setTitreMorceau}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Champ
                  placeholder="Tonalité (ex : Do majeur)"
                  value={tonaliteMorceau}
                  onChangeText={setTonaliteMorceau}
                  style={{ flex: 1 }}
                />
                <Champ
                  placeholder="Tempo (BPM)"
                  value={tempoMorceau}
                  onChangeText={setTempoMorceau}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Bouton
                  titre="Ajouter"
                  chargement={ajouterMorceau.isPending}
                  onPress={ajouter}
                  style={{ paddingHorizontal: 36 }}
                />
                <Bouton
                  variante="secondaire"
                  titre="Annuler"
                  onPress={() => setModeAjout(false)}
                  style={{ paddingHorizontal: 36 }}
                />
              </View>
            </View>
          )}

          <View style={{ gap: 8, marginTop: 12 }}>
            {morceaux.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Aucun morceau dans le répertoire.
              </Texte>
            ) : (
              morceaux.map((morceau, index) => (
                <CarteMorceau
                  key={morceau.id}
                  projetId={id}
                  morceau={morceau}
                  index={index}
                  estGestionnaire={estGestionnaire}
                  onSupprimer={() => supprimerMorceauProjet(morceau.id)}
                />
              ))
            )}
          </View>
        </View>

        {/* Répétitions liées */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Texte poids="extrabold" variante="titre3">
              Répétitions liées
            </Texte>
            {estGestionnaire && (
              <BoutonAjout onPress={() => setModeAjoutSeance(true)} />
            )}
          </View>
          <View style={{ gap: 8, marginTop: 12 }}>
            {seances.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Aucune répétition rattachée à ce projet.
              </Texte>
            ) : (
              seances.map((seance) => (
                <Pressable
                  key={seance.id}
                  onPress={() =>
                    seance.groupe_id
                      ? router.push(`/groupes/${seance.groupe_id}/seances/${seance.id}`)
                      : router.push(`/seances/${seance.id}`)
                  }
                  style={{
                    borderRadius: rayons.md,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={couleurs.terracottaLight} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Texte variante="petit" poids="semibold">
                      {seance.titre ?? "Répétition"}
                    </Texte>
                    <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                      {formatDateCourte(seance.date_seance)} · {seance.heure_debut.slice(0, 5)}
                    </Texte>
                  </View>
                  <Texte variante="micro" couleur={couleurs.muted}>
                    {libelleStatutSeance(seance.statut)}
                  </Texte>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Tâches */}
        <View style={{ marginTop: 24, paddingBottom: 60 }}>
          <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
            Tâches
          </Texte>
          <OngletTaches
            projetId={id}
            groupeId={projet.groupe_id}
            estGestionnaire={estGestionnaire}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <ModalCreerSeance
        visible={modeAjoutSeance}
        groupeId={projet.groupe_id}
        projetId={id}
        onFermer={() => setModeAjoutSeance(false)}
      />

      <Modal
        visible={modeEditionProjet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModeEditionProjet(false)}
      >
        <Ecran>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <FormulaireProjet
              projet={projet}
              groupeId={projet.groupe_id}
              onAnnuler={() => setModeEditionProjet(false)}
            />
          </ScrollView>
        </Ecran>
      </Modal>
    </Ecran>
  );
}

type Morceau = Database["public"]["Tables"]["repertoire"]["Row"];

/**
 * Carte morceau du répertoire : progression modifiable via un slider.
 * Icône edit → mode édition (slider défilable) → icône save → enregistre et rafraîchit.
 */
function CarteMorceau({
  projetId,
  morceau,
  index,
  estGestionnaire,
  onSupprimer,
}: {
  projetId: string;
  morceau: Morceau;
  index: number;
  estGestionnaire: boolean;
  onSupprimer: () => void;
}) {
  const majAvancement = useMajAvancement();
  const dialogue = useDialogue();
  const [modeEdition, setModeEdition] = useState(false);
  const [avancementLocal, setAvancementLocal] = useState(morceau.avancement ?? 0);

  async function enregistrer() {
    try {
      await majAvancement.mutateAsync({
        projetId,
        morceauId: morceau.id,
        avancement: avancementLocal,
      });
      setModeEdition(false);
    } catch {
      dialogue.erreur("Impossible de mettre à jour l'avancement.");
    }
  }

  function entrerEdition() {
    setAvancementLocal(morceau.avancement ?? 0);
    setModeEdition(true);
  }

  const details = [morceau.tonalite, morceau.tempo ? `${morceau.tempo} BPM` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View
      style={{
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Texte poids="extrabold" couleur={couleurs.muted} style={{ width: 22, textAlign: "center" }}>
          {index + 1}
        </Texte>
        <View style={{ flex: 1 }}>
          <Texte variante="petit" poids="semibold">
            {morceau.titre_morceau}
          </Texte>
          {details && (
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {details}
            </Texte>
          )}
        </View>
        {estGestionnaire && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={modeEdition ? "Enregistrer l'avancement" : "Modifier l'avancement"}
            hitSlop={8}
            disabled={majAvancement.isPending}
            onPress={modeEdition ? enregistrer : entrerEdition}
            style={{ opacity: majAvancement.isPending ? 0.5 : 1 }}
          >
            <Ionicons
              name={modeEdition ? "save-outline" : "create-outline"}
              size={18}
              color={modeEdition ? couleurs.warmGold : couleurs.texteSecondaire}
            />
          </Pressable>
        )}
        {estGestionnaire && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Supprimer le morceau"
            hitSlop={8}
            onPress={onSupprimer}
          >
            <Ionicons name="trash-outline" size={16} color={couleurs.danger} />
          </Pressable>
        )}
      </View>

      {/* Avancement */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
        {modeEdition ? (
          <Slider
            style={{ flex: 1, height: 36 }}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={avancementLocal}
            onValueChange={setAvancementLocal}
            minimumTrackTintColor={couleurs.warmGold}
            maximumTrackTintColor="rgba(255,255,255,0.12)"
            thumbTintColor={couleurs.warmGold}
          />
        ) : (
          <View
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${morceau.avancement ?? 0}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: couleurs.warmGold,
              }}
            />
          </View>
        )}
        <Texte
          variante="micro"
          poids="bold"
          couleur={modeEdition ? couleurs.warmGold : couleurs.muted}
          style={{ width: 40, textAlign: "right", fontVariant: ["tabular-nums"] }}
        >
          {modeEdition ? avancementLocal : morceau.avancement ?? 0}%
        </Texte>
      </View>
    </View>
  );
}
