import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  DOSSIERS_PAR_DEFAUT,
  useAjouterFichierPersonnel,
  useCreerDossier,
  useDossiersPersonnels,
  useFichiersPersonnels,
  useSupprimerDossier,
  useSupprimerFichierPersonnel,
  type DossierAvecCompte,
} from "@/lib/queries/dossiers";
import { useDialogue } from "@/lib/dialogue";
import { televerserFichier } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { ModalDetailFichier, type FichierDetail } from "@/components/groupe/modal-detail-fichier";
import { tailleLisible } from "@/lib/format";

function iconeDossier(nom: string): {
  icone: string;
  couleur: string;
  famille: "ion" | "fa6";
} {
  if (nom.includes("documents")) return { icone: "document-text-outline", couleur: "#60A5FA", famille: "ion" };
  if (nom.includes("loops")) return { icone: "repeat-outline", couleur: couleurs.warmGold, famille: "ion" };
  if (nom.includes("partitions")) return { icone: "musical-notes-outline", couleur: "#C084FC", famille: "ion" };
  if (nom.includes("audios")) return { icone: "headset-outline", couleur: "#34D399", famille: "ion" };
  if (nom.includes("styles")) return { icone: "drum", couleur: couleurs.terracottaLight, famille: "fa6" };
  return { icone: "folder-open-outline", couleur: couleurs.muted, famille: "ion" };
}

/** Icône d'un dossier (FontAwesome6 pour la batterie, Ionicons ailleurs). */
function IcôneDossier({ nom, taille }: { nom: string; taille: number }) {
  const info = iconeDossier(nom);
  if (info.famille === "fa6") {
    return <FontAwesome6 name={info.icone as never} size={taille} color={info.couleur} />;
  }
  return <Ionicons name={info.icone as never} size={taille} color={info.couleur} />;
}

function typeDepuisNom(nom: string): "audio" | "video" | "pdf" | "image" | "autre" {
  const n = nom.toLowerCase();
  if (n.endsWith(".mp3") || n.endsWith(".m4a") || n.endsWith(".wav") || n.endsWith(".ogg") || n.endsWith(".aac")) return "audio";
  if (n.endsWith(".mp4") || n.endsWith(".mov") || n.endsWith(".webm") || n.endsWith(".mkv")) return "video";
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".webp") || n.endsWith(".gif")) return "image";
  return "autre";
}

/** Fichiers personnels organisés par dossiers (défauts + personnalisés). */
export function OngletFichiersPersonnels() {
  const { data: dossiers = [], isLoading } = useDossiersPersonnels();
  const dialogue = useDialogue();
  const supprimerDossier = useSupprimerDossier();
  const [dossierOuvert, setDossierOuvert] = useState<DossierAvecCompte | null>(null);
  const [modeNouveauDossier, setModeNouveauDossier] = useState(false);
  const [fichierSelectionne, setFichierSelectionne] = useState<FichierDetail | null>(null);

  if (dossierOuvert) {
    return (
      <ContenuDossier
        dossier={dossierOuvert}
        surRetour={() => setDossierOuvert(null)}
        surOuvrirFichier={setFichierSelectionne}
        fichierSelectionne={fichierSelectionne}
        surFermerFichier={() => setFichierSelectionne(null)}
      />
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
          {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""}
        </Texte>
        <Pressable
          onPress={() => setModeNouveauDossier(true)}
          accessibilityRole="button"
          accessibilityLabel="Nouveau dossier"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            borderRadius: rayons.pill,
            backgroundColor: couleurs.warmGold,
            paddingHorizontal: 14,
            paddingVertical: 7,
          }}
        >
          <Ionicons name="add" size={16} color={couleurs.charcoal} />
          <Texte variante="micro" poids="bold" couleur={couleurs.charcoal}>
            Dossier
          </Texte>
        </Pressable>
      </View>

      {isLoading ? (
        <SqueletteListe lignes={3} hauteur={64} />
      ) : (
        <View style={{ gap: 10 }}>
          {dossiers.map((dossier) => {
            const info = iconeDossier(dossier.nom);
            const parDefaut = (DOSSIERS_PAR_DEFAUT as readonly string[]).includes(dossier.nom);
            return (
              <Pressable
                key={dossier.id}
                onPress={() => setDossierOuvert(dossier)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir le dossier ${dossier.nom}`}
                style={({ pressed }) => [
                  {
                    borderRadius: rayons.md,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${info.couleur}1F`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IcôneDossier nom={dossier.nom} taille={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold">
                    {dossier.nom}
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {dossier.nbFichiers} fichier{dossier.nbFichiers > 1 ? "s" : ""}
                    {parDefaut ? " · Par défaut" : ""}
                  </Texte>
                </View>
                {!parDefaut && (
                  <Pressable
                    onPress={async () => {
                      const ok = await dialogue.confirmer({
                        titre: "Supprimer ce dossier ?",
                        message: "Le dossier sera supprimé, ses fichiers seront déplacés hors dossier.",
                        boutonConfirmer: "Supprimer",
                      });
                      if (ok) {
                        try {
                          await supprimerDossier.mutateAsync(dossier.id);
                          dialogue.succes("Dossier supprimé.");
                        } catch {
                          dialogue.erreur("Impossible de supprimer le dossier.");
                        }
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer le dossier ${dossier.nom}`}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={couleurs.danger} />
                  </Pressable>
                )}
                <Ionicons name="chevron-forward" size={16} color={couleurs.muted} />
              </Pressable>
            );
          })}
        </View>
      )}

      <ModalNouveauDossier
        visible={modeNouveauDossier}
        onFermer={() => setModeNouveauDossier(false)}
      />
    </View>
  );
}

function ContenuDossier({
  dossier,
  surRetour,
  surOuvrirFichier,
  fichierSelectionne,
  surFermerFichier,
}: {
  dossier: DossierAvecCompte;
  surRetour: () => void;
  surOuvrirFichier: (fichier: FichierDetail) => void;
  fichierSelectionne: FichierDetail | null;
  surFermerFichier: () => void;
}) {
  const { data: fichiers = [], isLoading } = useFichiersPersonnels(dossier.id);
  const ajouter = useAjouterFichierPersonnel(dossier.id);
  const supprimerFichier = useSupprimerFichierPersonnel(dossier.id);
  const dialogue = useDialogue();
  const [envoi, setEnvoi] = useState(false);
  const info = iconeDossier(dossier.nom);

  async function choisirFichier() {
    const resultat = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (resultat.canceled || !resultat.assets[0]) return;
    const asset = resultat.assets[0];
    setEnvoi(true);
    try {
      const { key } = await televerserFichier(
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? "application/octet-stream",
        },
        "personnel"
      );
      await ajouter.mutateAsync({
        nom: asset.name,
        type: typeDepuisNom(asset.name),
        url: key,
        format: asset.name.includes(".") ? asset.name.split(".").pop() : null,
        tailleBytes: asset.size ?? null,
      });
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Impossible d'envoyer le fichier.");
    } finally {
      setEnvoi(false);
    }
  }

  function versDetail(fichier: (typeof fichiers)[number]): FichierDetail {
    return {
      id: fichier.id,
      nom: fichier.nom,
      cle: fichier.url,
      type: fichier.type === "audio" || fichier.type === "video" || fichier.type === "pdf" || fichier.type === "partition" || fichier.type === "image" ? fichier.type : "autre",
      tailleOctets: fichier.taille_bytes,
      format: fichier.format ?? null,
      imageCle: null,
      estDeletable: true,
      infos: fichier.created_at
        ? [
            {
              label: "Date",
              valeur: new Date(fichier.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }),
            },
          ]
        : [],
      onSupprimer: async (id, nom) => {
        const ok = await dialogue.confirmer({
          titre: "Supprimer ce fichier ?",
          message: `« ${nom} » sera définitivement supprimé.`,
        });
        if (!ok) return;
        try {
          await supprimerFichier.mutateAsync(id);
          dialogue.succes("Fichier supprimé.");
        } catch {
          dialogue.erreur("Impossible de supprimer le fichier.");
        }
      },
    };
  }

  return (
    <View style={{ gap: 14 }}>
      <Pressable
        onPress={surRetour}
        accessibilityRole="button"
        accessibilityLabel="Retour aux dossiers"
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <Ionicons name="arrow-back" size={16} color={couleurs.texteSecondaire} />
        <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
          Mes dossiers
        </Texte>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: `${info.couleur}1F`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IcôneDossier nom={dossier.nom} taille={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Texte variante="titre3" poids="extrabold">
            {dossier.nom}
          </Texte>
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            {fichiers.length} fichier{fichiers.length > 1 ? "s" : ""}
          </Texte>
        </View>
      </View>

      <Bouton titre={envoi ? "Envoi…" : "Ajouter un fichier"} chargement={envoi} onPress={choisirFichier}>
        <Ionicons name="document-attach-outline" size={18} color={couleurs.charcoal} />
      </Bouton>

      {isLoading ? (
        <SqueletteListe lignes={2} hauteur={56} />
      ) : fichiers.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Ionicons name="folder-open-outline" size={32} color={couleurs.terracottaLight} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 10, textAlign: "center" }}>
            Ce dossier est vide pour l&apos;instant.
          </Texte>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {fichiers.map((fichier) => {
            const infoF = iconeFichier(fichier.nom, fichier.type);
            return (
              <Pressable
                key={fichier.id}
                onPress={() => surOuvrirFichier(versDetail(fichier))}
                accessibilityRole="button"
                accessibilityLabel={`Voir ${fichier.nom}`}
                style={({ pressed }) => [
                  {
                    borderRadius: rayons.md,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: infoF.fond,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={infoF.icone} size={18} color={infoF.couleur} />
                </View>
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold" numberOfLines={1}>
                    {fichier.nom}
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {tailleLisible(fichier.taille_bytes)}
                  </Texte>
                </View>
                <Ionicons name="chevron-forward" size={16} color={couleurs.muted} />
              </Pressable>
            );
          })}
        </View>
      )}

      <ModalDetailFichier
        fichier={fichierSelectionne}
        visible={!!fichierSelectionne}
        onFermer={surFermerFichier}
      />
    </View>
  );
}

function iconeFichier(
  nom: string,
  type: string
): { icone: keyof typeof Ionicons.glyphMap; fond: string; couleur: string } {
  if (type === "audio") return { icone: "musical-notes", fond: "rgba(251,191,36,0.12)", couleur: couleurs.warmGold };
  if (type === "video") return { icone: "videocam", fond: "rgba(96,165,250,0.12)", couleur: "#60A5FA" };
  if (type === "pdf") return { icone: "document-text", fond: "rgba(224,82,74,0.12)", couleur: couleurs.danger };
  if (type === "image") return { icone: "image", fond: "rgba(52,211,153,0.12)", couleur: "#34D399" };
  return { icone: "file-tray", fond: "rgba(255,255,255,0.06)", couleur: couleurs.muted };
}

function ModalNouveauDossier({ visible, onFermer }: { visible: boolean; onFermer: () => void }) {
  const creer = useCreerDossier();
  const dialogue = useDialogue();
  const [nom, setNom] = useState("");

  async function soumettre() {
    if (!nom.trim()) return;
    try {
      await creer.mutateAsync(nom);
      setNom("");
      onFermer();
      dialogue.succes("Dossier créé.");
    } catch {
      dialogue.erreur("Impossible de créer le dossier (nom déjà utilisé ?).");
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
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onFermer}
      >
        <Pressable
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: rayons.lg,
            backgroundColor: couleurs.carte,
            borderWidth: 1,
            borderColor: couleurs.bordureForte,
            padding: 20,
            gap: 12,
          }}
          onPress={() => {}}
        >
          <Texte variante="titre3" poids="extrabold">
            Nouveau dossier
          </Texte>
          <Champ
            placeholder="Nom du dossier"
            value={nom}
            onChangeText={setNom}
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Bouton titre="Créer" chargement={creer.isPending} onPress={soumettre} disabled={!nom.trim()} />
            <Bouton variante="secondaire" titre="Annuler" onPress={onFermer} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
