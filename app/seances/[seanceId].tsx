import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useAjouterEnregistrement,
  useAjouterMorceauSetlist,
  useAjouterNote,
  useEnregistrementsSeance,
  useMettreAJourSeance,
  useNotesSeance,
  useSeance,
  useSetlistSeance,
  useSupprimerEnregistrement,
  useSupprimerMorceauSetlist,
  useSupprimerNote,
} from "@/lib/queries/seances";
import { useLecteurAudio } from "@/lib/audio-context";
import { useSession } from "@/lib/session";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";
import { Avatar } from "@/components/ui/avatar";
import { ModalEnregistrement } from "@/components/ui/modal-enregistrement";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { BoutonAjout } from "@/components/ui/bouton-ajout";
import { formatDateCourte, libelleStatutSeance } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";
import { televerserFichier } from "@/lib/r2";

/** Page détail d'une répétition personnelle (projet solo). */
export default function DetailSeancePersonnelle() {
  const { seanceId } = useLocalSearchParams<{ seanceId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const dialogue = useDialogue();

  const { data: seance, isLoading: chargement } = useSeance(seanceId);
  const { data: setlist = [] } = useSetlistSeance(seanceId);
  const { data: enregistrements = [] } = useEnregistrementsSeance(seanceId);
  const { data: notes = [] } = useNotesSeance(seanceId);

  const mettreAJourSeance = useMettreAJourSeance();
  const ajouterSetlist = useAjouterMorceauSetlist();
  const supprimerSetlist = useSupprimerMorceauSetlist();
  const ajouterEnregistrement = useAjouterEnregistrement();
  const supprimerEnregistrement = useSupprimerEnregistrement();
  const ajouterNote = useAjouterNote();
  const supprimerNote = useSupprimerNote();

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
  const [modeEnregistrement, setModeEnregistrement] = useState(false);

  if (chargement || !seance) {
    return (
      <Ecran>
        <View style={{ padding: 20 }}>
          <SqueletteListe lignes={2} hauteur={140} />
        </View>
      </Ecran>
    );
  }

  const estProprietaire = !!session?.user && session.user.id === seance.user_id;
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
      await ajouterEnregistrement.mutateAsync({ seanceId, url: key, titre: fichier.name });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de déposer l'enregistrement.");
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

  async function supprimerMorceauProgramme(itemId: string) {
    const ok = await dialogue.confirmer({
      titre: "Retirer ce morceau ?",
      message: "Le morceau sera retiré du programme.",
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
      titre: "Supprimer l'enregistrement ?",
      message: "L'enregistrement et son fichier audio seront définitivement supprimés.",
    });
    if (!ok) return;
    try {
      await supprimerEnregistrement.mutateAsync({ seanceId, id });
      dialogue.succes("Enregistrement supprimé.");
    } catch {
      dialogue.erreur("Impossible de supprimer l'enregistrement.");
    }
  }

  async function enregistrerCompteRendu() {
    setErreur(null);
    setSauvegardeCR(true);
    try {
      await mettreAJourSeance.mutateAsync({
        seanceId,
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
                {seance.titre ?? "Répétition"}
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Répétition personnelle
              </Texte>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <AlerteErreur message={erreur} />
          </View>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {formatDateCourte(seance.date_seance)} · {seance.heure_debut.slice(0, 5)} à{" "}
                {seance.heure_fin.slice(0, 5)}
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

            {seance.projet && (
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
              </View>
            )}
          </View>

          {/* Contrôles statut */}
          {estProprietaire && !estTerminee && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              {seance.statut === "planifiee" && (
                <Bouton
                  titre="Démarrer"
                  onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId: null, modifications: { statut: "en_cours" } })}
                  style={{ flex: 1 }}
                />
              )}
              {seance.statut === "en_cours" && (
                <Bouton
                  titre="Terminer"
                  onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId: null, modifications: { statut: "terminee" } })}
                  style={{ flex: 1 }}
                />
              )}
              <Bouton
                variante="danger"
                titre="Annuler"
                onPress={() => mettreAJourSeance.mutate({ seanceId, groupeId: null, modifications: { statut: "annulee" } })}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {/* Programme */}
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
                      const details = [tonalite, tempo ? `${tempo} BPM` : null]
                        .filter(Boolean)
                        .join(" · ");
                      return details ? (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {details}
                        </Texte>
                      ) : null;
                    })()}
                  </View>
                  {estProprietaire && (
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
              {estProprietaire && modeSetlist ? (
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
              ) : estProprietaire ? (
                <BoutonAjout titre="+ Morceau" onPress={() => setModeSetlist(true)} />
              ) : null}
            </View>
          </Section>

          {/* Enregistrements */}
          <Section titre="Enregistrements">
            {estProprietaire && (
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
            )}
            <View style={{ gap: 8 }}>
              {enregistrements.length === 0 ? (
                <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                  Aucun enregistrement pour cette répétition.
                </Texte>
              ) : (
                enregistrements.map((enregistrement) => (
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
                        {enregistrement.titre ?? "Enregistrement"}
                      </Texte>
                      {enregistrement.uploader && (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          Par {enregistrement.uploader.prenom} {enregistrement.uploader.nom}
                        </Texte>
                      )}
                    </View>
                    <BoutonEcouter
                      cle={enregistrement.url}
                      titre={enregistrement.titre ?? "Enregistrement"}
                      sousTitre="Enregistrement de la répétition"
                      imageCle={seance.projet?.affiche_url}
                    />
                    {estProprietaire && (
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
            {estProprietaire && (
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
                      <Avatar
                        prenom={note.user?.prenom}
                        nom={note.user?.nom}
                        url={note.user?.avatar_url}
                        taille={28}
                      />
                      <Texte variante="micro" poids="semibold" style={{ flex: 1 }}>
                        {note.user?.prenom} {note.user?.nom}
                      </Texte>
                      {note.timestamp_secondes != null && (
                        <View
                          style={{
                            borderRadius: rayons.pill,
                            backgroundColor: "rgba(251,191,36,0.14)",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                            {note.timestamp_secondes}s
                          </Texte>
                        </View>
                      )}
                      {estProprietaire && (
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
                          imageCle={seance.projet?.affiche_url}
                        />
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </Section>

          {/* Compte-rendu */}
          <Section titre="Compte-rendu">
            {estProprietaire ? (
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
                Le compte-rendu sera publié ici après la séance.
              </Texte>
            )}
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalEnregistrement
        visible={modeEnregistrement}
        onFermer={() => setModeEnregistrement(false)}
        dossier="seances/enregistrements"
        onAjouter={(url, titre) => ajouterEnregistrement.mutate({ seanceId, url, titre })}
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
function BoutonEcouter({
  cle,
  titre,
  sousTitre,
  imageCle,
}: {
  cle: string;
  titre: string;
  sousTitre?: string;
  imageCle?: string | null;
}) {
  const { ouvrirPiste } = useLecteurAudio();
  return (
    <Pressable
      onPress={() => ouvrirPiste({ cle, titre, sousTitre, imageCle })}
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
