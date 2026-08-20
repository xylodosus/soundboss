import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  ressourcesPourProfil,
  useRessourcesEquipe,
  type RessourceEquipe,
  type TypeRessource,
} from "@/lib/queries/ressources-equipe";
import { useProfil } from "@/lib/queries/profil";
import { useDialogue } from "@/lib/dialogue";
import { urlLectureR2 } from "@/lib/r2";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";

const TYPES: { valeur: TypeRessource; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { valeur: "contrat", label: "Contrat", icone: "document-text-outline" },
  { valeur: "loop", label: "Loop", icone: "repeat-outline" },
  { valeur: "style", label: "Style", icone: "color-palette-outline" },
  { valeur: "backing_track", label: "Backing track", icone: "headset-outline" },
  { valeur: "partition", label: "Partition", icone: "musical-notes-outline" },
  { valeur: "opportunite", label: "Opportunité", icone: "megaphone-outline" },
];

function typeInfo(type: TypeRessource) {
  return TYPES.find((t) => t.valeur === type) ?? TYPES[0];
}

/** Ressources de la bibliothèque SoundBoss, filtrées par profil + type. */
export function OngletRessources() {
  const { data: ressources = [], isLoading } = useRessourcesEquipe();
  const { data: profil } = useProfil();
  const dialogue = useDialogue();
  const [typeActif, setTypeActif] = useState<TypeRessource | null>(null);

  const visibles = ressourcesPourProfil(ressources, profil?.instruments ?? [], profil?.genres_musicaux ?? []);
  const filtrees = typeActif ? visibles.filter((r) => r.type === typeActif) : visibles;

  const messageVide =
    ressources.length === 0
      ? "La bibliothèque SoundBoss arrive bientôt."
      : visibles.length === 0
        ? "Aucune ressource ne correspond à ton profil pour l'instant."
        : "Aucune ressource de ce type pour le moment.";

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire}>
          BIBLIOTHÈQUE SOUNDBOSS
        </Texte>
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          Contrats, loops, partitions et plus, adaptés à ton profil musical.
        </Texte>
      </View>

      {/* Filtres par type */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Pressable
          onPress={() => setTypeActif(null)}
          accessibilityRole="button"
          accessibilityState={typeActif === null ? { selected: true } : undefined}
          accessibilityLabel="Filtrer : tous les types"
          style={{
            borderRadius: rayons.pill,
            borderWidth: 1,
            borderColor: typeActif === null ? couleurs.warmGold : "rgba(255,255,255,0.12)",
            backgroundColor: typeActif === null ? "rgba(251,191,36,0.14)" : "transparent",
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Texte
            variante="micro"
            poids={typeActif === null ? "bold" : "medium"}
            couleur={typeActif === null ? couleurs.warmGold : couleurs.texte}
          >
            Tous
          </Texte>
        </Pressable>
        {TYPES.map((t) => {
          const actif = typeActif === t.valeur;
          return (
            <Pressable
              key={t.valeur}
              onPress={() => setTypeActif(actif ? null : t.valeur)}
              accessibilityRole="button"
              accessibilityState={actif ? { selected: true } : undefined}
              accessibilityLabel={`Filtrer : ${t.label}`}
              style={{
                borderRadius: rayons.pill,
                borderWidth: 1,
                borderColor: actif ? couleurs.warmGold : "rgba(255,255,255,0.12)",
                backgroundColor: actif ? "rgba(251,191,36,0.14)" : "transparent",
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Texte
                variante="micro"
                poids={actif ? "bold" : "medium"}
                couleur={actif ? couleurs.warmGold : couleurs.texte}
              >
                {t.label}
              </Texte>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <SqueletteListe lignes={3} hauteur={72} />
      ) : filtrees.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Ionicons name="library-outline" size={32} color={couleurs.terracottaLight} />
          <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 10, textAlign: "center" }}>
            {messageVide}
          </Texte>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtrees.map((ressource) => (
            <CarteRessource
              key={ressource.id}
              ressource={ressource}
              onTelecharger={async () => {
                if (!ressource.fichier_url) return;
                try {
                  const url = await urlLectureR2(ressource.fichier_url);
                  if (!url) throw new Error("fichier introuvable");
                  const destination = new File(
                    Paths.cache,
                    `soundboss-${Date.now()}-${ressource.fichier_nom ?? ressource.titre}`
                  );
                  await File.downloadFileAsync(url, destination);
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(destination.uri, {
                      dialogTitle: ressource.titre,
                    });
                  } else {
                    dialogue.succes("Ressource téléchargée.");
                  }
                } catch {
                  dialogue.erreur("Impossible de télécharger la ressource.");
                }
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CarteRessource({
  ressource,
  onTelecharger,
}: {
  ressource: RessourceEquipe;
  onTelecharger: () => void;
}) {
  const info = typeInfo(ressource.type);
  const [enTelechargement, setEnTelechargement] = useState(false);

  async function telecharger() {
    setEnTelechargement(true);
    try {
      await onTelecharger();
    } finally {
      setEnTelechargement(false);
    }
  }

  return (
    <View
      style={{
        borderRadius: rayons.md,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(224,122,86,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={info.icone} size={20} color={couleurs.terracottaLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Texte variante="petit" poids="semibold">
            {ressource.titre}
          </Texte>
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: rayons.pill,
              backgroundColor: "rgba(251,191,36,0.14)",
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginTop: 4,
            }}
          >
            <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
              {info.label}
            </Texte>
          </View>
        </View>
        {ressource.fichier_url && (
          <Pressable
            onPress={telecharger}
            disabled={enTelechargement}
            accessibilityRole="button"
            accessibilityLabel={`Télécharger ${ressource.titre}`}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(251,191,36,0.12)",
              borderWidth: 1,
              borderColor: "rgba(251,191,36,0.35)",
              alignItems: "center",
              justifyContent: "center",
              opacity: enTelechargement ? 0.6 : 1,
            }}
          >
            {enTelechargement ? (
              <ActivityIndicator size="small" color={couleurs.warmGold} />
            ) : (
              <Ionicons name="download-outline" size={18} color={couleurs.warmGold} />
            )}
          </Pressable>
        )}
      </View>

      {ressource.description ? (
        <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={3}>
          {ressource.description}
        </Texte>
      ) : null}

      {ressource.tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {ressource.tags.map((tag) => (
            <View
              key={tag}
              style={{
                borderRadius: rayons.pill,
                backgroundColor: "rgba(255,255,255,0.06)",
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                #{tag}
              </Texte>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
