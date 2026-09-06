import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMembresGroupe, usePupitresGroupe } from "@/lib/queries/groupes";
import {
  useChangerStatutTache,
  useCreerTache,
  useModifierTache,
  useSupprimerTache,
  useTachesProjet,
  type DonneesTache,
  type PrioriteTache,
  type StatutTache,
  type TacheAvecAssignations,
} from "@/lib/queries/taches";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Avatar } from "@/components/ui/avatar";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ErreurChamp, Etiquette } from "@/components/ui/champ";
import {
  ChampDatePicker,
  chaineDepuisDate,
  dateDepuisChaine,
} from "@/components/ui/champ-date";
import { BoutonAjout } from "@/components/ui/bouton-ajout";

const STATUTS: { valeur: StatutTache; label: string }[] = [
  { valeur: "todo", label: "À faire" },
  { valeur: "en_cours", label: "En cours" },
  { valeur: "terminee", label: "Faite" },
];

const PRIORITES: { valeur: PrioriteTache; label: string; couleur: string }[] = [
  { valeur: "basse", label: "Basse", couleur: couleurs.muted },
  { valeur: "moyenne", label: "Moyenne", couleur: couleurs.warmGold },
  { valeur: "haute", label: "Haute", couleur: couleurs.terracottaLight },
  { valeur: "urgente", label: "Urgente", couleur: couleurs.danger },
];

function couleurPriorite(priorite: PrioriteTache | null): string {
  return PRIORITES.find((p) => p.valeur === priorite)?.couleur ?? couleurs.muted;
}

function libellePriorite(priorite: PrioriteTache | null): string {
  return PRIORITES.find((p) => p.valeur === priorite)?.label ?? "Moyenne";
}

/** Section Tâches d'un projet : progression, assignation, échéances, priorité. */
export function OngletTaches({
  titre,
  projetId,
  groupeId,
  estGestionnaire,
}: {
  /** Titre de section : rendu ici pour que le bouton d'ajout lui fasse face,
   *  plutôt qu'au compteur. Omis quand le composant sert d'onglet. */
  titre?: string;
  projetId: string;
  groupeId?: string | null;
  estGestionnaire: boolean;
}) {
  const { data: taches = [], isLoading } = useTachesProjet(projetId);
  const { data: membres = [] } = useMembresGroupe(groupeId ?? "");
  const { data: pupitres = [] } = usePupitresGroupe(groupeId ?? "");
  const creer = useCreerTache(projetId);
  const modifier = useModifierTache(projetId);
  const changerStatut = useChangerStatutTache(projetId);
  const supprimer = useSupprimerTache(projetId);
  const dialogue = useDialogue();

  const [modeFormulaire, setModeFormulaire] = useState(false);
  const [tacheEnEdition, setTacheEnEdition] = useState<TacheAvecAssignations | null>(null);

  const aujourdhui = new Date().toISOString().slice(0, 10);

  const membresActifs = membres.filter((m) => m.statut === "actif");

  function trier(liste: TacheAvecAssignations[]): TacheAvecAssignations[] {
    return [...liste].sort((a, b) => {
      const enRetardA = a.date_echeance && a.date_echeance < aujourdhui ? 0 : 1;
      const enRetardB = b.date_echeance && b.date_echeance < aujourdhui ? 0 : 1;
      if (enRetardA !== enRetardB) return enRetardA - enRetardB;
      if (a.date_echeance && b.date_echeance) return a.date_echeance.localeCompare(b.date_echeance);
      if (a.date_echeance) return -1;
      if (b.date_echeance) return 1;
      return 0;
    });
  }

  const groupes = {
    aFaire: trier(taches.filter((t) => t.statut === "todo")),
    enCours: trier(taches.filter((t) => t.statut === "en_cours")),
    terminees: trier(taches.filter((t) => t.statut === "terminee")),
  };

  async function envoyerForm(tache: DonneesTache) {
    try {
      if (tacheEnEdition) {
        await modifier.mutateAsync({ tacheId: tacheEnEdition.id, tache });
        dialogue.succes("Tâche modifiée.");
      } else {
        await creer.mutateAsync(tache);
        dialogue.succes("Tâche créée.");
      }
      setModeFormulaire(false);
      setTacheEnEdition(null);
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Impossible d'enregistrer la tâche.");
    }
  }

  async function changerStatutTache(tacheId: string, statut: StatutTache) {
    try {
      await changerStatut.mutateAsync({ tacheId, statut });
    } catch {
      dialogue.erreur("Impossible de mettre à jour la tâche.");
    }
  }

  async function supprimerTache(tacheId: string, titre: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer cette tâche ?",
      message: `« ${titre} » sera définitivement supprimée.`,
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync(tacheId);
      dialogue.succes("Tâche supprimée.");
    } catch {
      dialogue.erreur("Impossible de supprimer la tâche.");
    }
  }

  function ouvrirAjout() {
    setTacheEnEdition(null);
    setModeFormulaire(true);
  }

  function ouvrirEdition(tache: TacheAvecAssignations) {
    setTacheEnEdition(tache);
    setModeFormulaire(true);
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          {titre && (
            <Texte poids="extrabold" variante="titre3">
              {titre}
            </Texte>
          )}
          <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
            {taches.length} tâche{taches.length > 1 ? "s" : ""}
          </Texte>
        </View>
        {estGestionnaire && !modeFormulaire && (
          <BoutonAjout onPress={ouvrirAjout} />
        )}
      </View>

      <ModalTache
        visible={modeFormulaire && estGestionnaire}
        groupeId={groupeId}
        membres={membresActifs}
        pupitres={pupitres}
        chargement={creer.isPending || modifier.isPending}
        initiale={tacheEnEdition}
        surEnvoyer={envoyerForm}
        onFermer={() => {
          setModeFormulaire(false);
          setTacheEnEdition(null);
        }}
      />

      {isLoading ? (
        <SqueletteListe lignes={2} hauteur={72} />
      ) : taches.length === 0 ? (
        <EtatVide
          icone="checkmark-done-outline"
          titre="Aucune tâche"
          message={
            estGestionnaire
              ? "Note ici les courses, les répétitions à caler, les personnes à relancer."
              : "Aucune tâche n'a encore été notée pour ce projet."
          }
        />
      ) : (
        <View style={{ gap: 14 }}>
          {groupes.aFaire.length > 0 && (
            <GroupeTaches
              titre="À faire"
              couleur={couleurs.muted}
              taches={groupes.aFaire}
              estGestionnaire={estGestionnaire}
              aujourdhui={aujourdhui}
              surStatut={changerStatutTache}
              surEdition={ouvrirEdition}
              surSuppression={supprimerTache}
            />
          )}
          {groupes.enCours.length > 0 && (
            <GroupeTaches
              titre="En cours"
              couleur={couleurs.warmGold}
              taches={groupes.enCours}
              estGestionnaire={estGestionnaire}
              aujourdhui={aujourdhui}
              surStatut={changerStatutTache}
              surEdition={ouvrirEdition}
              surSuppression={supprimerTache}
            />
          )}
          {groupes.terminees.length > 0 && (
            <GroupeTaches
              titre="Terminées"
              couleur="#34D399"
              taches={groupes.terminees}
              estGestionnaire={estGestionnaire}
              aujourdhui={aujourdhui}
              surStatut={changerStatutTache}
              surEdition={ouvrirEdition}
              surSuppression={supprimerTache}
            />
          )}
        </View>
      )}
    </View>
  );
}

function GroupeTaches({
  titre,
  couleur,
  taches,
  estGestionnaire,
  aujourdhui,
  surStatut,
  surEdition,
  surSuppression,
}: {
  titre: string;
  couleur: string;
  taches: TacheAvecAssignations[];
  estGestionnaire: boolean;
  aujourdhui: string;
  surStatut: (tacheId: string, statut: StatutTache) => void;
  surEdition: (tache: TacheAvecAssignations) => void;
  surSuppression: (tacheId: string, titre: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Texte variante="micro" poids="bold" couleur={couleur} style={{ letterSpacing: 1 }}>
        {titre.toUpperCase()} · {taches.length}
      </Texte>
      {taches.map((tache) => (
        <CarteTache
          key={tache.id}
          tache={tache}
          estGestionnaire={estGestionnaire}
          aujourdhui={aujourdhui}
          surStatut={surStatut}
          surEdition={surEdition}
          surSuppression={surSuppression}
        />
      ))}
    </View>
  );
}

function CarteTache({
  tache,
  estGestionnaire,
  aujourdhui,
  surStatut,
  surEdition,
  surSuppression,
}: {
  tache: TacheAvecAssignations;
  estGestionnaire: boolean;
  aujourdhui: string;
  surStatut: (tacheId: string, statut: StatutTache) => void;
  surEdition: (tache: TacheAvecAssignations) => void;
  surSuppression: (tacheId: string, titre: string) => void;
}) {
  const terminee = tache.statut === "terminee";
  const enRetard =
    !!tache.date_echeance &&
    tache.date_echeance < aujourdhui &&
    !terminee &&
    tache.statut !== "annulee";
  const bientot =
    !enRetard &&
    !!tache.date_echeance &&
    !terminee &&
    tache.date_echeance < new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <View
      style={{
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: enRetard ? "rgba(224,82,74,0.4)" : couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 12,
        gap: 8,
        opacity: terminee ? 0.7 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Texte
            variante="petit"
            poids="semibold"
            style={terminee ? { textDecorationLine: "line-through" } : undefined}
          >
            {tache.titre}
          </Texte>
        </View>
        {estGestionnaire && (
          <Pressable
            onPress={() => surEdition(tache)}
            accessibilityRole="button"
            accessibilityLabel="Modifier la tâche"
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={16} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
        {estGestionnaire && (
          <Pressable
            onPress={() => surSuppression(tache.id, tache.titre)}
            accessibilityRole="button"
            accessibilityLabel="Supprimer la tâche"
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color={couleurs.danger} />
          </Pressable>
        )}
      </View>

      {tache.description ? (
        <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={2}>
          {tache.description}
        </Texte>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <Badge
          couleur={couleurPriorite(tache.priorite)}
          fond={`${couleurPriorite(tache.priorite)}22`}
          texte={libellePriorite(tache.priorite)}
        />
        {tache.date_echeance && (
          <Badge
            couleur={enRetard ? couleurs.danger : bientot ? couleurs.warmGold : couleurs.texteSecondaire}
            fond={
              enRetard
                ? couleurs.danger15
                : bientot
                  ? "rgba(251,191,36,0.14)"
                  : "rgba(255,255,255,0.06)"
            }
            texte={
              enRetard
                ? `En retard · ${new Date(tache.date_echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
                : bientot
                  ? `Bientôt · ${new Date(tache.date_echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
                  : `Échéance · ${new Date(tache.date_echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
            }
            icone={enRetard ? "alert-circle" : bientot ? "time" : "calendar-outline"}
          />
        )}
        {tache.membre ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: rayons.pill,
              backgroundColor: "rgba(255,255,255,0.06)",
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Avatar
              prenom={tache.membre.user?.prenom}
              nom={tache.membre.user?.nom}
              url={tache.membre.user?.avatar_url}
              taille={16}
            />
            <Texte variante="micro" poids="medium" couleur={couleurs.texteSecondaire} numberOfLines={1} style={{ maxWidth: 120 }}>
              {tache.membre.user?.prenom} {tache.membre.user?.nom}
            </Texte>
          </View>
        ) : tache.pupitre ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              borderRadius: rayons.pill,
              backgroundColor: "rgba(255,255,255,0.06)",
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: tache.pupitre.couleur ?? couleurs.muted,
              }}
            />
            <Texte variante="micro" poids="medium" couleur={couleurs.texteSecondaire} numberOfLines={1}>
              {tache.pupitre.nom}
            </Texte>
          </View>
        ) : null}
      </View>

      {/* Progression du statut */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
        {STATUTS.map((s) => {
          const actif = tache.statut === s.valeur;
          return (
            <Pressable
              key={s.valeur}
              disabled={!estGestionnaire || actif}
              onPress={() => surStatut(tache.id, s.valeur)}
              style={{
                flex: 1,
                borderRadius: rayons.pill,
                borderWidth: 1,
                borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                paddingVertical: 6,
                alignItems: "center",
                opacity: !estGestionnaire ? 1 : actif ? 1 : 0.75,
              }}
            >
              <Texte
                variante="micro"
                poids="bold"
                couleur={actif ? couleurs.warmGold : couleurs.texteSecondaire}
              >
                {s.label}
              </Texte>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Badge({
  couleur,
  fond,
  texte,
  icone,
}: {
  couleur: string;
  fond: string;
  texte: string;
  icone?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: rayons.pill,
        backgroundColor: fond,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      {icone && <Ionicons name={icone} size={11} color={couleur} />}
      <Texte variante="micro" poids="bold" couleur={couleur}>
        {texte}
      </Texte>
    </View>
  );
}

/** Modal de création / modification d'une tâche. */
function ModalTache({
  visible,
  groupeId,
  membres,
  pupitres,
  chargement,
  initiale,
  surEnvoyer,
  onFermer,
}: {
  visible: boolean;
  groupeId?: string | null;
  membres: {
    id: string;
    user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  }[];
  pupitres: { id: string; nom: string | null; couleur: string | null }[];
  chargement: boolean;
  initiale: TacheAvecAssignations | null;
  surEnvoyer: (tache: DonneesTache) => void;
  onFermer: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      {visible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={stylesModal.arrierePlan}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onFermer} />
          <Pressable style={stylesModal.feuille} onPress={() => {}}>
            <View style={stylesModal.enTete}>
              <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
                {initiale ? "Modifier la tâche" : "Nouvelle tâche"}
              </Texte>
              <Pressable
                onPress={onFermer}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                hitSlop={8}
                style={stylesModal.boutonFermer}
              >
                <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
              </Pressable>
            </View>

            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
              <FormulaireTache
                groupeId={groupeId}
                membres={membres}
                pupitres={pupitres}
                chargement={chargement}
                initiale={initiale}
                surEnvoyer={surEnvoyer}
                onAnnuler={onFermer}
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const stylesModal = StyleSheet.create({
  arrierePlan: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  feuille: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
    borderRadius: rayons.lg,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    padding: 20,
  },
  enTete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  boutonFermer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.surfaceCarte,
  },
});

function FormulaireTache({
  groupeId,
  membres,
  pupitres,
  chargement,
  initiale,
  surEnvoyer,
  onAnnuler,
}: {
  groupeId?: string | null;
  membres: {
    id: string;
    user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  }[];
  pupitres: { id: string; nom: string | null; couleur: string | null }[];
  chargement: boolean;
  initiale: TacheAvecAssignations | null;
  surEnvoyer: (tache: DonneesTache) => void;
  onAnnuler: () => void;
}) {
  const [titre, setTitre] = useState(initiale?.titre ?? "");
  const [description, setDescription] = useState(initiale?.description ?? "");
  const [assignationType, setAssignationType] = useState<"aucune" | "membre" | "role">(
    initiale ? (initiale.assignation_membre_id ? "membre" : initiale.assignation_role_id ? "role" : "aucune") : "aucune"
  );
  const [membreId, setMembreId] = useState<string | null>(initiale?.assignation_membre_id ?? null);
  const [roleId, setRoleId] = useState<string | null>(initiale?.assignation_role_id ?? null);
  const [priorite, setPriorite] = useState<PrioriteTache>(initiale?.priorite ?? "moyenne");
  const [dateEcheance, setDateEcheance] = useState<Date | null>(dateDepuisChaine(initiale?.date_echeance));
  const [erreurs, setErreurs] = useState<{ [k: string]: string | null }>({});

  function soumettre() {
    setErreurs({});
    if (!titre.trim()) {
      setErreurs({ titre: "Donne un titre à la tâche." });
      return;
    }
    surEnvoyer({
      titre: titre.trim(),
      description: description.trim() || null,
      assignationType: assignationType === "aucune" ? "membre" : assignationType,
      assignationMembreId: assignationType === "membre" ? membreId : null,
      assignationRoleId: assignationType === "role" ? roleId : null,
      priorite,
      dateEcheance: dateEcheance ? chaineDepuisDate(dateEcheance) : null,
    });
  }

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Etiquette>Titre *</Etiquette>
        <Champ placeholder="ex : Réserver la salle de répétition" value={titre} onChangeText={setTitre} erreur={!!erreurs.titre} />
        <ErreurChamp message={erreurs.titre} />
      </View>

      <View>
        <Etiquette>Description</Etiquette>
        <Champ
          multiline
          placeholder="Détails, contacts, liens…"
          value={description}
          onChangeText={setDescription}
          style={{ minHeight: 60, textAlignVertical: "top" }}
        />
      </View>

      {groupeId && (
        <View>
          <Etiquette>Assignation</Etiquette>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(
              [
                { valeur: "aucune", label: "Non assignée" },
                { valeur: "membre", label: "Membre" },
                { valeur: "role", label: "Pupitre" },
              ] as const
            ).map((c) => (
              <Chip
                key={c.valeur}
                actif={assignationType === c.valeur}
                label={c.label}
                onPress={() => setAssignationType(c.valeur)}
              />
            ))}
          </View>
          {assignationType === "membre" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {membres.map((m) => (
                <Chip
                  key={m.id}
                  actif={membreId === m.id}
                  label={`${m.user?.prenom ?? ""} ${m.user?.nom ?? ""}`.trim()}
                  onPress={() => setMembreId(m.id)}
                />
              ))}
            </View>
          )}
          {assignationType === "role" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {pupitres.map((p) => (
                <Chip
                  key={p.id}
                  actif={roleId === p.id}
                  label={p.nom ?? "Pupitre"}
                  onPress={() => setRoleId(p.id)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View>
        <Etiquette>Priorité</Etiquette>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {PRIORITES.map((p) => (
            <Chip
              key={p.valeur}
              actif={priorite === p.valeur}
              label={p.label}
              couleur={p.couleur}
              onPress={() => setPriorite(p.valeur)}
            />
          ))}
        </View>
      </View>

      <View>
        <Etiquette>Échéance</Etiquette>
        <ChampDatePicker valeur={dateEcheance} onChange={setDateEcheance} mode="date" placeholder="Aucune échéance" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <Bouton titre={initiale ? "Enregistrer" : "Ajouter"} chargement={chargement} onPress={soumettre} />
        <Bouton variante="secondaire" titre="Annuler" onPress={onAnnuler} />
      </View>
    </View>
  );
}

function Chip({
  actif,
  label,
  couleur,
  onPress,
}: {
  actif: boolean;
  label: string;
  couleur?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: rayons.pill,
        borderWidth: 1,
        borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
        backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Texte
        variante="micro"
        poids={actif ? "bold" : "medium"}
        couleur={actif ? (couleur ?? couleurs.warmGold) : couleurs.texte}
      >
        {label}
      </Texte>
    </Pressable>
  );
}
