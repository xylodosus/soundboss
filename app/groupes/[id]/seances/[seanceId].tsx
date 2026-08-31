import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useAjouterEnregistrement,
  useAjouterMorceauSetlist,
  useAjouterNote,
  useEcoutesEnregistrement,
  useEnregistrementsSeance,
  useLierProjetSeance,
  useMettreAJourPresence,
  useMettreAJourSeance,
  useNotesSeance,
  usePresencesSeance,
  useSeance,
  useSetlistSeance,
  useSupprimerEnregistrement,
  useSupprimerMorceauSetlist,
  useSupprimerNote,
} from "@/lib/queries/seances";
import { useGroupe, useMembresGroupe, usePupitresGroupe } from "@/lib/queries/groupes";
import { useProjetsGroupe } from "@/lib/queries/projets";
import { televerserFichier } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";
import { Avatar } from "@/components/ui/avatar";
import { useLecteurAudio } from "@/lib/audio-context";
import { useDialogue } from "@/lib/dialogue";
import { ModalEnregistrement } from "@/components/ui/modal-enregistrement";
import { ModalChoix } from "@/components/ui/modal-choix";
import { ModalChoixMultiple } from "@/components/ui/modal-choix-multiple";
import { ModalEcoutes } from "@/components/groupe/modal-ecoutes";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { BoutonAjout } from "@/components/ui/bouton-ajout";
import { formatDateCourte, libelleCategorieProjet, libelleStatutSeance } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";

const STATUTS_PRESENCE = [
  { statut: "present", label: "Présent", icone: "checkmark-circle", couleur: "#34D399" },
  { statut: "retard", label: "En retard", icone: "time", couleur: couleurs.warmGold },
  { statut: "excuse", label: "Excusé", icone: "shield-checkmark", couleur: couleurs.texte },
  { statut: "absent", label: "Absent", icone: "close-circle", couleur: couleurs.danger },
] as const;

export default function DetailSeance() {
  const { id: groupeId, seanceId } = useLocalSearchParams<{ id: string; seanceId: string }>();
  const router = useRouter();

  const { data: seance, isLoading: chargement } = useSeance(seanceId);
  const { data: groupe } = useGroupe(groupeId);
  const { data: membres = [] } = useMembresGroupe(groupeId);
  const { data: projetsGroupe = [] } = useProjetsGroupe(groupeId);
  const { data: presences = [] } = usePresencesSeance(seanceId);
  const { data: setlist = [] } = useSetlistSeance(seanceId);
  const { data: enregistrements = [] } = useEnregistrementsSeance(seanceId);
  const { data: pupitres = [] } = usePupitresGroupe(groupeId);
  const nomsPupitres = new Map(pupitres.map((p) => [p.id, p]));
  // Filtre d'affichage seulement : il ne décide de rien à l'envoi.
  const [filtrePupitre, setFiltrePupitre] = useState<string | null>(null);
  const [choixFiltre, setChoixFiltre] = useState(false);
  /**
   * Audio téléversé mais pas encore enregistré en base : l'attribution se fait
   * juste après le dépôt, au moment où l'on sait de quel audio il s'agit.
   */
  const [audioEnAttente, setAudioEnAttente] = useState<{
    url: string;
    titre?: string | null;
    dureeSecondes?: number | null;
  } | null>(null);

  // Un audio adressé à tout le groupe concerne aussi chaque pupitre : il reste
  // visible sous n'importe quel filtre, sans quoi un membre filtrant sur le
  // sien croirait n'avoir rien reçu d'autre.
  const audiosAffiches = filtrePupitre
    ? enregistrements.filter(
        (e) =>
          (e.pupitre_ids ?? []).length === 0 || (e.pupitre_ids ?? []).includes(filtrePupitre)
      )
    : enregistrements;
  // Audio dont on consulte le détail des écoutes. Une seule modale pour toute
  // la liste, plutôt qu'une par ligne.
  const [ecoutesAudio, setEcoutesAudio] = useState<{ id: string; titre: string | null } | null>(null);
  const { data: notes = [] } = useNotesSeance(seanceId);

  const mettreAJourPresence = useMettreAJourPresence();
  const mettreAJourSeance = useMettreAJourSeance();
  const lier = useLierProjetSeance();
  const ajouterSetlist = useAjouterMorceauSetlist();
  const supprimerSetlist = useSupprimerMorceauSetlist();
  const ajouterEnregistrement = useAjouterEnregistrement();
  const supprimerEnregistrement = useSupprimerEnregistrement();
  const ajouterNote = useAjouterNote();
  const supprimerNote = useSupprimerNote();
  const dialogue = useDialogue();

  const [erreur, setErreur] = useState<string | null>(null);
  const [modeSetlist, setModeSetlist] = useState(false);
  const [titreSetlist, setTitreSetlist] = useState("");
  const [tonaliteSetlist, setTonaliteSetlist] = useState("");
  const [tempoSetlist, setTempoSetlist] = useState("");
  const [texteNote, setTexteNote] = useState("");
  const [envoiAudio, setEnvoiAudio] = useState(false);
  const [compteRendu, setCompteRendu] = useState("");
  const [sauvegardeCR, setSauvegardeCR] = useState(false);
  const [crSauvegarde, setCrSauvegarde] = useState(false);
  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const [modeEnregistrement, setModeEnregistrement] = useState(false);
  const [modeLierProjet, setModeLierProjet] = useState(false);

  const estGestionnaire = groupe?.monRole === "chef" || groupe?.monRole === "admin";

  if (chargement || !seance) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <SqueletteListe lignes={2} hauteur={140} />
        </View>
      </Ecran>
    );
  }

  const membresActifs = membres.filter((m) => m.statut === "actif");
  const presenceParMembre = new Map(presences.map((p) => [p.membre_id, p]));

  const compteurs = { present: 0, absent: 0, retard: 0, excuse: 0, en_attente: 0 };
  for (const membre of membresActifs) {
    const statut = presenceParMembre.get(membre.id)?.statut ?? "en_attente";
    if (statut in compteurs) compteurs[statut as keyof typeof compteurs]++;
  }

  const estTerminee = seance.statut === "terminee" || seance.statut === "annulee";

  async function ajouterAuSetlist() {
    setErreur(null);
    if (!titreSetlist.trim()) return;
    const tempo = parseInt(tempoSetlist, 10);
    try {
      await ajouterSetlist.mutateAsync({
        seanceId,
        titre: titreSetlist.trim(),
        tonalite: tonaliteSetlist.trim() || null,
        tempo: Number.isFinite(tempo) && tempo > 0 ? tempo : null,
      });
      setTitreSetlist("");
      setTonaliteSetlist("");
      setTempoSetlist("");
      setModeSetlist(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ajouter au programme.");
    }
  }

  async function deposerAudio() {
    setErreur(null);
    const resultat = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    const fichier = resultat.assets[0];
    setEnvoiAudio(true);
    try {
      const { key } = await televerserFichier(
        {
          uri: fichier.uri,
          name: fichier.name,
          type: fichier.mimeType ?? "audio/mpeg",
        },
        "seances/enregistrements"
      );
      setAudioEnAttente({ url: key, titre: fichier.name });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de déposer l'audio.");
    } finally {
      setEnvoiAudio(false);
    }
  }

  async function ajouterNoteTexte() {
    setErreur(null);
    if (!texteNote.trim()) return;
    try {
      await ajouterNote.mutateAsync({ seanceId, type: "texte", contenu: texteNote.trim() });
      setTexteNote("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ajouter la note.");
    }
  }

  async function supprimerMorceauProgramme(itemId: string) {
    const ok = await dialogue.confirmer({
      titre: "Retirer ce morceau ?",
      message: "Le morceau sera retiré du programme de la répétition.",
      boutonConfirmer: "Retirer",
    });
    if (!ok) return;
    try {
      await supprimerSetlist.mutateAsync({ seanceId, itemId });
      dialogue.succes("Morceau retiré du programme.");
    } catch {
      dialogue.erreur("Impossible de retirer le morceau du programme.");
    }
  }

  async function supprimerEnregistrementSeance(id: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer cet audio ?",
      message: "L'audio sera définitivement supprimé.",
    });
    if (!ok) return;
    try {
      await supprimerEnregistrement.mutateAsync({ seanceId, id });
      dialogue.succes("Audio supprimé.");
    } catch {
      dialogue.erreur("Impossible de supprimer l'audio.");
    }
  }

  async function supprimerNoteSeance(noteId: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer cette note ?",
      message: "La note sera définitivement supprimée.",
    });
    if (!ok) return;
    try {
      await supprimerNote.mutateAsync({ seanceId, noteId });
      dialogue.succes("Note supprimée.");
    } catch {
      dialogue.erreur("Impossible de supprimer la note.");
    }
  }

  async function lierProjet(projetId: string) {
    setModeLierProjet(false);
    try {
      await lier.mutateAsync({
        seanceId,
        projetId,
        ancienProjetId: seance?.projet?.id ?? null,
      });
      dialogue.succes("Répétition liée au projet.");
    } catch {
      dialogue.erreur("Impossible de lier la répétition au projet.");
    }
  }

  async function delierProjet() {
    const ok = await dialogue.confirmer({
      titre: "Délier ce projet ?",
      message: "La répétition ne sera plus associée à ce projet.",
      boutonConfirmer: "Délier",
    });
    if (!ok) return;
    try {
      await lier.mutateAsync({
        seanceId,
        projetId: null,
        ancienProjetId: seance?.projet?.id ?? null,
      });
      dialogue.succes("Répétition déliée du projet.");
    } catch {
      dialogue.erreur("Impossible de délier la répétition.");
    }
  }

  async function enregistrerCompteRendu() {
    setErreur(null);
    setSauvegardeCR(true);
    try {
      await mettreAJourSeance.mutateAsync({
        seanceId,
        groupeId,
        modifications: { compte_rendu: compteRendu.trim() || null },
      });
      setCrSauvegarde(true);
      setTimeout(() => setCrSauvegarde(false), 2000);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer le compte-rendu.");
    } finally {
      setSauvegardeCR(false);
    }
  }

  return (
    <Ecran>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.surfaceCarte }}
          >
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Texte variante="titre3" poids="extrabold">
              {seance.titre ?? "Répétition"}
            </Texte>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {formatDateCourte(seance.date_seance)} · {seance.heure_debut.slice(0, 5)} à {seance.heure_fin.slice(0, 5)}
                {seance.lieu ? ` · ${seance.lieu}` : ""}
              </Texte>
              <View
                style={{
                  borderRadius: rayons.pill,
                  backgroundColor: "rgba(251,191,36,0.14)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                  {libelleStatutSeance(seance.statut)}
                </Texte>
              </View>
            </View>
            {seance.projet ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={() => seance.projet && router.push(`/projets/${seance.projet.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Voir le projet lié"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: rayons.pill,
                    backgroundColor: "rgba(224,122,86,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(224,122,86,0.35)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="folder-open-outline" size={12} color={couleurs.terracottaLight} />
                  <Texte
                    variante="micro"
                    poids="bold"
                    couleur={couleurs.terracottaLight}
                    numberOfLines={1}
                    style={{ maxWidth: 180 }}
                  >
                    {seance.projet.nom}
                  </Texte>
                </Pressable>
                {estGestionnaire && (
                  <Pressable
                    onPress={delierProjet}
                    accessibilityRole="button"
                    accessibilityLabel="Délier le projet"
                    hitSlop={8}
                    style={{ padding: 2 }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={couleurs.texteSecondaire} />
                  </Pressable>
                )}
              </View>
            ) : estGestionnaire ? (
              <Pressable
                onPress={() => setModeLierProjet(true)}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  alignSelf: "flex-start",
                  borderRadius: rayons.pill,
                  backgroundColor: "rgba(251,191,36,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(251,191,36,0.35)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginTop: 8,
                }}
              >
                <Ionicons name="link-outline" size={13} color={couleurs.warmGold} />
                <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                  Lier à un projet
                </Texte>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <AlerteErreur message={erreur} />
        </View>

        {/* Contrôles statut chef */}
        {estGestionnaire && !estTerminee && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {seance.statut === "planifiee" && (
              <Bouton
                titre="Démarrer"
                onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId, modifications: { statut: "en_cours" } })}
                style={{ flex: 1 }}
              />
            )}
            {seance.statut === "en_cours" && (
              <Bouton
                titre="Terminer"
                onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId, modifications: { statut: "terminee" } })}
                style={{ flex: 1 }}
              />
            )}
            <Bouton
              variante="danger"
              titre="Annuler"
              onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId, modifications: { statut: "annulee" } })}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Setlist */}
        <Section titre="Programme (setlist)">
          <View style={{ gap: 8 }}>
            {setlist.length === 0 && !modeSetlist && (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Aucun morceau au programme.
              </Texte>
            )}
            {setlist.map((item, index) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  padding: 12,
                }}
              >
                <Texte poids="extrabold" couleur={couleurs.muted} style={{ width: 24, textAlign: "center" }}>
                  {index + 1}
                </Texte>
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold" numberOfLines={1}>
                    {item.repertoire ? item.repertoire.titre_morceau : item.titre}
                  </Texte>
                  {(() => {
                    const tonalite = item.tonalite ?? item.repertoire?.tonalite;
                    const tempo = item.tempo ?? item.repertoire?.tempo;
                    const details = [tonalite, tempo ? `${tempo} BPM` : null].filter(Boolean).join(" · ");
                    return details ? (
                      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                        {details}
                      </Texte>
                    ) : null;
                  })()}
                </View>
                {estGestionnaire && (
                  <Pressable
                    onPress={() => supprimerMorceauProgramme(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer du programme"
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={couleurs.danger} />
                  </Pressable>
                )}
              </View>
            ))}
            {estGestionnaire && modeSetlist ? (
              <View style={{ gap: 12, marginTop: 8 }}>
                <Champ
                  placeholder="Titre du morceau"
                  value={titreSetlist}
                  onChangeText={setTitreSetlist}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Champ
                    placeholder="Tonalité (ex : Do majeur)"
                    value={tonaliteSetlist}
                    onChangeText={setTonaliteSetlist}
                    style={{ flex: 1 }}
                  />
                  <Champ
                    placeholder="Tempo (BPM)"
                    value={tempoSetlist}
                    onChangeText={setTempoSetlist}
                    keyboardType="number-pad"
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Bouton
                    titre="Ajouter"
                    chargement={ajouterSetlist.isPending}
                    onPress={ajouterAuSetlist}
                    style={{ paddingHorizontal: 36 }}
                  />
                  <Bouton
                    variante="secondaire"
                    titre="Annuler"
                    onPress={() => setModeSetlist(false)}
                    style={{ paddingHorizontal: 36 }}
                  />
                </View>
              </View>
            ) : estGestionnaire ? (
              <BoutonAjout titre="+ Morceau" onPress={() => setModeSetlist(true)} />
            ) : null}
          </View>
        </Section>

        {/* Audios */}
        <Section titre="Audios">
          {pupitres.length > 0 && (
            <Pressable
              onPress={() => setChoixFiltre(true)}
              accessibilityRole="button"
              accessibilityLabel="Filtrer les audios par pupitre"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="filter-outline" size={16} color={couleurs.texteSecondaire} />
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Pupitre :{" "}
                <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                  {nomsPupitres.get(filtrePupitre ?? "")?.nom ?? "Tous"}
                </Texte>
              </Texte>
              <Ionicons name="chevron-down" size={14} color={couleurs.texteSecondaire} />
            </Pressable>
          )}
          {estGestionnaire && (
            <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Bouton
                variante="secondaire"
                titre={envoiAudio ? "Envoi…" : "Importer"}
                chargement={envoiAudio}
                onPress={deposerAudio}
                style={{ flex: 1 }}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={couleurs.cream} />
              </Bouton>
              <Bouton
                variante="secondaire"
                titre="Enregistrer"
                onPress={() => setModeEnregistrement(true)}
                style={{ flex: 1 }}
              >
                <Ionicons name="mic" size={18} color={couleurs.cream} />
              </Bouton>
            </View>
            </>
          )}
          <View style={{ gap: 8 }}>
            {audiosAffiches.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                {filtrePupitre
                  ? "Aucun audio pour ce pupitre."
                  : "Aucun audio pour cette répétition."}
              </Texte>
            ) : (
              audiosAffiches.map((enregistrement) => (
                <View
                  key={enregistrement.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: rayons.md,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    padding: 12,
                  }}
                >
                  <Ionicons name="musical-note-outline" size={20} color={couleurs.warmGold} />
                  <View style={{ flex: 1 }}>
                    <Texte variante="petit" poids="semibold" numberOfLines={1}>
                      {enregistrement.titre ?? "Audio"}
                    </Texte>
                    {enregistrement.uploader && (
                      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                        Par {enregistrement.uploader.prenom} {enregistrement.uploader.nom}
                      </Texte>
                    )}
                    {/* Aucun badge quand l'audio s'adresse à tout le groupe :
                        c'est le cas courant, l'étiqueter alourdirait la liste. */}
                    {(enregistrement.pupitre_ids ?? []).length > 0 && (
                      <View
                        style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}
                      >
                        {(enregistrement.pupitre_ids ?? []).map((pid) => {
                          const pupitre = nomsPupitres.get(pid);
                          const teinte = pupitre?.couleur ?? couleurs.warmGold;
                          return (
                            <View
                              key={pid}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: rayons.pill,
                                backgroundColor: teinte + "26",
                              }}
                            >
                              <Texte variante="micro" poids="bold" couleur={teinte}>
                                {pupitre?.nom ?? "Pupitre"}
                              </Texte>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {estGestionnaire && (
                      <CompteurEcoutes
                        enregistrementId={enregistrement.id}
                        onOuvrir={() =>
                          setEcoutesAudio({ id: enregistrement.id, titre: enregistrement.titre })
                        }
                      />
                    )}
                  </View>
                  <BoutonEcouter
                    cle={enregistrement.url}
                    titre={enregistrement.titre ?? "Audio"}
                    sousTitre="Audio de la répétition"
                    enregistrementId={enregistrement.id}
                    imageCle={seance.projet?.affiche_url ?? seance.groupe?.photo_url}
                  />
                  {estGestionnaire && (
                    <Pressable
                      onPress={() => supprimerEnregistrementSeance(enregistrement.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer l'enregistrement"
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color={couleurs.danger} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        </Section>

        {/* Notes */}
        <Section titre="Notes">
          {estGestionnaire && (
            <View style={{ gap: 12, marginBottom: 16 }}>
              <Champ
                multiline
                placeholder="Consigne, passage à retravailler…"
                value={texteNote}
                onChangeText={setTexteNote}
                style={{ minHeight: 64, textAlignVertical: "top" }}
              />
              <Bouton titre="Ajouter la note" onPress={ajouterNoteTexte} disabled={!texteNote.trim()} />
            </View>
          )}
          <View style={{ gap: 8 }}>
            {notes.length === 0 ? (
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Aucune note pour l&apos;instant.
              </Texte>
            ) : (
              notes.map((note) => (
                <View
                  key={note.id}
                  style={{
                    borderRadius: rayons.md,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Avatar prenom={note.user?.prenom} nom={note.user?.nom} url={note.user?.avatar_url} taille={28} />
                    <Texte variante="micro" poids="semibold" style={{ flex: 1 }}>
                      {note.user?.prenom} {note.user?.nom}
                    </Texte>
                    {note.timestamp_secondes != null && (
                      <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(251,191,36,0.14)", paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                          {note.timestamp_secondes}s
                        </Texte>
                      </View>
                    )}
                    {estGestionnaire && (
                      <Pressable
                        onPress={() => supprimerNoteSeance(note.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer la note"
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={15} color={couleurs.danger} />
                      </Pressable>
                    )}
                  </View>
                  {note.contenu && (
                    <Texte variante="petit" style={{ marginTop: 8, lineHeight: 20 }}>
                      {note.contenu}
                    </Texte>
                  )}
                  {note.type === "audio" && note.audio_url && (
                    <View style={{ marginTop: 8 }}>
                      <BoutonEcouter
                        cle={note.audio_url}
                        titre="Note vocale"
                        sousTitre={`${note.user?.prenom ?? ""} ${note.user?.nom ?? ""}`.trim()}
                        imageCle={seance.projet?.affiche_url ?? seance.groupe?.photo_url}
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </Section>

        {/* Feuille de présence */}
        <Section titre="Feuille de présence">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <Texte variante="micro" poids="bold" couleur="#34D399">
              {compteurs.present} présents
            </Texte>
            <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
              {compteurs.retard} retards
            </Texte>
            <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire}>
              {compteurs.excuse} excusés
            </Texte>
            <Texte variante="micro" poids="bold" couleur={couleurs.danger}>
              {compteurs.absent} absents
            </Texte>
          </View>

          {membresActifs.length === 0 ? (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              Aucun membre actif dans le groupe.
            </Texte>
          ) : (
            <View style={{ gap: 8 }}>
              {membresActifs.map((membre) => {
                const statut = presenceParMembre.get(membre.id)?.statut ?? "en_attente";
                const statutInfo = STATUTS_PRESENCE.find((a) => a.statut === statut);
                const ligne = (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: rayons.md,
                      borderWidth: 1,
                      borderColor: couleurs.bordure,
                      backgroundColor: couleurs.surfaceCarte,
                      padding: 10,
                    }}
                  >
                    {/* Icône de statut choisie (à gauche) */}
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: statutInfo
                          ? `${statutInfo.couleur}22`
                          : "rgba(255,255,255,0.06)",
                      }}
                    >
                      {statutInfo ? (
                        <Ionicons name={statutInfo.icone} size={18} color={statutInfo.couleur} />
                      ) : (
                        <Ionicons name="help-outline" size={16} color={couleurs.texteSecondaire} />
                      )}
                    </View>
                    <Avatar
                      prenom={membre.user?.prenom}
                      nom={membre.user?.nom}
                      url={membre.user?.avatar_url}
                      taille={34}
                    />
                    <View style={{ flex: 1 }}>
                      <Texte variante="petit" poids="semibold">
                        {membre.user?.prenom} {membre.user?.nom}
                      </Texte>
                      {membre.role && (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {membre.role.nom}
                        </Texte>
                      )}
                    </View>
                  </View>
                );
                return estGestionnaire ? (
                  <Swipeable
                    key={membre.id}
                    ref={(ref) => {
                      if (ref) swipeRefs.current.set(membre.id, ref);
                      else swipeRefs.current.delete(membre.id);
                    }}
                    renderRightActions={() => (
                      <View style={{ flexDirection: "row", gap: 8, marginLeft: 8 }}>
                        {STATUTS_PRESENCE.map((action) => (
                          <Pressable
                            key={action.statut}
                            onPress={() => {
                              mettreAJourPresence.mutate({
                                seanceId,
                                groupeId,
                                membreId: membre.id,
                                statut: action.statut,
                              });
                              swipeRefs.current.get(membre.id)?.close();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Marquer ${action.label.toLowerCase()}`}
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 16,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: `${action.couleur}22`,
                              borderWidth: 1,
                              borderColor: `${action.couleur}55`,
                            }}
                          >
                            <Ionicons name={action.icone} size={26} color={action.couleur} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    overshootRight={false}
                  >
                    {ligne}
                  </Swipeable>
                ) : (
                  <View key={membre.id}>{ligne}</View>
                );
              })}
              {estGestionnaire && (
                <Texte
                  variante="micro"
                  couleur={couleurs.texteFaible}
                  style={{ textAlign: "center", marginTop: 8 }}
                >
                  Glisse un membre vers la gauche pour marquer sa présence
                </Texte>
              )}
            </View>
          )}
        </Section>

        {/* Compte-rendu */}
        <Section titre="Compte-rendu">
          {estGestionnaire ? (
            <View style={{ gap: 12 }}>
              <Champ
                multiline
                placeholder="Morceaux travaillés, points à retenir, prochaine étape…"
                value={compteRendu}
                onChangeText={setCompteRendu}
                style={{ minHeight: 96, textAlignVertical: "top" }}
              />
              <Bouton
                titre={crSauvegarde ? "Enregistré !" : "Enregistrer le compte-rendu"}
                chargement={sauvegardeCR}
                disabled={!compteRendu.trim()}
                onPress={enregistrerCompteRendu}
              >
                {!crSauvegarde && <Ionicons name="save-outline" size={18} color={couleurs.charcoal} />}
              </Bouton>
            </View>
          ) : seance.compte_rendu ? (
            <Texte variante="petit" style={{ lineHeight: 20 }}>
              {seance.compte_rendu}
            </Texte>
          ) : (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              Le compte-rendu sera publié ici par le chef après la séance.
            </Texte>
          )}
        </Section>
      </ScrollView>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>

      <ModalEcoutes
        enregistrementId={ecoutesAudio?.id ?? null}
        titreAudio={ecoutesAudio?.titre}
        visible={!!ecoutesAudio}
        onFermer={() => setEcoutesAudio(null)}
      />

      <ModalChoix
        visible={choixFiltre}
        titre="Filtrer par pupitre"
        elements={[
          { id: "tous", titre: "Tous les audios", icone: "albums-outline" },
          ...pupitres.map((p) => ({
            id: p.id,
            titre: p.nom,
            icone: "musical-notes-outline" as const,
          })),
        ]}
        messageVide="Ce groupe n'a pas encore de pupitre."
        surChoisir={(idChoisi) => {
          setFiltrePupitre(idChoisi === "tous" ? null : idChoisi);
          setChoixFiltre(false);
        }}
        onFermer={() => setChoixFiltre(false)}
      />

      {/* Attribution au moment du dépôt : c'est là qu'on sait de quel audio il
          s'agit. Ne rien cocher signifie « tout le groupe ». */}
      <ModalChoixMultiple
        visible={!!audioEnAttente}
        titre="À qui s'adresse cet audio ?"
        sousTitre="Sans sélection, il sera visible de tout le groupe."
        libelleValider="Ajouter l'audio"
        messageVide="Ce groupe n'a pas encore de pupitre."
        elements={pupitres.map((p) => ({ id: p.id, titre: p.nom, couleur: p.couleur }))}
        surValider={(ids) => {
          const audio = audioEnAttente;
          setAudioEnAttente(null);
          if (!audio) return;
          ajouterEnregistrement.mutate({ seanceId, ...audio, pupitreIds: ids });
        }}
        onFermer={() => {
          // Le fichier est déjà téléversé : l'abandonner laisserait un orphelin
          // dans R2 et perdrait l'envoi. On applique la règle affichée —
          // aucune sélection vaut « tout le groupe ».
          const audio = audioEnAttente;
          setAudioEnAttente(null);
          if (audio) ajouterEnregistrement.mutate({ seanceId, ...audio, pupitreIds: [] });
        }}
      />

      <ModalEnregistrement
        visible={modeEnregistrement}
        onFermer={() => setModeEnregistrement(false)}
        dossier="seances/enregistrements"
        onAjouter={(url, titre, dureeSecondes) =>
          setAudioEnAttente({ url, titre, dureeSecondes })
        }
      />

      <ModalChoix
        visible={modeLierProjet}
        titre="Lier à un projet"
        elements={projetsGroupe.map((projet) => ({
          id: projet.id,
          titre: projet.nom,
          sousTitre: libelleCategorieProjet(projet.categorie),
          icone: "folder-open-outline" as const,
        }))}
        surChoisir={lierProjet}
        onFermer={() => setModeLierProjet(false)}
        messageVide="Aucun projet dans ce groupe."
      />
    </Ecran>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Texte poids="extrabold" variante="titre3" style={{ marginBottom: 12 }}>
        {titre}
      </Texte>
      {children}
    </View>
  );
}

/** Bouton « Écouter » : ouvre le lecteur audio global. */
/**
 * Nombre d'auditeurs d'un audio, réservé au chef et aux admins. La RLS ne
 * renvoie de toute façon que sa propre ligne à un simple membre : le compteur
 * n'aurait aucun sens ailleurs.
 */
function CompteurEcoutes({
  enregistrementId,
  onOuvrir,
}: {
  enregistrementId: string;
  onOuvrir: () => void;
}) {
  const { data: ecoutes = [] } = useEcoutesEnregistrement(enregistrementId, true);
  const total = ecoutes.reduce((somme, e) => somme + (e.nombre_ecoutes ?? 0), 0);

  if (total === 0) {
    return (
      <Texte variante="micro" couleur={couleurs.texteFaible} style={{ marginTop: 4 }}>
        Aucune écoute
      </Texte>
    );
  }

  return (
    <Pressable
      onPress={onOuvrir}
      accessibilityRole="button"
      accessibilityLabel="Voir le détail des écoutes"
      hitSlop={8}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
    >
      <Ionicons name="headset-outline" size={13} color={couleurs.warmGold} />
      <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
        {total} écoute{total > 1 ? "s" : ""}
      </Texte>
      <Ionicons name="chevron-forward" size={12} color={couleurs.texteSecondaire} />
    </Pressable>
  );
}

function BoutonEcouter({
  cle,
  titre,
  sousTitre,
  imageCle,
  enregistrementId,
}: {
  cle: string;
  titre: string;
  sousTitre?: string;
  imageCle?: string | null;
  /** Audio de répétition : active le comptage des écoutes. */
  enregistrementId?: string;
}) {
  const { ouvrirPiste } = useLecteurAudio();
  return (
    <Pressable
      onPress={() => ouvrirPiste({ cle, titre, sousTitre, imageCle, enregistrementId })}
      accessibilityRole="button"
      accessibilityLabel={`Écouter ${titre}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: rayons.pill,
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.35)",
        backgroundColor: "rgba(251,191,36,0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Ionicons name="play" size={14} color={couleurs.warmGold} />
      <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
        Écouter
      </Texte>
    </Pressable>
  );
}
