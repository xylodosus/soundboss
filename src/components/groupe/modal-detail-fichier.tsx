import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLecteurAudio } from "@/lib/audio-context";
import { useDialogue } from "@/lib/dialogue";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { VignetteImage, useUrlR2 } from "@/components/ui/vignette-fichier";
import { tailleLisible } from "@/lib/format";

export type FichierDetail = {
  id: string;
  nom: string;
  /** Clé R2 du fichier. */
  cle: string;
  type: "image" | "video" | "audio" | "pdf" | "partition" | "autre";
  tailleOctets?: number | null;
  format?: string | null;
  /** Image d'illustration pour la lecture audio (photo de groupe…). */
  imageCle?: string | null;
  /** Affiche le bouton de suppression (uploader / gestionnaire). */
  estDeletable: boolean;
  infos: { label: string; valeur: string }[];
  onSupprimer?: (id: string, nom: string) => void;
};

const LIBELLES_TYPE: Record<string, string> = {
  audio: "Audio",
  video: "Vidéo",
  pdf: "PDF",
  image: "Image",
  partition: "Partition",
  autre: "Fichier",
};

/** Modal de détail d'un fichier : aperçu, infos, lecture audio/vidéo, téléchargement, suppression. */
export function ModalDetailFichier({
  fichier,
  visible,
  onFermer,
}: {
  fichier: FichierDetail | null;
  visible: boolean;
  onFermer: () => void;
}) {
  const { ouvrirPiste } = useLecteurAudio();
  const dialogue = useDialogue();
  const [enTelechargement, setEnTelechargement] = useState(false);
  const [lecturePdf, setLecturePdf] = useState(false);

  if (!fichier) return null;

  async function telecharger() {
    if (!fichier) return;
    setEnTelechargement(true);
    try {
      const url = await urlLectureR2(fichier.cle);
      if (!url) throw new Error("Impossible d'obtenir le fichier.");
      const destination = new File(Paths.cache, `soundboss-${Date.now()}-${fichier.nom}`);
      await File.downloadFileAsync(url, destination);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destination.uri, {
          mimeType: mimeDepuisType(fichier.type),
          dialogTitle: fichier.nom,
        });
      } else {
        dialogue.succes("Fichier téléchargé.");
      }
    } catch {
      dialogue.erreur("Impossible de télécharger le fichier.");
    } finally {
      setEnTelechargement(false);
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
      <Pressable style={styles.arrierePlan} onPress={onFermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={styles.enTete}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }} numberOfLines={1}>
              {fichier.nom}
            </Texte>
            <Pressable
              onPress={telecharger}
              disabled={enTelechargement}
              accessibilityRole="button"
              accessibilityLabel="Télécharger le fichier"
              hitSlop={8}
              style={[styles.boutonFermer, { opacity: enTelechargement ? 0.6 : 1 }]}
            >
              {enTelechargement ? (
                <ActivityIndicator size="small" color={couleurs.warmGold} />
              ) : (
                <Ionicons name="download-outline" size={20} color={couleurs.warmGold} />
              )}
            </Pressable>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={styles.boutonFermer}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          <ScrollView bounces={false} style={{ flexShrink: 1 }}>
            <ApercuFichier fichier={fichier} onEcouter={ouvrirPiste} onLirePdf={() => setLecturePdf(true)} />

            <View style={{ gap: 10, marginTop: 16 }}>
              <LigneInfo label="Taille" valeur={tailleLisible(fichier.tailleOctets)} />
              <LigneInfo label="Type" valeur={LIBELLES_TYPE[fichier.type] ?? fichier.type} />
              {fichier.format ? <LigneInfo label="Format" valeur={fichier.format} /> : null}
              {fichier.infos.map((info) => (
                <LigneInfo key={info.label} label={info.label} valeur={info.valeur} />
              ))}
            </View>

            {fichier.estDeletable && fichier.onSupprimer && (
              <Bouton
                variante="danger"
                titre="Supprimer le fichier"
                onPress={() => {
                  onFermer();
                  fichier.onSupprimer?.(fichier.id, fichier.nom);
                }}
                style={{ marginTop: 20 }}
              >
                <Ionicons name="trash-outline" size={16} color={couleurs.danger} />
              </Bouton>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>

      {lecturePdf && <LecteurPdf cle={fichier.cle} nom={fichier.nom} onFermer={() => setLecturePdf(false)} />}
    </Modal>
  );
}

/** Liseuse PDF plein écran (WebView ; viewer Google Docs sur Android). */
function LecteurPdf({ cle, nom, onFermer }: { cle: string; nom: string; onFermer: () => void }) {
  const insets = useSafeAreaInsets();
  const url = useUrlR2(cle);

  return (
    <Modal visible animationType="slide" onRequestClose={onFermer} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: couleurs.fond,
          paddingTop: Math.max(insets.top, 8),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: couleurs.bordure,
          }}
        >
          <Pressable
            onPress={onFermer}
            accessibilityRole="button"
            accessibilityLabel="Fermer le lecteur"
            hitSlop={8}
            style={{ width: 40 }}
          >
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Texte poids="extrabold" numberOfLines={1} style={{ flex: 1 }}>
            {nom}
          </Texte>
        </View>

        {url ? (
          <WebView
            source={{
              uri:
                Platform.OS === "android"
                  ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`
                  : url,
            }}
            style={{ flex: 1, backgroundColor: couleurs.fond }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={couleurs.warmGold} />
              </View>
            )}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={couleurs.warmGold} />
          </View>
        )}
      </View>
    </Modal>
  );
}

function ApercuFichier({
  fichier,
  onEcouter,
  onLirePdf,
}: {
  fichier: FichierDetail;
  onEcouter: (piste: {
    cle: string;
    titre: string;
    sousTitre?: string;
    imageCle?: string | null;
  }) => void;
  onLirePdf: () => void;
}) {
  if (fichier.type === "image") {
    return <VignetteImage cle={fichier.cle} hauteur={240} contenir />;
  }

  if (fichier.type === "video") {
    return <LecteurVideo cle={fichier.cle} />;
  }

  const config: Record<string, { icone: keyof typeof Ionicons.glyphMap; fond: string; couleur: string }> = {
    audio: {
      icone: "musical-notes",
      fond: "rgba(251,191,36,0.1)",
      couleur: couleurs.warmGold,
    },
    pdf: {
      icone: "document-text",
      fond: "rgba(224,82,74,0.1)",
      couleur: couleurs.danger,
    },
    autre: {
      icone: "file-tray",
      fond: "rgba(255,255,255,0.06)",
      couleur: couleurs.muted,
    },
  };
  const c = config[fichier.type] ?? config.autre;

  return (
    <View
      style={{
        height: 200,
        borderRadius: rayons.md,
        backgroundColor: c.fond,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <Ionicons name={c.icone} size={56} color={c.couleur} />
      {fichier.type === "audio" && (
        <Bouton
          variante="secondaire"
          titre="Écouter"
          onPress={() =>
            onEcouter({
              cle: fichier.cle,
              titre: fichier.nom,
              sousTitre: "Fichier du groupe",
              imageCle: fichier.imageCle,
            })
          }
        >
          <Ionicons name="play" size={14} color={couleurs.warmGold} />
        </Bouton>
      )}
      {fichier.type === "pdf" && (
        <Bouton variante="secondaire" titre="Lire le PDF" onPress={onLirePdf}>
          <Ionicons name="book-outline" size={14} color={couleurs.danger} />
        </Bouton>
      )}
    </View>
  );
}

function LecteurVideo({ cle }: { cle: string }) {
  const url = useUrlR2(cle);
  const player = useVideoPlayer(url ?? null, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => player.release();
  }, [player]);

  if (!url) {
    return (
      <View
        style={{
          height: 220,
          borderRadius: rayons.md,
          backgroundColor: "rgba(96,165,250,0.1)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="videocam" size={48} color="#60A5FA" />
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: rayons.md,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: 220 }}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
}

function mimeDepuisType(type: string): string {
  switch (type) {
    case "audio":
      return "audio/mpeg";
    case "video":
      return "video/mp4";
    case "pdf":
      return "application/pdf";
    case "image":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function LigneInfo({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ width: 110 }}>
        {label}
      </Texte>
      <Texte variante="petit" poids="semibold" style={{ flex: 1 }} numberOfLines={2}>
        {valeur}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
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
