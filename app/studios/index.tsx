import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCatalogueStudios, libelleUniteCourt, vedetteDe } from "@/lib/queries/studios";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { VisuelGroupe } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Champ } from "@/components/ui/champ";
import { SqueletteListe } from "@/components/ui/etat-vide";

export default function Studios() {
  const router = useRouter();
  const { data: studios = [], isLoading } = useCatalogueStudios();
  const [recherche, setRecherche] = useState("");

  const filtres = studios.filter(
    (s) =>
      s.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      (s.ville ?? "").toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <Ecran>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Texte variante="titre2" poids="extrabold">
            Studios
          </Texte>
          <Texte variante="micro" couleur={couleurs.texteSecondaire}>
            Réserve ton espace de répétition
          </Texte>
          <Champ
            placeholder="Rechercher un studio ou une ville…"
            value={recherche}
            onChangeText={setRecherche}
            style={{ marginTop: 12 }}
          />
        </View>

        <FlatList
          data={filtres}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
          ListEmptyComponent={
            isLoading ? (
              <View>
                <SqueletteListe lignes={2} hauteur={150} />
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="business-outline" size={32} color={couleurs.terracottaLight} />
                <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ marginTop: 10 }}>
                  Aucun studio trouvé.
                </Texte>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/studios/${item.id}`)}
              style={{
                borderRadius: rayons.lg,
                borderWidth: 1,
                borderColor: couleurs.bordure,
                backgroundColor: couleurs.surfaceCarte,
                overflow: "hidden",
              }}
            >
              <VisuelGroupe url={item.photos_urls?.[0]} style={{ width: "100%", height: 120 }} />
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Texte poids="extrabold" variante="corps" style={{ flex: 1 }}>
                    {item.nom}
                  </Texte>
                  {item.note_moyenne ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="star" size={14} color={couleurs.warmGold} />
                      <Texte variante="micro" poids="bold">
                        {item.note_moyenne.toFixed(1)}
                      </Texte>
                    </View>
                  ) : null}
                </View>
                <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ marginTop: 4 }}>
                  {item.ville}
                  {item.type_studio ? ` · ${item.type_studio}` : ""}
                </Texte>
                <Texte variante="petit" poids="bold" couleur={couleurs.warmGold} style={{ marginTop: 8 }}>
                  {(() => {
                    const vedette = vedetteDe(item);
                    return vedette
                      ? `${new Intl.NumberFormat("fr-FR").format(vedette.prix)} F · ${libelleUniteCourt(vedette.unite)}`
                      : item.tarif_heure
                        ? `${new Intl.NumberFormat("fr-FR").format(item.tarif_heure)} F/heure`
                        : "Tarif sur demande";
                  })()}
                </Texte>
              </View>
            </Pressable>
          )}
        />
      </View>
    </Ecran>
  );
}
