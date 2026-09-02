import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { Texte } from "@/components/ui/texte";
import {
  BANDES,
  GAIN_MAX,
  GRADUATIONS,
  gainDepuisDeplacement,
  ratioDepuisGain,
} from "@/lib/egaliseur";
import { couleurs, espacement, rayons } from "@/lib/theme";

const HAUTEUR_TRACE = 190;
/** Marge haute et basse : les pastilles aux extrêmes ne doivent pas être coupées. */
const MARGE = 14;

/**
 * Égaliseur graphique à dix bandes.
 *
 * Le tracé et les pastilles sont en SVG, mais les gestes sont pris par des vues
 * natives superposées : un `PanResponder` sur un élément SVG se négocie mal, et
 * les poignées de la boucle A/B ont déjà coûté trois tentatives sur ce terrain.
 */
export function Egaliseur({
  gains,
  actif,
  surChanger,
}: {
  gains: number[];
  actif: boolean;
  surChanger: (index: number, gain: number) => void;
}) {
  const [largeur, setLargeur] = useState(0);

  const hauteurUtile = HAUTEUR_TRACE - 2 * MARGE;
  const pasX = largeur > 0 ? largeur / BANDES.length : 0;
  const centreX = (i: number) => pasX * (i + 0.5);
  const centreY = (gain: number) => MARGE + ratioDepuisGain(gain) * hauteurUtile;

  // Courbe reliant les pastilles, en Catmull-Rom converti en Bézier cubique :
  // une polyligne donnerait des angles là où l'oreille entend une transition
  // continue entre bandes voisines.
  const chemin = useMemo(() => {
    if (largeur <= 0) return "";
    // Positions recalculées ici plutôt que via centreX/centreY : ces fonctions
    // sont recréées à chaque rendu, les déclarer en dépendance annulerait le mémo.
    const pas = largeur / BANDES.length;
    const utile = HAUTEUR_TRACE - 2 * MARGE;
    const pts = BANDES.map((_, i) => ({
      x: pas * (i + 0.5),
      y: MARGE + ratioDepuisGain(gains[i] ?? 0) * utile,
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      d +=
        ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}` +
        ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}` +
        ` ${p2.x} ${p2.y}`;
    }
    return d;
  }, [gains, largeur]);

  const teinte = actif ? couleurs.warmGold : couleurs.muted;

  return (
    <View>
      {/* Valeurs au-dessus de leur bande, comme sur un égaliseur matériel. */}
      <View style={styles.rangeeValeurs}>
        {BANDES.map((bande, i) => (
          <Texte
            key={bande.libelle}
            variante="micro"
            couleur={gains[i] === 0 ? couleurs.texteSecondaire : teinte}
            style={styles.cellule}
          >
            {gains[i] > 0 ? `+${gains[i]}` : `${gains[i]}`}
          </Texte>
        ))}
      </View>

      <View style={styles.trace} onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
        {largeur > 0 && (
          <Svg width={largeur} height={HAUTEUR_TRACE}>
            {GRADUATIONS.map((db) => (
              <Line
                key={db}
                x1={0}
                x2={largeur}
                y1={centreY(db)}
                y2={centreY(db)}
                stroke={db === 0 ? couleurs.bordureForte : couleurs.bordure}
                strokeWidth={1}
              />
            ))}
            {/* Tige de chaque bande, du zéro jusqu'à sa pastille. */}
            {BANDES.map((bande, i) => (
              <Line
                key={bande.libelle}
                x1={centreX(i)}
                x2={centreX(i)}
                y1={centreY(0)}
                y2={centreY(gains[i] ?? 0)}
                stroke={teinte}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
            <Path d={chemin} stroke={teinte} strokeWidth={2} fill="none" />
            {BANDES.map((bande, i) => (
              <Circle
                key={bande.libelle}
                cx={centreX(i)}
                cy={centreY(gains[i] ?? 0)}
                r={9}
                fill={teinte}
                stroke={couleurs.carte}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}

        {/* Colonnes tactiles : toute la hauteur est saisissable, pas seulement
            la pastille — viser neuf pixels au pouce serait intenable. */}
        {largeur > 0 &&
          BANDES.map((bande, i) => (
            <ColonneBande
              key={bande.libelle}
              gauche={pasX * i}
              largeur={pasX}
              gain={gains[i] ?? 0}
              hauteurUtile={hauteurUtile}
              label={`${bande.libelle} hertz`}
              surChanger={(g) => surChanger(i, g)}
            />
          ))}
      </View>

      <View style={styles.rangeeValeurs}>
        {BANDES.map((bande) => (
          <Texte key={bande.libelle} variante="micro" couleur={couleurs.texteSecondaire} style={styles.cellule}>
            {bande.libelle}
          </Texte>
        ))}
      </View>
    </View>
  );
}

function ColonneBande({
  gauche,
  largeur,
  gain,
  hauteurUtile,
  label,
  surChanger,
}: {
  gauche: number;
  largeur: number;
  gain: number;
  hauteurUtile: number;
  label: string;
  surChanger: (gain: number) => void;
}) {
  const gainRef = useRef(gain);
  gainRef.current = gain;
  const departRef = useRef(gain);
  const surChangerRef = useRef(surChanger);
  surChangerRef.current = surChanger;
  const hauteurRef = useRef(hauteurUtile);
  hauteurRef.current = hauteurUtile;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Le ScrollView de la modale réclamerait le geste vertical dès le
        // premier pixel de déplacement : on refuse de le lui céder.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          departRef.current = gainRef.current;
        },
        onPanResponderMove: (_e, geste) => {
          surChangerRef.current(
            gainDepuisDeplacement(departRef.current, geste.dy, hauteurRef.current)
          );
        },
      }),
    []
  );

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: -GAIN_MAX, max: GAIN_MAX, now: gain }}
      style={[styles.colonne, { left: gauche, width: largeur }]}
    />
  );
}

const styles = StyleSheet.create({
  trace: { height: HAUTEUR_TRACE, borderRadius: rayons.sm, overflow: "hidden" },
  colonne: { position: "absolute", top: 0, bottom: 0 },
  rangeeValeurs: { flexDirection: "row", marginVertical: espacement.xs },
  cellule: { flex: 1, textAlign: "center" },
});
