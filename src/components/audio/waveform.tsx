import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from "react-native";

import { echantillonnerPics } from "@/lib/peaks";
import { couleurs, rayons } from "@/lib/theme";

/** Hauteur de la zone tactile. En dessous de 44 px, la cible devient difficile à viser. */
const HAUTEUR_ZONE = 56;
const HAUTEUR_BARRE_MAX = 40;
/** Une barre de hauteur nulle sur un silence ferait croire à un défaut d'affichage. */
const HAUTEUR_BARRE_MIN = 2;
const LARGEUR_BARRE = 3;
const ECART_BARRE = 2;

type Props = {
  pics: number[];
  /** Position de lecture, de 0 à 1. */
  progression: number;
  surDeplacer: (ratio: number) => void;
  /** Appelé au premier contact, pour suspendre la lecture pendant le glissement. */
  surDebutGeste?: () => void;
};

export function Waveform({ pics, progression, surDeplacer, surDebutGeste }: Props) {
  const [largeur, setLargeur] = useState(0);

  // Le PanResponder est mémorisé une fois pour toutes ; ses callbacks lisent la
  // largeur via une ref, sinon ils captureraient la valeur initiale (zéro).
  const largeurRef = useRef(0);
  const surDeplacerRef = useRef(surDeplacer);
  const surDebutRef = useRef(surDebutGeste);
  largeurRef.current = largeur;
  surDeplacerRef.current = surDeplacer;
  surDebutRef.current = surDebutGeste;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          surDebutRef.current?.();
          const l = largeurRef.current;
          if (l > 0) surDeplacerRef.current(clamp(e.nativeEvent.locationX / l));
        },
        onPanResponderMove: (e) => {
          // locationX est déjà relatif à la vue responsable : la position du
          // doigt suffit, pas besoin du cumul gesture.dx.
          const l = largeurRef.current;
          if (l > 0) surDeplacerRef.current(clamp(e.nativeEvent.locationX / l));
        },
        onPanResponderRelease: (e) => {
          const l = largeurRef.current;
          if (l > 0) surDeplacerRef.current(clamp(e.nativeEvent.locationX / l));
        },
      }),
    []
  );

  const nbBarres = largeur > 0 ? Math.max(1, Math.floor(largeur / (LARGEUR_BARRE + ECART_BARRE))) : 0;
  const barres = useMemo(
    () => (nbBarres > 0 ? echantillonnerPics(pics, nbBarres) : []),
    [pics, nbBarres]
  );

  const surLayout = (e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width);

  return (
    <View style={styles.zone} onLayout={surLayout} {...panResponder.panHandlers}>
      {barres.length === 0 ? (
        // Audio pas encore analysé par le conteneur, ou analyse échouée : une
        // barre de progression simple vaut mieux qu'un vide inexpliqué.
        <View style={styles.piste}>
          <View style={[styles.pisteLue, { width: `${clamp(progression) * 100}%` }]} />
        </View>
      ) : (
        <View style={styles.barres}>
          {barres.map((valeur, i) => {
            const lue = i / barres.length <= progression;
            const hauteur = HAUTEUR_BARRE_MIN + (valeur / 255) * (HAUTEUR_BARRE_MAX - HAUTEUR_BARRE_MIN);
            return (
              <View
                key={i}
                style={[
                  styles.barre,
                  { height: hauteur, backgroundColor: lue ? couleurs.warmGold : couleurs.bordureForte },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

const styles = StyleSheet.create({
  zone: { height: HAUTEUR_ZONE, justifyContent: "center" },
  barres: {
    flexDirection: "row",
    alignItems: "center",
    height: HAUTEUR_BARRE_MAX,
    gap: ECART_BARRE,
  },
  barre: { width: LARGEUR_BARRE, borderRadius: rayons.pill },
  piste: { height: 4, borderRadius: rayons.pill, backgroundColor: couleurs.bordure, overflow: "hidden" },
  pisteLue: { height: "100%", backgroundColor: couleurs.warmGold },
});
