import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAjouterPupitre,
  useModifierPupitre,
  usePupitresGroupe,
  useSupprimerPupitre,
} from "@/lib/queries/groupes";
import { couleurs, rayons } from "@/lib/theme";
import { useDialogue } from "@/lib/dialogue";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { Bouton } from "@/components/ui/bouton";
import { Champ, AlerteErreur } from "@/components/ui/champ";
import { BoutonAjout } from "@/components/ui/bouton-ajout";

const COULEURS_PUPITRES = [
  "#FBBF24",
  "#E07A56",
  "#FB923C",
  "#EF4444",
  "#34D399",
  "#60A5FA",
  "#C084FC",
  "#F472B6",
  "#F87171",
  "#2DD4BF",
  "#A8A29E",
];

export function OngletPupitres({
  groupeId,
  estGestionnaire,
}: {
  groupeId: string;
  estGestionnaire: boolean;
}) {
  const { data: pupitres = [], isLoading } = usePupitresGroupe(groupeId);
  const modifier = useModifierPupitre();
  const supprimer = useSupprimerPupitre();
  const dialogue = useDialogue();

  const [modeAjout, setModeAjout] = useState(false);

  async function supprimerPupitre(pupitreId: string, nomPupitre: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer ce pupitre ?",
      message: `Le pupitre « ${nomPupitre} » sera supprimé du groupe.`,
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync({ groupeId, pupitreId });
      dialogue.succes("Pupitre supprimé.");
    } catch {
      dialogue.erreur("Impossible de supprimer le pupitre.");
    }
  }

  if (!estGestionnaire) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          Seuls le chef et les administrateurs gèrent les pupitres.
        </Texte>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View>
        <SqueletteListe lignes={2} hauteur={56} />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <BoutonAjout
          titre="+ Ajouter un pupitre"
          onPress={() => setModeAjout(true)}
        />
      </View>

      {pupitres.length === 0 && !modeAjout && (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Texte variante="petit" couleur={couleurs.texteSecondaire}>
            Aucun pupitre. Ajoute les sections de ton groupe.
          </Texte>
        </View>
      )}

      {pupitres.map((pupitre) => (
        <View
          key={pupitre.id}
          style={{
            borderRadius: rayons.md,
            borderWidth: 1,
            borderColor: couleurs.bordure,
            backgroundColor: couleurs.surfaceCarte,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: pupitre.couleur
                ? `${pupitre.couleur}22`
                : "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: pupitre.couleur ?? couleurs.muted,
              }}
            />
          </View>
          <Texte poids="semibold" style={{ flex: 1 }}>
            {pupitre.nom}
          </Texte>
          <View
            onTouchEnd={() =>
              modifier.mutate({
                groupeId,
                pupitreId: pupitre.id,
                modifications: { couleur: COULEURS_PUPITRES[(pupitres.indexOf(pupitre) + 1) % COULEURS_PUPITRES.length] },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Changer la couleur"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="color-palette-outline" size={18} color={couleurs.muted} />
          </View>
          <View
            onTouchEnd={() => supprimerPupitre(pupitre.id, pupitre.nom)}
            accessibilityRole="button"
            accessibilityLabel="Supprimer le pupitre"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="trash-outline" size={18} color={couleurs.danger} />
          </View>
        </View>
      ))}

      <ModalNouveauPupitre
        visible={modeAjout}
        groupeId={groupeId}
        onFermer={() => setModeAjout(false)}
      />
    </View>
  );
}

/** Modal de création d'un nouveau pupitre. */
function ModalNouveauPupitre({
  visible,
  groupeId,
  onFermer,
}: {
  visible: boolean;
  groupeId: string;
  onFermer: () => void;
}) {
  const ajouter = useAjouterPupitre();
  const dialogue = useDialogue();

  const [nom, setNom] = useState("");
  const [couleur, setCouleur] = useState(COULEURS_PUPITRES[0]);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNom("");
      setCouleur(COULEURS_PUPITRES[0]);
      setErreur(null);
    }
  }, [visible]);

  async function ajouterPupitre() {
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Donne un nom au pupitre.");
      return;
    }
    try {
      await ajouter.mutateAsync({ groupeId, nom: nom.trim(), couleur });
      onFermer();
      dialogue.succes("Pupitre créé.");
    } catch {
      setErreur("Impossible de créer le pupitre.");
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={stylesModal.arrierePlan}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onFermer} />
        <Pressable style={stylesModal.feuille} onPress={() => {}}>
          <View style={stylesModal.enTete}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              Nouveau pupitre
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
            <View style={{ gap: 12 }}>
              <AlerteErreur message={erreur} />
              <Champ
                placeholder="Nom du pupitre (ex : Sopranos)"
                value={nom}
                onChangeText={setNom}
              />
              <View>
                <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ marginBottom: 8 }}>
                  Couleur
                </Texte>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {COULEURS_PUPITRES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCouleur(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Choisir la couleur ${c}`}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: c,
                        borderWidth: 2,
                        borderColor: couleur === c ? couleurs.cream : "transparent",
                        opacity: couleur === c ? 1 : 0.8,
                      }}
                    />
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Bouton titre="Ajouter" chargement={ajouter.isPending} onPress={ajouterPupitre} />
                <Bouton variante="secondaire" titre="Annuler" onPress={onFermer} />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
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
