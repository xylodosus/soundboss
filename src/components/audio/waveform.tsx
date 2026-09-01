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
  /** Zone de boucle A/B, en ratios de 0 à 1. */
  boucle?: { debut: number; fin: number } | null;
  /** Déplacement d'une borne de boucle au doigt. */
  surDeplacerBorne?: (borne: "debut" | "fin", ratio: number) => void;
};

export function Waveform({
  pics,
  progression,
  surDeplacer,
  surDebutGeste,
  boucle,
  surDeplacerBorne,
}: Props) {
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
      {/* Voir ce qu'on boucle vaut mieux que lire deux nombres. */}
      {boucle && (
        <View
          pointerEvents="none"
          style={[
            styles.zoneBoucle,
            {
              left: `${clamp(boucle.debut) * 100}%`,
              width: `${Math.max(0, clamp(boucle.fin) - clamp(boucle.debut)) * 100}%`,
            },
          ]}
        />
      )}
      {boucle && surDeplacerBorne && (
        <>
          <PoigneeBoucle
            ratio={clamp(boucle.debut)}
            largeurRef={largeurRef}
            label="Début de la boucle"
            surDeplacer={(r) => surDeplacerBorne("debut", r)}
          />
          <PoigneeBoucle
            ratio={clamp(boucle.fin)}
            largeurRef={largeurRef}
            label="Fin de la boucle"
            surDeplacer={(r) => surDeplacerBorne("fin", r)}
          />
        </>
      )}
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

/**
 * Borne de boucle déplaçable.
 *
 * Le déplacement se calcule sur `gesture.dx` depuis le ratio de départ, et non
 * sur une coordonnée absolue : `locationX` serait relatif à la poignée, large de
 * quelques pixels, donc inexploitable.
 */
function PoigneeBoucle({
  ratio,
  largeurRef,
  label,
  surDeplacer,
}: {
  ratio: number;
  largeurRef: { current: number };
  label: string;
  surDeplacer: (ratio: number) => void;
}) {
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const departRef = useRef(ratio);
  const surDeplacerRef = useRef(surDeplacer);
  surDeplacerRef.current = surDeplacer;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Réclamer le geste dès le contact : sans cela, la waveform parente
        // l'attraperait et déplacerait la lecture au lieu de la borne.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          departRef.current = ratioRef.current;
        },
        onPanResponderMove: (_e, gesture) => {
          const l = largeurRef.current;
          if (l > 0) surDeplacerRef.current(clamp(departRef.current + gesture.dx / l));
        },
      }),
    [largeurRef]
  );

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      style={[styles.poignee, { left: `${ratio * 100}%` }]}
    >
      <View style={styles.poigneeBarre} />
    </View>
  );
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

const styles = StyleSheet.create({
  zone: { height: HAUTEUR_ZONE, justifyContent: "center" },
  zoneBoucle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: couleurs.warmGold10,
    borderRadius: rayons.sm,
  },
  barres: {
    flexDirection: "row",
    alignItems: "center",
    height: HAUTEUR_BARRE_MAX,
    gap: ECART_BARRE,
  },
  barre: { width: LARGEUR_BARRE, borderRadius: rayons.pill },
  // Cible tactile de 44 px, centrée sur la borne : la barre visible n'en fait
  // que trois, mais on ne vise pas trois pixels avec un pouce.
  poignee: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 44,
    marginLeft: -22,
    alignItems: "center",
    justifyContent: "center",
  },
  poigneeBarre: {
    width: 3,
    height: HAUTEUR_BARRE_MAX + 8,
    borderRadius: rayons.pill,
    backgroundColor: couleurs.warmGold,
  },
  piste: { height: 4, borderRadius: rayons.pill, backgroundColor: couleurs.bordure, overflow: "hidden" },
  pisteLue: { height: "100%", backgroundColor: couleurs.warmGold },
});
