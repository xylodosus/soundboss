import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { Stockage } from "@/lib/stockage";
import { useStockageGroupe } from "@/lib/queries/stockage";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";

/**
 * Vue du stockage : donut et légende, alimentée par une agrégation déjà faite.
 *
 * Le composant ne calcule plus rien : il servait le groupe en ne comptant que
 * les fichiers partagés, laissant de côté les audios de répétition et les
 * pistes extraites — de loin les plus lourds. Le calcul vit maintenant dans
 * `src/lib/stockage.ts`, testé, et sert aussi l'espace personnel.
 */
export function VueStockage({
  stockage,
  isLoading,
  messageVide,
}: {
  stockage: Stockage | undefined;
  isLoading: boolean;
  messageVide: string;
}) {
  const categories = stockage?.categories ?? [];
  const totalGlobal = stockage?.total ?? 0;
  const nbGlobal = stockage?.nb ?? 0;
  const totalMo = totalGlobal / (1024 * 1024);

  return (
    <View style={{ gap: 14 }}>
      {/* Donut + total */}
      <View
        style={{
          borderRadius: rayons.lg,
          borderWidth: 1,
          borderColor: couleurs.bordure,
          backgroundColor: couleurs.surfaceCarte,
          padding: 20,
          alignItems: "center",
          gap: 14,
        }}
      >
        {isLoading ? (
          <SqueletteListe lignes={1} hauteur={160} />
        ) : nbGlobal === 0 ? (
          <EtatVide
            icone="cloud-outline"
            titre="Rien de stocké"
            message={messageVide}
          />
        ) : (
          <>
            <Donut
              parts={categories.map((c) => ({ valeur: c.total, couleur: c.couleur }))}
            />
            <View style={{ alignItems: "center" }}>
              <Texte poids="extrabold" variante="titre2" couleur={couleurs.warmGold}>
                {totalMo.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Mo
              </Texte>
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                {nbGlobal} fichier{nbGlobal > 1 ? "s" : ""} au total
              </Texte>
            </View>
          </>
        )}
      </View>

      {/* Légende par type */}
      {!isLoading && nbGlobal > 0 && (
        <View style={{ gap: 8 }}>
          {categories
            .filter((c) => c.nb > 0)
            .map((c) => {
            const pct = totalGlobal > 0 ? Math.round((c.total / totalGlobal) * 100) : 0;
            return (
              <View
                key={c.cle}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderRadius: rayons.md,
                  borderWidth: 1,
                  borderColor: couleurs.bordure,
                  backgroundColor: couleurs.surfaceCarte,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: c.couleur,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold">
                    {c.label}
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {c.nb} fichier{c.nb > 1 ? "s" : ""} · {pct}%
                  </Texte>
                </View>
                <Texte variante="petit" poids="bold">
                  {(c.total / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Mo
                </Texte>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Graphique circulaire (donut) en SVG. */
function Donut({
  parts,
  taille = 170,
  epaisseur = 24,
}: {
  parts: { valeur: number; couleur: string }[];
  taille?: number;
  epaisseur?: number;
}) {
  const total = parts.reduce((s, p) => s + p.valeur, 0);
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  let cumul = 0;

  return (
    <Svg width={taille} height={taille}>
      <G rotation="-90" origin={`${taille / 2}, ${taille / 2}`}>
        <Circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={epaisseur}
          fill="none"
        />
        {total > 0 &&
          parts
            .filter((p) => p.valeur > 0)
            .map((p, i) => {
              const longueur = (p.valeur / total) * circonference;
              const segment = (
                <Circle
                  key={i}
                  cx={taille / 2}
                  cy={taille / 2}
                  r={rayon}
                  stroke={p.couleur}
                  strokeWidth={epaisseur}
                  fill="none"
                  strokeDasharray={`${longueur} ${circonference - longueur}`}
                  strokeDashoffset={-cumul}
                />
              );
              cumul += longueur;
              return segment;
            })}
      </G>
    </Svg>
  );
}

/** Onglet Stockage d'un groupe. */
export function OngletStockage({ groupeId }: { groupeId: string }) {
  const { data: stockage, isLoading } = useStockageGroupe(groupeId);
  return (
    <VueStockage
      stockage={stockage}
      isLoading={isLoading}
      messageVide="La répartition du stockage apparaîtra dès que le groupe aura déposé des fichiers ou enregistré une répétition."
    />
  );
}
