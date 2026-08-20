import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMesGroupes, useRejoindreParCode } from "@/lib/queries/groupes";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { VisuelGroupe } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";

export default function MesGroupes() {
  const router = useRouter();
  const { data: groupes = [], isLoading } = useMesGroupes();
  const rejoindre = useRejoindreParCode();
  const dialogue = useDialogue();

  const [menuPlus, setMenuPlus] = useState(false);
  const [menuCode, setMenuCode] = useState(false);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function rejoindreAvecCode() {
    setErreur(null);
    const valeur = code.replace(/[^0-9]/g, "");
    if (valeur.length !== 6) {
      setErreur("Le code d'invitation contient 6 chiffres.");
      return;
    }
    try {
      const resultat = await rejoindre.mutateAsync(valeur);
      setMenuCode(false);
      setCode("");
      dialogue.succes(`Bienvenue dans « ${resultat.groupe_nom} » !`);
      router.push(`/groupes/${resultat.groupe_id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Code invalide.");
    }
  }

  return (
    <Ecran>
      <View style={{ flex: 1 }}>
        {/* En-tête */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Texte variante="titre2" poids="extrabold">
              Mes groupes
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire}>
              {groupes.length} groupe{groupes.length > 1 ? "s" : ""}
            </Texte>
          </View>
          <Pressable
            onPress={() => setMenuPlus(true)}
            accessibilityRole="button"
            accessibilityLabel="Créer ou rejoindre un groupe"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: couleurs.warmGold,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={26} color={couleurs.charcoal} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ padding: 20 }}>
            <SqueletteListe lignes={3} hauteur={90} />
          </View>
        ) : (
          <FlatList
            data={groupes}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
            ListEmptyComponent={
              <EtatVide
                icone="people-outline"
                titre="Aucun groupe"
                message="Crée ton groupe ou rejoins-en un pour commencer à répéter."
                action={() => router.push("/groupes/nouveau")}
                actionTitre="Créer un groupe"
              />
            }
            renderItem={({ item: groupe }) => (
              <Link href={`/groupes/${groupe.id}`} asChild>
                <Pressable
                  style={{
                    borderRadius: rayons.lg,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                    backgroundColor: couleurs.surfaceCarte,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flexDirection: "row" }}>
                    <VisuelGroupe url={groupe.photo_url} style={{ width: 96, height: 96 }} />
                    <View style={{ flex: 1, padding: 14, justifyContent: "center", gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Texte poids="extrabold" variante="corps" style={{ flex: 1 }}>
                          {groupe.nom}
                        </Texte>
                        {groupe.monRole === "chef" && (
                          <Ionicons name="sparkles" size={16} color={couleurs.warmGold} />
                        )}
                        {groupe.monRole === "admin" && (
                          <Ionicons name="shield-checkmark" size={16} color={couleurs.terracottaLight} />
                        )}
                      </View>
                      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                        {(groupe.nombre_membres ?? 0)} membre{groupe.nombre_membres && groupe.nombre_membres > 1 ? "s" : ""}
                        {groupe.ville ? ` · ${groupe.ville}` : ""}
                      </Texte>
                    </View>
                    <View style={{ justifyContent: "center", paddingRight: 14 }}>
                      <Ionicons name="chevron-forward" size={18} color={couleurs.muted} />
                    </View>
                  </View>
                </Pressable>
              </Link>
            )}
          />
        )}

        {/* Menu + : créer ou rejoindre */}
        <Modal
          visible={menuPlus}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuPlus(false)}
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
            onPress={() => setMenuPlus(false)}
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
              <Pressable
                onPress={() => {
                  setMenuPlus(false);
                  router.push("/groupes/nouveau");
                }}
                accessibilityRole="button"
                accessibilityLabel="Créer un groupe"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: rayons.md,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(251,191,36,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="people-outline" size={20} color={couleurs.warmGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold">
                    Créer un groupe
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    Deviens le chef de ton propre groupe
                  </Texte>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMenuPlus(false);
                  setCode("");
                  setErreur(null);
                  setMenuCode(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Rejoindre un groupe"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: rayons.md,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(52,211,153,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="key-outline" size={20} color="#34D399" />
                </View>
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold">
                    Rejoindre un groupe
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    Avec un code d&apos;invitation reçu du chef
                  </Texte>
                </View>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de code d'invitation */}
        <Modal
          visible={menuCode}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuCode(false)}
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
            onPress={() => setMenuCode(false)}
          >
            <Pressable
              style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: rayons.lg,
                backgroundColor: couleurs.carte,
                borderWidth: 1,
                borderColor: couleurs.bordureForte,
                padding: 20,
                gap: 12,
              }}
              onPress={() => {}}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Texte variante="titre3" poids="extrabold" style={{ flex: 1 }}>
                  Rejoindre un groupe
                </Texte>
                <Pressable
                  onPress={() => setMenuCode(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color={couleurs.texteSecondaire} />
                </Pressable>
              </View>

              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Saisis le code à 6 chiffres reçu du chef du groupe.
              </Texte>

              <Champ
                placeholder="Code (ex : 123456)"
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                autoFocus
                erreur={!!erreur}
              />
              {erreur && (
                <Texte variante="micro" couleur={couleurs.danger}>
                  {erreur}
                </Texte>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Bouton
                  titre="Rejoindre"
                  chargement={rejoindre.isPending}
                  disabled={code.length !== 6}
                  onPress={rejoindreAvecCode}
                />
                <Bouton variante="secondaire" titre="Annuler" onPress={() => setMenuCode(false)} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Ecran>
  );
}
