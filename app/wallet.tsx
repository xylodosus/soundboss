import { ScrollView, View , Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  useAcheterPack,
  usePacksCredits,
  useTransactionsWallet,
  useWallet,
} from "@/lib/queries/profil";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { Squelette } from "@/components/ui/etat-vide";
import { formatDateHeure } from "@/lib/format";

export default function Wallet() {
  const { data: wallet } = useWallet();
  const { data: packs = [] } = usePacksCredits();
  const { data: transactions = [] } = useTransactionsWallet();
  const acheter = useAcheterPack();
  const [packEnCours, setPackEnCours] = useState<string | null>(null);

  async function acheterPack(packId: string, credits: number, prix: number) {
    setPackEnCours(packId);
    try {
      await acheter.mutateAsync({ packId, credits, prix });
    } finally {
      setPackEnCours(null);
    }
  }

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Texte variante="titre2" poids="extrabold">
          Wallet
        </Texte>
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          Tes crédits pour les outils IA
        </Texte>

        {/* Solde */}
        <View
          style={{
            marginTop: 16,
            borderRadius: 24,
            backgroundColor: couleurs.warmGold,
            padding: 24,
          }}
        >
          <Texte variante="micro" poids="bold" couleur={couleurs.charcoal} style={{ opacity: 0.7 }}>
            SOLDE DISPONIBLE
          </Texte>
          <Texte
            variante="titre1"
            poids="extrabold"
            couleur={couleurs.charcoal}
            style={{ marginTop: 6, fontFamily: police.extrabold }}
          >
            {wallet?.solde_credits ?? 0} crédits
          </Texte>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
            <Texte variante="micro" poids="semibold" couleur={couleurs.charcoal} style={{ opacity: 0.7 }}>
              {wallet?.total_achete ?? 0} achetés
            </Texte>
            <Texte variante="micro" poids="semibold" couleur={couleurs.charcoal} style={{ opacity: 0.7 }}>
              {wallet?.total_depense ?? 0} dépensés
            </Texte>
          </View>
        </View>

        {/* Packs */}
        <Texte poids="extrabold" variante="titre3" style={{ marginTop: 24, marginBottom: 12 }}>
          Packs de crédits
        </Texte>
        <View style={{ gap: 10 }}>
          {packs.length === 0 && <Squelette hauteur={80} />}
          {packs.map((pack) => (
            <Pressable
              key={pack.id}
              disabled={packEnCours !== null}
              onPress={() => acheterPack(pack.id, pack.credits, Number(pack.prix))}
              style={{
                borderRadius: rayons.lg,
                borderWidth: 1,
                borderColor: "rgba(251,191,36,0.2)",
                backgroundColor: "rgba(251,191,36,0.05)",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Texte poids="extrabold">{pack.nom}</Texte>
                  {(pack.bonus_credits ?? 0) > 0 && (
                    <View style={{ borderRadius: rayons.pill, backgroundColor: "rgba(52,211,153,0.16)", paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Texte variante="micro" poids="bold" couleur="#34D399">
                        +{pack.bonus_credits} offerts
                      </Texte>
                    </View>
                  )}
                </View>
                <Texte variante="petit" couleur={couleurs.warmGold} poids="bold" style={{ marginTop: 4 }}>
                  {pack.credits} crédits
                </Texte>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Texte poids="extrabold" variante="corps">
                  {Number(pack.prix).toLocaleString("fr-FR")} F
                </Texte>
                <Texte variante="micro" poids="bold" couleur={couleurs.warmGold}>
                  {packEnCours === pack.id ? "Achat…" : "Acheter"}
                </Texte>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Historique */}
        <Texte poids="extrabold" variante="titre3" style={{ marginTop: 24, marginBottom: 12 }}>
          Historique
        </Texte>
        <View style={{ gap: 8 }}>
          {transactions.length === 0 && (
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              Aucune transaction.
            </Texte>
          )}
          {transactions.map((transaction) => (
            <View
              key={transaction.id}
              style={{
                borderRadius: rayons.md,
                borderWidth: 1,
                borderColor: couleurs.bordure,
                backgroundColor: couleurs.surfaceCarte,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor:
                    (transaction.credits ?? 0) >= 0
                      ? "rgba(52,211,153,0.12)"
                      : "rgba(224,122,86,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={(transaction.credits ?? 0) >= 0 ? "add" : "remove"}
                  size={18}
                  color={(transaction.credits ?? 0) >= 0 ? "#34D399" : couleurs.terracottaLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Texte variante="petit" poids="semibold" numberOfLines={1}>
                  {transaction.description ?? transaction.type}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {formatDateHeure(transaction.created_at)}
                </Texte>
              </View>
              <Texte
                variante="petit"
                poids="extrabold"
                couleur={(transaction.credits ?? 0) >= 0 ? "#34D399" : couleurs.terracottaLight}
              >
                {transaction.credits ?? 0 > 0 ? "+" : ""}
                {transaction.credits}
              </Texte>
            </View>
          ))}
        </View>
      </ScrollView>
    </Ecran>
  );
}
