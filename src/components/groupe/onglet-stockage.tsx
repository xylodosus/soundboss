import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useRessources } from "@/lib/queries/ressources";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";

const TYPES: { cle: string; label: string; couleur: string }[] = [
  { cle: "image", label: "Images", couleur: "#34D399" },
  { cle: "audio", label: "Audio", couleur: couleurs.warmGold },
  { cle: "video", label: "Vidéos", couleur: "#60A5FA" },
  { cle: "pdf", label: "PDF", couleur: couleurs.danger },
  { cle: "partition", label: "Partitions", couleur: "#C084FC" },
  { cle: "autre", label: "Autres", couleur: couleurs.muted },
];

type Agregation = { total: number; nb: number };

/** Onglet Stockage : tailles des fichiers par type + taille globale (réservé au chef). */
export function OngletStockage({ groupeId }: { groupeId: string }) {
  const { data: ressources = [], isLoading } = useRessources(groupeId, true);

  const parType: Record<string, Agregation> = {};
  for (const t of TYPES) parType[t.cle] = { total: 0, nb: 0 };

  let totalGlobal = 0;
  let nbGlobal = 0;
  for (const r of ressources) {
    const cle = TYPES.some((t) => t.cle === r.type) ? r.type : "autre";
    const octets = r.taille_bytes ?? 0;
    parType[cle].total += octets;
    parType[cle].nb += 1;
    totalGlobal += octets;
    nbGlobal += 1;
  }

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
            message="La répartition du stockage apparaîtra dès que le groupe aura déposé des fichiers."
          />
        ) : (
          <>
            <Donut
              parts={TYPES.map((t) => ({ valeur: parType[t.cle].total, couleur: t.couleur }))}
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
          {TYPES.filter((t) => parType[t.cle].nb > 0).map((t) => {
            const a = parType[t.cle];
            const pct = totalGlobal > 0 ? Math.round((a.total / totalGlobal) * 100) : 0;
            return (
              <View
                key={t.cle}
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
                    backgroundColor: t.couleur,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Texte variante="petit" poids="semibold">
                    {t.label}
                  </Texte>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {a.nb} fichier{a.nb > 1 ? "s" : ""} · {pct}%
                  </Texte>
                </View>
                <Texte variante="petit" poids="bold">
                  {(a.total / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Mo
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
