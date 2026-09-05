import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { usePupitresGroupe, useMembresGroupe } from "@/lib/queries/groupes";
import { useAjouterRessource, useRessources, useSupprimerRessource, type RessourceAvecJointures } from "@/lib/queries/ressources";
import { televerserFichier } from "@/lib/r2";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { Bouton } from "@/components/ui/bouton";
import { VignetteImage } from "@/components/ui/vignette-fichier";
import { ModalDetailFichier, type FichierDetail } from "@/components/groupe/modal-detail-fichier";
import { tailleLisible } from "@/lib/format";

const STYLES_TYPE: Record<string, { icone: string; fond: string; couleur: string }> = {
  audio: { icone: "musical-notes", fond: "rgba(251,191,36,0.1)", couleur: couleurs.warmGold },
  video: { icone: "videocam", fond: "rgba(96,165,250,0.1)", couleur: "#60A5FA" },
  pdf: { icone: "document-text", fond: "rgba(224,82,74,0.1)", couleur: couleurs.danger },
  image: { icone: "image", fond: "rgba(52,211,153,0.1)", couleur: "#34D399" },
  autre: { icone: "file-tray", fond: "rgba(255,255,255,0.06)", couleur: couleurs.muted },
};

type Cible = {
  partageType: "groupe" | "role" | "membre";
  roleId?: string;
  membreId?: string;
};

export function OngletFichiers({
  groupeId,
  estGestionnaire,
  photoGroupe,
}: {
  groupeId: string;
  estGestionnaire: boolean;
  photoGroupe?: string | null;
}) {
  const { data: ressources = [], isLoading } = useRessources(groupeId, estGestionnaire);
  const ajouter = useAjouterRessource(groupeId);
  const supprimer = useSupprimerRessource(groupeId);
  const dialogue = useDialogue();
  const { data: pupitres = [] } = usePupitresGroupe(groupeId);
  const { data: membres = [] } = useMembresGroupe(groupeId);

  const [envoiFichier, setEnvoiFichier] = useState(false);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [cible, setCible] = useState<Cible>({ partageType: "groupe" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ressourceSelectionnee, setRessourceSelectionnee] = useState<RessourceAvecJointures | null>(null);

  function versFichierDetail(r: RessourceAvecJointures): FichierDetail {
    const partageAvec =
      r.partage_type === "groupe"
        ? "Tout le groupe"
        : r.partage_type === "role"
          ? `Pupitre ${r.pupitre?.nom ?? ""}`
          : r.partage_type === "membre"
            ? `${r.membreCible?.user?.prenom ?? ""} ${r.membreCible?.user?.nom ?? ""}`.trim()
            : r.partage_type === "projet"
              ? "Projet"
              : "Privé";
    const infos: { label: string; valeur: string }[] = [
      { label: "Partagé avec", valeur: partageAvec },
    ];
    if (r.uploader) {
      infos.push({
        label: "Téléversé par",
        valeur: `${r.uploader.prenom ?? ""} ${r.uploader.nom ?? ""}`.trim(),
      });
    }
    if (r.created_at) {
      infos.push({
        label: "Date",
        valeur: new Date(r.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      });
    }
    return {
      id: r.id,
      nom: r.nom,
      cle: r.url,
      type: r.type === "audio" || r.type === "video" || r.type === "pdf" || r.type === "partition" || r.type === "image" ? r.type : "autre",
      tailleOctets: r.taille_bytes,
      format: r.format ?? null,
      imageCle: photoGroupe,
      estDeletable: true,
      infos,
      onSupprimer: (id, nom) => supprimerRessource(id, nom),
    };
  }

  async function supprimerRessource(ressourceId: string, nom: string) {
    const ok = await dialogue.confirmer({
      titre: "Supprimer ce fichier ?",
      message: `« ${nom} » sera définitivement supprimé pour tous les membres du groupe.`,
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync(ressourceId);
      dialogue.succes("Fichier supprimé.");
    } catch {
      dialogue.erreur("Impossible de supprimer le fichier.");
    }
  }

  async function choisirFichier() {
    setErreur(null);
    const resultat = await DocumentPicker.getDocumentAsync({
      type: ["audio/*", "video/*", "application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    await envoyer({
      uri: resultat.assets[0].uri,
      name: resultat.assets[0].name,
      mimeType: resultat.assets[0].mimeType ?? undefined,
      size: resultat.assets[0].size ?? undefined,
    }, "fichier");
  }

  async function choisirImage() {
    setErreur(null);
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    const asset = resultat.assets[0];
    await envoyer({
      uri: asset.uri,
      name: asset.fileName ?? "image.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize ?? undefined,
    }, "image");
  }

  async function envoyer(
    fichier: {
      uri: string;
      name: string;
      mimeType?: string;
      size?: number;
    },
    source: "fichier" | "image"
  ) {
    const premierPupitre = pupitres[0];
    const premierMembre = membres.find((m) => m.statut === "actif");
    const roleId = cible.partageType === "role" ? (cible.roleId ?? premierPupitre?.id) : null;
    const membreId = cible.partageType === "membre" ? (cible.membreId ?? premierMembre?.id) : null;

    if (cible.partageType === "role" && !roleId) {
      setErreur("Aucun pupitre disponible. Crée d'abord un pupitre.");
      return;
    }
    if (cible.partageType === "membre" && !membreId) {
      setErreur("Aucun membre actif dans le groupe.");
      return;
    }
    const setEnvoi = source === "fichier" ? setEnvoiFichier : setEnvoiImage;
    setEnvoi(true);
    try {
      const { key } = await televerserFichier(
        { uri: fichier.uri, name: fichier.name, type: fichier.mimeType ?? "application/octet-stream" },
        "groupes-ressources"
      );
      await ajouter.mutateAsync({
        nom: fichier.name,
        type: typeDepuisMime(fichier.mimeType),
        url: key,
        format: extensionDe(fichier.name),
        tailleBytes: fichier.size ?? null,
        dureeSecondes: null,
        partageType: cible.partageType,
        partageGroupeId: cible.partageType === "groupe" ? groupeId : null,
        partageRoleId: roleId,
        partageMembreId: membreId,
      });
      dialogue.succes("Fichier partagé.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer le fichier.");
    } finally {
      setEnvoi(false);
    }
  }

  function typeDepuisMime(mime?: string): "audio" | "video" | "pdf" | "image" | "autre" {
    if (!mime) return "autre";
    if (mime.startsWith("audio")) return "audio";
    if (mime.startsWith("video")) return "video";
    if (mime.includes("pdf")) return "pdf";
    if (mime.startsWith("image")) return "image";
    return "autre";
  }

  function extensionDe(nom: string): string {
    const dernierPoint = nom.lastIndexOf(".");
    return dernierPoint > 0 ? nom.slice(dernierPoint + 1).toLowerCase() : "";
  }

  return (
    <View style={{ gap: 14 }}>
      {/* Cible + boutons d'upload */}
      {estGestionnaire && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(
              [
                { type: "groupe", label: "Tout le groupe" },
                { type: "role", label: "Pupitre" },
                { type: "membre", label: "Membre" },
              ] as const
            ).map((c) => {
              const actif = cible.partageType === c.type;
              return (
                <Pressable
                  key={c.type}
                  onPress={() => {
                    if (c.type === "role") {
                      setCible({ partageType: "role", roleId: pupitres[0]?.id });
                    } else if (c.type === "membre") {
                      setCible({
                        partageType: "membre",
                        membreId: membres.find((m) => m.statut === "actif")?.id,
                      });
                    } else {
                      setCible({ partageType: "groupe" });
                    }
                  }}
                  style={{
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                    backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Texte variante="micro" poids={actif ? "bold" : "medium"} couleur={actif ? couleurs.warmGold : couleurs.texte}>
                    {c.label}
                  </Texte>
                </Pressable>
              );
            })}
          </View>

          {cible.partageType === "role" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {pupitres.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setCible({ partageType: "role", roleId: p.id })}
                  style={{
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: cible.roleId === p.id ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Texte variante="micro" couleur={cible.roleId === p.id ? couleurs.warmGold : couleurs.texteSecondaire}>
                    {p.nom}
                  </Texte>
                </Pressable>
              ))}
            </View>
          )}

          {cible.partageType === "membre" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {membres
                .filter((m) => m.statut === "actif")
                .map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setCible({ partageType: "membre", membreId: m.id })}
                    style={{
                      borderRadius: rayons.pill,
                      borderWidth: 1,
                      borderColor: cible.membreId === m.id ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Texte variante="micro" couleur={cible.membreId === m.id ? couleurs.warmGold : couleurs.texteSecondaire}>
                      {m.user?.prenom} {m.user?.nom}
                    </Texte>
                  </Pressable>
                ))}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Bouton
              titre={envoiFichier ? "Envoi…" : "Fichier"}
              chargement={envoiFichier}
              onPress={choisirFichier}
              style={{ flex: 1 }}
            >
              <Ionicons name="document-attach-outline" size={18} color={couleurs.charcoal} />
            </Bouton>
            <Bouton
              variante="secondaire"
              titre={envoiImage ? "Envoi…" : "Image"}
              chargement={envoiImage}
              onPress={choisirImage}
              style={{ flex: 1 }}
            >
              <Ionicons name="image-outline" size={18} color={couleurs.cream} />
            </Bouton>
          </View>
        </View>
      )}

      {erreur && (
        <Texte variante="petit" couleur={couleurs.danger}>
          {erreur}
        </Texte>
      )}

      {isLoading ? (
        <>
          <SqueletteListe lignes={2} hauteur={64} />
        </>
      ) : ressources.length === 0 ? (
        <EtatVide
          icone="folder-open-outline"
          titre="Aucun fichier partagé"
          message="Dépose ici les partitions, les enregistrements de référence et les documents que le groupe doit avoir sous la main."
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {ressources.map((ressource) => (
            <Pressable
              key={ressource.id}
              onPress={() => setRessourceSelectionnee(ressource)}
              accessibilityRole="button"
              accessibilityLabel={`Voir ${ressource.nom}`}
              style={({ pressed }) => [
                {
                  flexBasis: "47%",
                  flexGrow: 1,
                  minWidth: 150,
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  overflow: "hidden",
                },
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <TuileVisuel ressource={ressource} />
              <View style={{ padding: 10, gap: 2 }}>
                <Texte variante="petit" poids="semibold" numberOfLines={1}>
                  {ressource.nom}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {tailleLisible(ressource.taille_bytes)}
                  {ressource.visibilite === "draft" ? " · Draft" : ""}
                </Texte>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <ModalDetailFichier
        fichier={ressourceSelectionnee ? versFichierDetail(ressourceSelectionnee) : null}
        visible={!!ressourceSelectionnee}
        onFermer={() => setRessourceSelectionnee(null)}
      />
    </View>
  );
}

function TuileVisuel({ ressource }: { ressource: RessourceAvecJointures }) {
  if (ressource.type === "image") {
    return <VignetteImage cle={ressource.url} hauteur={110} />;
  }

  const style = STYLES_TYPE[ressource.type] ?? STYLES_TYPE.autre;

  return (
    <View
      style={{
        height: 110,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: style.fond,
      }}
    >
      <Ionicons name={style.icone as never} size={36} color={style.couleur} />
      {ressource.type === "video" && (
        <View
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="play" size={13} color="#FFFFFF" />
        </View>
      )}
      {ressource.type === "audio" && (
        <View
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="play" size={13} color={couleurs.warmGold} />
        </View>
      )}
    </View>
  );
}
