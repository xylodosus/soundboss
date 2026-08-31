import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { supabase, utilisateurId } from "@/lib/supabase";
import {
  useEnvoyerMessage,
  useMarquerLu,
  useMessages,
  useModifierMessage,
  useRealtimeMessages,
  useSupprimerMessage,
} from "@/lib/queries/chat";
import { useGroupe, useMembresGroupe, usePupitresGroupe } from "@/lib/queries/groupes";
import { televerserFichier } from "@/lib/r2";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { formatJour, memeJour } from "@/lib/format";
import { debutDeSerie, nomAuteur } from "@/lib/chat-affichage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ModalEnregistrement } from "@/components/ui/modal-enregistrement";
import { VignetteImage } from "@/components/ui/vignette-fichier";
import { ModalDetailFichier, type FichierDetail } from "@/components/groupe/modal-detail-fichier";
import { useDialogue } from "@/lib/dialogue";
import * as Clipboard from "expo-clipboard";

const TAILLE_MAX_OCTETS = 32 * 1024 * 1024; // 32 Mo par fichier dans le chat

type MessageChat = {
  id: string;
  type: string;
  contenu: string | null;
  fichier_url: string | null;
  fichier_nom: string | null;
  fichier_taille: number | null;
  created_at: string | null;
  est_modifie: boolean | null;
  user_id: string | null;
  mentions: string[] | null;
  user: { id: string; prenom: string | null; nom: string | null } | null;
  parent: {
    id: string;
    user_id: string | null;
    contenu: string | null;
    type: string | null;
    fichier_nom: string | null;
    user: { id: string; prenom: string | null; nom: string | null } | null;
  } | null;
};

function typePieceJointe(message: MessageChat): "image" | "video" | "audio" | "autre" {
  if (message.type === "image") return "image";
  if (message.type === "audio") return "audio";
  const nom = (message.fichier_nom ?? "").toLowerCase();
  if (/\.(mp4|mov|m4v|webm|mkv|avi)$/.test(nom)) return "video";
  return "autre";
}

function versFichierDetail(
  message: MessageChat,
  nomPupitre: string | null
): FichierDetail {  const type = typePieceJointe(message);
  const nom = message.fichier_nom ?? (type === "audio" ? "Message vocal" : "Fichier");
  const infos: { label: string; valeur: string }[] = [];
  if (message.user) {
    infos.push({
      label: "Envoyé par",
      valeur: `${message.user.prenom ?? ""} ${message.user.nom ?? ""}`.trim(),
    });
  }
  infos.push({ label: "Discussion", valeur: nomPupitre ?? "Générale" });
  if (message.created_at) {
    infos.push({
      label: "Date",
      valeur: new Date(message.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    });
  }
  return {
    id: message.id,
    nom,
    cle: message.fichier_url ?? "",
    type: type === "image" || type === "video" || type === "audio" ? type : "autre",
    tailleOctets: message.fichier_taille,
    format: nom.includes(".") ? nom.split(".").pop() : null,
    imageCle: null,
    estDeletable: false,
    infos,
  };
}

export default function Chat() {
  const { id: groupeId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pupitreId, setPupitreId] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [envoiFichier, setEnvoiFichier] = useState(false);
  const [modeEnregistrement, setModeEnregistrement] = useState(false);
  const [menuAttachement, setMenuAttachement] = useState(false);
  const [fichierSelectionne, setFichierSelectionne] = useState<FichierDetail | null>(null);
  const [menuMessage, setMenuMessage] = useState<MessageChat | null>(null);
  const [messageEnEdition, setMessageEnEdition] = useState<MessageChat | null>(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [messageReponse, setMessageReponse] = useState<MessageChat | null>(null);
  const [menuMentions, setMenuMentions] = useState(false);
  const dialogue = useDialogue();

  const { data: messages = [] } = useMessages(groupeId, pupitreId);
  const { data: groupe } = useGroupe(groupeId);
  const { data: pupitres = [] } = usePupitresGroupe(groupeId);
  const { data: membres = [] } = useMembresGroupe(groupeId);
  useRealtimeMessages(groupeId, pupitreId);

  const envoyer = useEnvoyerMessage();
  const marquerLu = useMarquerLu();
  const modifier = useModifierMessage();
  const supprimerMessage = useSupprimerMessage();

  const { data: monId } = useQuery({
    queryKey: ["mon-user-id"],
    queryFn: utilisateurId,
  });

  // Le membre ne voit que la discussion générale + son propre pupitre ; le chef/admin voit tout.
  const { data: moi } = useQuery({
    queryKey: ["moi-membre", groupeId],
    queryFn: async () => {
      const userId = await utilisateurId();
      const { data } = await supabase
        .from("groupe_membres")
        .select("id, role_id")
        .eq("groupe_id", groupeId)
        .eq("user_id", userId)
        .eq("statut", "actif")
        .maybeSingle();
      return (data as { id: string; role_id: string | null } | null) ?? null;
    },
  });
  const { data: estGestionnaire = false } = useQuery({
    queryKey: ["chef-admin-groupe", groupeId],
    queryFn: async () => {
      const { data } = await supabase.rpc("est_chef_ou_admin_groupe", { p_groupe_id: groupeId });
      return data ?? false;
    },
  });

  const pupitresVisibles = estGestionnaire
    ? pupitres
    : pupitres.filter((p) => p.id === moi?.role_id);
  const nomPupitreActif = pupitreId
    ? (pupitres.find((p) => p.id === pupitreId)?.nom ?? null)
    : null;

  // Les mentions correspondent à la discussion courante : tous les membres
  // dans le chat général, uniquement les membres du pupitre dans un chat de pupitre.
  const membresMentionnables = membres.filter(
    (m) => m.statut === "actif" && (!pupitreId || m.role_id === pupitreId)
  );

  const liste = useRef<FlatList>(null);
  const refsSwipe = useRef<Map<string, Swipeable>>(new Map());
  const inputTexte = useRef<TextInput>(null);

  function repondre(message: MessageChat) {
    setMessageReponse(message);
    inputTexte.current?.focus();
  }

  // Compensation du clavier Android (edge-to-edge) : hauteur exacte du clavier.
  const [hauteurClavier, setHauteurClavier] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const afficher = Keyboard.addListener("keyboardDidShow", (e) =>
      setHauteurClavier(e.endCoordinates.height)
    );
    const masquer = Keyboard.addListener("keyboardDidHide", () => setHauteurClavier(0));
    return () => {
      afficher.remove();
      masquer.remove();
    };
  }, []);

  // Marquage lu quand de nouveaux messages arrivent
  useEffect(() => {
    const nonLus = messages.filter((m) => m.user_id !== monId).map((m) => m.id);
    if (nonLus.length > 0) marquerLu.mutate({ groupeId, messageIds: nonLus });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function envoyerTexte() {
    if (!texte.trim()) return;
    await envoyer.mutateAsync({
      groupeId,
      contenu: texte.trim(),
      pupitreId,
      parentMessageId: messageReponse?.id ?? null,
      mentionIds: extraireMentions(texte, membresMentionnables),
    });
    setTexte("");
    setMessageReponse(null);
  }

  async function envoyerFichier() {
    setMenuAttachement(false);
    const resultat = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (resultat.canceled || !resultat.assets[0]) return;
    const fichier = resultat.assets[0];
    if (fichier.size && fichier.size > TAILLE_MAX_OCTETS) {
      dialogue.erreur("Fichier trop volumineux : la limite est de 32 Mo dans le chat.");
      return;
    }
    setEnvoiFichier(true);
    try {
      const { key } = await televerserFichier(
        {
          uri: fichier.uri,
          name: fichier.name,
          type: fichier.mimeType ?? "application/octet-stream",
        },
        "messages"
      );
      await envoyer.mutateAsync({
        groupeId,
        type: "fichier",
        contenu: null,
        fichier: { url: key, nom: fichier.name, taille: fichier.size },
        pupitreId,
        parentMessageId: messageReponse?.id ?? null,
      });
      setMessageReponse(null);
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Impossible d'envoyer le fichier.");
    } finally {
      setEnvoiFichier(false);
    }
  }

  async function envoyerImage() {
    setMenuAttachement(false);
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (resultat.canceled || !resultat.assets[0]) return;
    const asset = resultat.assets[0];
    if (asset.fileSize && asset.fileSize > TAILLE_MAX_OCTETS) {
      dialogue.erreur("Image trop volumineuse : la limite est de 32 Mo dans le chat.");
      return;
    }
    setEnvoiFichier(true);
    try {
      const { key } = await televerserFichier(
        {
          uri: asset.uri,
          name: asset.fileName ?? "image.jpg",
          type: asset.mimeType ?? "image/jpeg",
        },
        "messages"
      );
      await envoyer.mutateAsync({
        groupeId,
        type: "image",
        contenu: null,
        fichier: { url: key, nom: asset.fileName ?? "image.jpg" },
        pupitreId,
        parentMessageId: messageReponse?.id ?? null,
      });
      setMessageReponse(null);
    } catch (e) {
      dialogue.erreur(e instanceof Error ? e.message : "Impossible d'envoyer l'image.");
    } finally {
      setEnvoiFichier(false);
    }
  }

  function ajouterAudio(url: string, titre: string) {
    setModeEnregistrement(false);
    envoyer.mutate({
      groupeId,
      type: "audio",
      contenu: null,
      fichier: { url, nom: titre },
      pupitreId,
      parentMessageId: messageReponse?.id ?? null,
    });
    setMessageReponse(null);
  }

  function ouvrirEdition(message: MessageChat) {
    setMenuMessage(null);
    setTexteEdition(message.contenu ?? "");
    setMessageEnEdition(message);
  }

  async function enregistrerEdition() {
    if (!messageEnEdition || !texteEdition.trim()) return;
    try {
      await modifier.mutateAsync({
        messageId: messageEnEdition.id,
        groupeId,
        pupitreId,
        contenu: texteEdition.trim(),
      });
      setMessageEnEdition(null);
      setTexteEdition("");
    } catch {
      dialogue.erreur("Impossible de modifier le message.");
    }
  }

  async function supprimerMessageConfirme(message: MessageChat) {
    setMenuMessage(null);
    const ok = await dialogue.confirmer({
      titre: "Supprimer ce message ?",
      message: "Le message sera définitivement supprimé pour tout le groupe.",
    });
    if (!ok) return;
    try {
      await supprimerMessage.mutateAsync({ messageId: message.id, groupeId, pupitreId });
    } catch {
      dialogue.erreur("Impossible de supprimer le message.");
    }
  }

  return (    <Ecran>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        style={{ flex: 1 }}
      >
        {/* En-tête */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: couleurs.bordure,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ width: 36 }}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Texte poids="extrabold" numberOfLines={1}>
              {groupe?.nom ?? "Chat du groupe"}
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {pupitreId
                ? `Discussion du pupitre : ${pupitres.find((p) => p.id === pupitreId)?.nom ?? ""}`
                : "Discussion générale"}
            </Texte>
          </View>
        </View>

        {/* Sélecteur de discussion (chat par pupitre) */}
        {pupitresVisibles.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}>
            <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire}>
              DISCUSSIONS
            </Texte>
            <FlatList
              horizontal
              data={[{ id: null, nom: "Général" }, ...pupitresVisibles]}
              keyExtractor={(p) => p.id ?? "general"}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const actif = pupitreId === item.id;
                return (
                  <Pressable
                    onPress={() => setPupitreId(item.id)}
                    style={{
                      borderRadius: rayons.pill,
                      borderWidth: 1,
                      borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                      backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                    }}
                  >
                    <Texte
                      variante="petit"
                      poids={actif ? "bold" : "medium"}
                      couleur={actif ? couleurs.warmGold : couleurs.texteSecondaire}
                    >
                      {item.nom}
                    </Texte>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={liste}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => liste.current?.scrollToEnd({ animated: true })}
          renderItem={({ item: message, index }) => {
            const moi = message.user_id === monId;
            const precedent = messages[index - 1];
            const nouveauJour = !precedent || !memeJour(precedent.created_at, message.created_at);
            const afficherEntete = !moi && debutDeSerie(message, precedent ?? null, nouveauJour);

            return (
              <Swipeable
                ref={(ref) => {
                  if (ref) refsSwipe.current.set(message.id, ref);
                  else refsSwipe.current.delete(message.id);
                }}
                renderLeftActions={() => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "rgba(251,191,36,0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(251,191,36,0.4)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="return-down-back" size={18} color={couleurs.warmGold} />
                    </View>
                  </View>
                )}
                onSwipeableOpen={(direction) => {
                  if (direction === "left") {
                    refsSwipe.current.get(message.id)?.close();
                    repondre(message);
                  }
                }}
                overshootLeft={false}
              >
                <View>
                  {nouveauJour && (
                    <View style={{ alignItems: "center", marginVertical: 8 }}>
                      <Texte variante="micro" poids="semibold" couleur={couleurs.texteSecondaire}>
                        {formatJour(message.created_at)}
                      </Texte>
                    </View>
                  )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 8,
                    justifyContent: moi ? "flex-end" : "flex-start",
                  }}
                >
                  {!moi && (
                    <View style={{ width: 30 }}>
                      {afficherEntete && (
                        <Avatar
                          prenom={message.user?.prenom}
                          nom={message.user?.nom}
                          url={message.user?.avatar_url}
                          taille={30}
                        />
                      )}
                    </View>
                  )}
                  <Pressable
                    onLongPress={() => setMenuMessage(message)}
                    delayLongPress={300}
                    style={{
                      maxWidth: "78%",
                      borderRadius: 18,
                      borderBottomRightRadius: moi ? 6 : 18,
                      borderBottomLeftRadius: moi ? 18 : 6,
                      backgroundColor: moi ? "rgba(224,122,86,0.18)" : "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: moi ? "rgba(224,122,86,0.25)" : couleurs.bordure,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      overflow: "hidden",
                    }}
                  >
                    {afficherEntete && (
                      <Texte
                        variante="micro"
                        poids="bold"
                        couleur={couleurs.warmGold}
                        numberOfLines={1}
                        style={{ marginBottom: 4 }}
                      >
                        {nomAuteur(message.user)}
                      </Texte>
                    )}
                    {message.parent && (
                      <View
                        style={{
                          borderLeftWidth: 3,
                          borderLeftColor: couleurs.warmGold,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Texte variante="micro" poids="bold" couleur={couleurs.warmGold} numberOfLines={1}>
                          {nomMembre(message.parent)}
                        </Texte>
                        <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={2}>
                          {apercuMessage(message.parent)}
                        </Texte>
                      </View>
                    )}
                    {message.contenu && (
                      <TexteAvecMentions
                        texte={message.contenu}
                        membres={membres}
                        mentionIds={message.mentions ?? []}
                      />
                    )}
                    {typePieceJointe(message) === "image" && message.fichier_url ? (
                      <Pressable
                        onPress={() => setFichierSelectionne(versFichierDetail(message, nomPupitreActif))}
                        accessibilityRole="button"
                        accessibilityLabel="Voir l'image"
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          marginVertical: 2,
                          width: 240,
                          height: 240,
                        }}
                      >
                        <VignetteImage cle={message.fichier_url} hauteur={240} />
                      </Pressable>
                    ) : typePieceJointe(message) === "video" && message.fichier_url ? (
                      <Pressable
                        onPress={() => setFichierSelectionne(versFichierDetail(message, nomPupitreActif))}
                        accessibilityRole="button"
                        accessibilityLabel="Voir la vidéo"
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          marginVertical: 2,
                          backgroundColor: "rgba(96,165,250,0.1)",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 240,
                          height: 240,
                        }}
                      >
                        <Ionicons name="videocam" size={40} color="#60A5FA" />
                        <View
                          style={{
                            position: "absolute",
                            right: 8,
                            bottom: 8,
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: "rgba(0,0,0,0.55)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="play" size={14} color="#FFFFFF" />
                        </View>
                      </Pressable>
                    ) : typePieceJointe(message) === "audio" && message.fichier_url ? (
                      <Pressable
                        onPress={() => setFichierSelectionne(versFichierDetail(message, nomPupitreActif))}
                        accessibilityRole="button"
                        accessibilityLabel="Voir le message vocal"
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "rgba(251,191,36,0.15)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="musical-notes" size={16} color={couleurs.warmGold} />
                        </View>
                        <Texte variante="petit" poids="semibold">
                          Message vocal
                        </Texte>
                      </Pressable>
                    ) : message.fichier_url ? (
                      <Pressable
                        onPress={() => setFichierSelectionne(versFichierDetail(message, nomPupitreActif))}
                        accessibilityRole="button"
                        accessibilityLabel="Voir le fichier"
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        <Ionicons name="document-attach-outline" size={18} color={couleurs.warmGold} />
                        <Texte variante="petit" poids="semibold" numberOfLines={1} style={{ maxWidth: 180 }}>
                          {message.fichier_nom ?? "Fichier"}
                        </Texte>
                      </Pressable>
                    ) : null}
                    <Texte
                      variante="micro"
                      couleur={couleurs.texteSecondaire}
                      style={{ alignSelf: "flex-end", marginTop: 2 }}
                    >
                      {message.est_modifie ? "modifié · " : ""}
                      {message.created_at
                        ? new Date(message.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </Texte>
                  </Pressable>
                </View>
                </View>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="chatbubbles-outline" size={36} color={couleurs.terracottaLight} />
              <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 12 }}>
                Lance la conversation !
              </Texte>
            </View>
          }
          ListFooterComponent={
            envoiFichier ? (
              <View style={{ alignItems: "flex-start", marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    maxWidth: "78%",
                    borderRadius: 18,
                    borderBottomLeftRadius: 6,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <ActivityIndicator size="small" color={couleurs.warmGold} />
                  <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                    Envoi en cours…
                  </Texte>
                </View>
              </View>
            ) : null
          }
        />

        {/* Menu d'attachement */}
        {menuAttachement && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 12,
              paddingBottom: 8,
            }}
          >
            <Pressable
              onPress={envoyerImage}
              accessibilityRole="button"
              accessibilityLabel="Envoyer une image"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: rayons.pill,
                borderWidth: 1,
                borderColor: "rgba(52,211,153,0.35)",
                backgroundColor: "rgba(52,211,153,0.1)",
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="image-outline" size={16} color="#34D399" />
              <Texte variante="petit" poids="bold" couleur="#34D399">
                Image
              </Texte>
            </Pressable>
            <Pressable
              onPress={envoyerFichier}
              accessibilityRole="button"
              accessibilityLabel="Envoyer un fichier"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: rayons.pill,
                borderWidth: 1,
                borderColor: "rgba(96,165,250,0.35)",
                backgroundColor: "rgba(96,165,250,0.1)",
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="document-attach-outline" size={16} color="#60A5FA" />
              <Texte variante="petit" poids="bold" couleur="#60A5FA">
                Fichiers
              </Texte>
            </Pressable>
          </View>
        )}

        {/* Barre de modification */}
        {messageEnEdition && (
          <View
            style={{
              paddingHorizontal: 12,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="create-outline" size={14} color={couleurs.warmGold} />
              <Texte variante="micro" poids="bold" couleur={couleurs.warmGold} style={{ flex: 1 }}>
                Modifier le message
              </Texte>
              <Pressable
                onPress={() => {
                  setMessageEnEdition(null);
                  setTexteEdition("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Annuler la modification"
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={couleurs.texteSecondaire} />
              </Pressable>
            </View>
            <TextInput
              placeholder="Nouveau message…"
              placeholderTextColor={couleurs.texteFaible}
              value={texteEdition}
              onChangeText={setTexteEdition}
              style={{
                minHeight: 44,
                borderRadius: 22,
                backgroundColor: couleurs.surfaceCarte,
                paddingHorizontal: 16,
                color: couleurs.texte,
                fontFamily: police.regular,
                fontSize: 15,
              }}
            />
            <Pressable
              onPress={enregistrerEdition}
              disabled={!texteEdition.trim() || modifier.isPending}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer la modification"
              style={{
                alignSelf: "flex-end",
                borderRadius: rayons.pill,
                backgroundColor: texteEdition.trim() ? couleurs.warmGold : "rgba(255,255,255,0.1)",
                paddingHorizontal: 18,
                paddingVertical: 8,
                opacity: modifier.isPending ? 0.6 : 1,
              }}
            >
              <Texte variante="petit" poids="bold" couleur={texteEdition.trim() ? couleurs.charcoal : couleurs.muted}>
                {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
              </Texte>
            </Pressable>
          </View>
        )}

        {/* Barre de réponse */}
        {messageReponse && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 12,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                borderLeftWidth: 3,
                borderLeftColor: couleurs.warmGold,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Texte variante="micro" poids="bold" couleur={couleurs.warmGold} numberOfLines={1}>
                Réponse à {nomMembre(messageReponse)}
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                {apercuMessage(messageReponse)}
              </Texte>
            </View>
            <Pressable
              onPress={() => setMessageReponse(null)}
              accessibilityRole="button"
              accessibilityLabel="Annuler la réponse"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>
        )}

        {/* Composeur */}
        <View
          style={{
            padding: 12,
            paddingBottom: Math.max(insets.bottom, 12) + hauteurClavier,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            borderTopWidth: 1,
            borderTopColor: couleurs.bordure,
          }}
        >
          <Pressable
            onPress={() => setMenuAttachement((v) => !v)}
            disabled={envoiFichier}
            accessibilityRole="button"
            accessibilityLabel="Joindre une image ou un fichier"
            hitSlop={10}
            style={{ width: 34, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="attach" size={20} color={couleurs.texte} />
          </Pressable>
          <Pressable
            onPress={() => setModeEnregistrement(true)}
            accessibilityRole="button"
            accessibilityLabel="Envoyer un message vocal"
            hitSlop={10}
            style={{ width: 34, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="mic" size={19} color={couleurs.danger} />
          </Pressable>
          <Pressable
            onPress={() => setMenuMentions(true)}
            accessibilityRole="button"
            accessibilityLabel="Mentionner un membre"
            hitSlop={10}
            style={{ width: 34, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="at" size={19} color={couleurs.warmGold} />
          </Pressable>
          <TextInput
            ref={inputTexte}
            placeholder="Écris un message…"
            placeholderTextColor={couleurs.texteFaible}
            value={texte}
            onChangeText={setTexte}
            multiline
            submitBehavior="newline"
            textAlignVertical="top"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 22,
              backgroundColor: couleurs.surfaceCarte,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 12 : 8,
              paddingBottom: Platform.OS === "ios" ? 12 : 8,
              color: couleurs.texte,
              fontFamily: police.regular,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={envoyerTexte}
            disabled={!texte.trim()}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: texte.trim() ? couleurs.warmGold : "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="send" size={18} color={texte.trim() ? couleurs.charcoal : couleurs.muted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>

      <ModalEnregistrement
        visible={modeEnregistrement}
        onFermer={() => setModeEnregistrement(false)}
        dossier="messages"
        onAjouter={ajouterAudio}
      />

      <ModalDetailFichier
        fichier={fichierSelectionne}
        visible={!!fichierSelectionne}
        onFermer={() => setFichierSelectionne(null)}
      />

      <MenuActionsMessage
        message={menuMessage}
        monId={monId ?? null}
        estGestionnaire={estGestionnaire}
        onFermer={() => setMenuMessage(null)}
        onModifier={ouvrirEdition}
        onSupprimer={supprimerMessageConfirme}
        onRepondre={(message) => {
          setMenuMessage(null);
          setMessageReponse(message);
        }}
        onCopier={async (message) => {
          await Clipboard.setStringAsync(message.contenu ?? "");
          setMenuMessage(null);
          dialogue.succes("Message copié.");
        }}
      />

      <ModalMentions
        visible={menuMentions}
        membres={membresMentionnables}
        onFermer={() => setMenuMentions(false)}
        onChoisir={(membre) => {
          setMenuMentions(false);
          const prenom = membre.user?.prenom ?? "";
          const nom = membre.user?.nom ?? "";
          const nomComplet = `${prenom} ${nom}`.trim();
          setTexte((t) => (t ? `${t} @${nomComplet} ` : `@${nomComplet} `));
        }}
      />
    </Ecran>
  );
}

/** Rendu du texte avec les mentions @ mises en évidence. */
function TexteAvecMentions({
  texte,
  membres,
  mentionIds,
}: {
  texte: string;
  membres: MembreMention[];
  mentionIds: string[];
}) {
  const noms = new Set(
    membres
      .filter((m) => mentionIds.includes(m.user?.id ?? ""))
      .flatMap((m) => {
        const prenom = m.user?.prenom?.trim();
        const nom = m.user?.nom?.trim();
        const liste = prenom ? [`@${prenom}`] : [];
        if (prenom && nom) liste.push(`@${prenom} ${nom}`);
        return liste;
      })
  );

  if (noms.size === 0) {
    return (
      <Texte variante="corps" style={{ lineHeight: 21 }}>
        {texte}
      </Texte>
    );
  }

  const morceaux: { texte: string; mention: boolean }[] = [];
  let restant = texte;
  while (restant) {
    let premier: { index: number; nom: string } | null = null;
    for (const nom of noms) {
      const index = restant.indexOf(nom);
      if (
        index >= 0 &&
        (premier === null ||
          index < premier.index ||
          (index === premier.index && nom.length > premier.nom.length))
      ) {
        premier = { index, nom };
      }
    }
    if (!premier) {
      morceaux.push({ texte: restant, mention: false });
      break;
    }
    if (premier.index > 0) {
      morceaux.push({ texte: restant.slice(0, premier.index), mention: false });
    }
    morceaux.push({ texte: premier.nom, mention: true });
    restant = restant.slice(premier.index + premier.nom.length);
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {morceaux.map((m, i) =>
        m.mention ? (
          <Texte key={i} variante="corps" poids="bold" couleur={couleurs.warmGold} style={{ lineHeight: 21 }}>
            {m.texte}
          </Texte>
        ) : (
          <Texte key={i} variante="corps" style={{ lineHeight: 21 }}>
            {m.texte}
          </Texte>
        )
      )}
    </View>
  );
}

/** Modal de sélection d'un membre à mentionner (@). */
function ModalMentions({
  visible,
  membres,
  onFermer,
  onChoisir,
}: {
  visible: boolean;
  membres: {
    id: string;
    user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
  }[];
  onFermer: () => void;
  onChoisir: (membre: (typeof membres)[number]) => void;
}) {
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
            maxWidth: 340,
            maxHeight: "80%",
            borderRadius: rayons.lg,
            backgroundColor: couleurs.carte,
            borderWidth: 1,
            borderColor: couleurs.bordureForte,
            padding: 16,
          }}
          onPress={() => {}}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
              Mentionner un membre
            </Texte>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: couleurs.surfaceCarte,
              }}
            >
              <Ionicons name="close" size={18} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>
          <ScrollView bounces={false} style={{ flexShrink: 1 }}>
            <View style={{ gap: 6 }}>
              {membres.map((membre) => (
                <Pressable
                  key={membre.id}
                  onPress={() => onChoisir(membre)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: rayons.md,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Avatar
                    prenom={membre.user?.prenom}
                    nom={membre.user?.nom}
                    url={membre.user?.avatar_url}
                    taille={32}
                  />
                  <Texte variante="petit" poids="semibold" style={{ flex: 1 }}>
                    {membre.user?.prenom} {membre.user?.nom}
                  </Texte>
                  <Ionicons name="at" size={16} color={couleurs.warmGold} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DELAI_MODIFICATION_MINUTES = 30;

type MembreMention = {
  id: string;
  user: { id: string; prenom: string | null; nom: string | null } | null;
};

/** Extrait les ids des membres mentionnés (« @Prénom Nom » ou « @Prénom ») dans le texte. */
function extraireMentions(texte: string, membres: MembreMention[]): string[] {
  const ids: string[] = [];
  for (const membre of membres) {
    const prenom = membre.user?.prenom?.trim();
    const nom = membre.user?.nom?.trim();
    if (!prenom) continue;
    const nomComplet = nom ? `${prenom} ${nom}` : prenom;
    if (texte.includes(`@${nomComplet}`) || texte.includes(`@${prenom}`)) {
      if (membre.user?.id && !ids.includes(membre.user.id)) ids.push(membre.user.id);
    }
  }
  return ids;
}

function nomMembre(message: MessageChat | null | undefined): string {
  if (!message?.user) return "Message";
  return `${message.user.prenom ?? ""} ${message.user.nom ?? ""}`.trim() || "Message";
}

/** Aperçu d'un message (pour la barre de réponse). */
function apercuMessage(message: MessageChat): string {
  if (message.contenu) return message.contenu;
  const type = typePieceJointe(message);
  if (type === "image") return "[Image]";
  if (type === "video") return "[Vidéo]";
  if (type === "audio") return "[Message vocal]";
  return message.fichier_nom ?? "[Fichier]";
}

function MenuActionsMessage({
  message,
  monId,
  estGestionnaire,
  onFermer,
  onModifier,
  onSupprimer,
  onRepondre,
  onCopier,
}: {
  message: MessageChat | null;
  monId: string | null;
  estGestionnaire: boolean;
  onFermer: () => void;
  onModifier: (message: MessageChat) => void;
  onSupprimer: (message: MessageChat) => void;
  onRepondre: (message: MessageChat) => void;
  onCopier: (message: MessageChat) => void;
}) {
  if (!message) return null;

  const estEnvoyeur = monId !== null && message.user_id === monId;
  const modifiable =
    estEnvoyeur &&
    !!message.contenu &&
    !!message.created_at &&
    Date.now() - new Date(message.created_at).getTime() < DELAI_MODIFICATION_MINUTES * 60 * 1000;
  const supprimable = estEnvoyeur || estGestionnaire;

  return (
    <Modal
      visible
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
            maxWidth: 340,
            borderRadius: rayons.lg,
            backgroundColor: couleurs.carte,
            borderWidth: 1,
            borderColor: couleurs.bordureForte,
            padding: 12,
            gap: 6,
          }}
          onPress={() => {}}
        >
          {!!message.contenu && (
            <Pressable
              onPress={() => onCopier(message)}
              accessibilityRole="button"
              accessibilityLabel="Copier le message"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: rayons.md,
              }}
            >
              <Ionicons name="copy-outline" size={19} color={couleurs.texte} />
              <Texte poids="semibold">Copier</Texte>
            </Pressable>
          )}
          {modifiable && (
            <Pressable
              onPress={() => onModifier(message)}
              accessibilityRole="button"
              accessibilityLabel="Modifier le message"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderRadius: rayons.md,
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="create-outline" size={18} color={couleurs.warmGold} />
              <Texte variante="petit" poids="semibold">
                Modifier le message
              </Texte>
            </Pressable>
          )}
          {supprimable && (
            <Pressable
              onPress={() => onSupprimer(message)}
              accessibilityRole="button"
              accessibilityLabel="Supprimer le message"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderRadius: rayons.md,
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="trash-outline" size={18} color={couleurs.danger} />
              <Texte variante="petit" poids="semibold" couleur={couleurs.danger}>
                Supprimer le message
              </Texte>
            </Pressable>
          )}
          <Pressable
            onPress={() => onRepondre(message)}
            accessibilityRole="button"
            accessibilityLabel="Répondre au message"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: rayons.md,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="return-down-back-outline" size={18} color={couleurs.warmGold} />
            <Texte variante="petit" poids="semibold">
              Répondre
            </Texte>
          </Pressable>
          {!modifiable && !supprimable && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ padding: 12 }}>
              Aucune action disponible.
            </Texte>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
