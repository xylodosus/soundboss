import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { EtatVide } from "@/components/ui/etat-vide";
import { LONGUEUR_MIN, type ResultatRecherche, type TypeResultat } from "@/lib/queries/recherche";
import { couleurs, espacement, rayons } from "@/lib/theme";

const APPARENCE: Record<TypeResultat, { icone: keyof typeof Ionicons.glyphMap; couleur: string }> = {
  audio: { icone: "musical-notes-outline", couleur: couleurs.warmGold },
  fichier: { icone: "document-outline", couleur: couleurs.terracottaLight },
  projet: { icone: "albums-outline", couleur: couleurs.success },
};

/**
 * Recherche en pleine page.
 *
 * Le composant ne connaît ni les tables ni la navigation : il reçoit des
 * résultats et rend le choix à l'appelant. C'est ce qui permet de le servir à
 * l'identique au groupe et à l'espace personnel, qui ne cherchent pas dans les
 * mêmes données.
 */
export function ModalRecherche({
  visible,
  onFermer,
  terme,
  surTerme,
  resultats,
  chargement,
  surChoisir,
  placeholder = "Rechercher un audio, un fichier, un projet…",
}: {
  visible: boolean;
  onFermer: () => void;
  terme: string;
  surTerme: (t: string) => void;
  resultats: ResultatRecherche[];
  chargement: boolean;
  surChoisir: (resultat: ResultatRecherche) => void;
  placeholder?: string;
}) {
  const insets = useSafeAreaInsets();
  const champRef = useRef<TextInput>(null);
  const assezLong = terme.trim().length >= LONGUEUR_MIN;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onFermer}
      statusBarTranslucent
      // Le focus se demande APRÈS la présentation, pas pendant : sur Android,
      // `autoFocus` donne bien le focus au champ mais le clavier ne se lève pas
      // tant que la fenêtre de la modale n'est pas installée. Le court délai
      // laisse l'animation d'ouverture se terminer.
      onShow={() => {
        setTimeout(() => champRef.current?.focus(), Platform.OS === "android" ? 150 : 0);
      }}
    >
      <View style={{ flex: 1, backgroundColor: couleurs.fond, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espacement.sm,
            paddingHorizontal: espacement.lg,
            paddingVertical: espacement.md,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: espacement.sm,
              backgroundColor: couleurs.surfaceCarte,
              borderRadius: rayons.pill,
              paddingHorizontal: espacement.lg,
              minHeight: 44,
            }}
          >
            <Ionicons name="search" size={18} color={couleurs.texteSecondaire} />
            <TextInput
              ref={champRef}
              value={terme}
              onChangeText={surTerme}
              placeholder={placeholder}
              placeholderTextColor={couleurs.texteSecondaire}
              returnKeyType="search"
              style={{ flex: 1, color: couleurs.texte, paddingVertical: 10 }}
              accessibilityLabel="Terme de recherche"
            />
            {terme.length > 0 && (
              <Pressable
                onPress={() => surTerme("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons name="close-circle" size={18} color={couleurs.texteSecondaire} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={onFermer}
            accessibilityRole="button"
            accessibilityLabel="Fermer la recherche"
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: espacement.sm }}
          >
            <Texte variante="petit" poids="semibold" couleur={couleurs.warmGold}>
              Fermer
            </Texte>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: espacement.lg, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {!assezLong ? (
            <EtatVide
              icone="search-outline"
              titre="Que cherches-tu ?"
              message={`Tape au moins ${LONGUEUR_MIN} caractères pour chercher parmi les audios, les fichiers et les projets.`}
            />
          ) : chargement ? (
            <View style={{ paddingVertical: espacement.xxl, alignItems: "center" }}>
              <ActivityIndicator color={couleurs.warmGold} />
            </View>
          ) : resultats.length === 0 ? (
            <EtatVide
              icone="search-outline"
              titre="Aucun résultat"
              message={`Rien ne correspond à « ${terme.trim()} ».`}
            />
          ) : (
            <View style={{ gap: espacement.sm }}>
              {resultats.map((r) => {
                const apparence = APPARENCE[r.type];
                return (
                  <Pressable
                    key={`${r.type}-${r.id}`}
                    onPress={() => surChoisir(r)}
                    accessibilityRole="button"
                    accessibilityLabel={r.titre}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: espacement.md,
                      minHeight: 56,
                      paddingHorizontal: espacement.lg,
                      borderRadius: rayons.md,
                      backgroundColor: couleurs.surfaceCarte,
                    }}
                  >
                    <Ionicons name={apparence.icone} size={20} color={apparence.couleur} />
                    <View style={{ flex: 1, paddingVertical: espacement.md }}>
                      <Texte variante="petit" poids="semibold" numberOfLines={1}>
                        {r.titre}
                      </Texte>
                      {r.sousTitre && (
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {r.sousTitre}
                        </Texte>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={couleurs.texteSecondaire} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Petit état local du terme, pour ne pas le dupliquer chez chaque appelant. */
export function useTermeRecherche() {
  return useState("");
}
