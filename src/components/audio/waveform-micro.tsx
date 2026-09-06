import { memo, useMemo } from "react";
import { View } from "react-native";
import { couleurs } from "@/lib/theme";
import {
  type PalierNiveau,
  dbDepuisNiveau,
  palierNiveau,
  reduireA,
} from "@/lib/niveau-micro";

/** Vert au repos, ambre quand ça pousse, rouge quand ça écrête. */
export const COULEUR_PALIER: Record<PalierNiveau, string> = {
  confortable: couleurs.success,
  eleve: couleurs.warmGold,
  saturation: couleurs.danger,
};

const LARGEUR_BARRE = 3;
const ECART = 2;
const HAUTEUR_MIN = 3;

/**
 * Waveform du micro, façon mémo vocal.
 *
 * En mode direct, les barres défilent de la droite vers la gauche : la plus
 * récente est collée au bord droit, sous le curseur d'enregistrement. En mode
 * relecture, toute la prise est réduite à la largeur disponible.
 */
export const WaveformMicro = memo(function WaveformMicro({
  echantillons,
  largeur,
  hauteur = 120,
  direct,
}: {
  /** Niveaux 0→1, du plus ancien au plus récent. */
  echantillons: number[];
  largeur: number;
  hauteur?: number;
  direct: boolean;
}) {
  const capacite = Math.max(1, Math.floor(largeur / (LARGEUR_BARRE + ECART)));

  const barres = useMemo(() => {
    if (!direct) return reduireA(echantillons, capacite);
    // En direct on ne compresse pas : la waveform doit défiler à vitesse
    // constante, sinon l'image se contracte au fil de l'enregistrement.
    return echantillons.slice(Math.max(0, echantillons.length - capacite));
  }, [echantillons, capacite, direct]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: direct ? "flex-end" : "center",
        gap: ECART,
        height: hauteur,
        width: largeur,
      }}
    >
      {barres.map((valeur, i) => (
        <View
          key={i}
          style={{
            width: LARGEUR_BARRE,
            height: Math.max(HAUTEUR_MIN, valeur * hauteur),
            borderRadius: LARGEUR_BARRE / 2,
            backgroundColor: COULEUR_PALIER[palierNiveau(dbDepuisNiveau(valeur))],
            // En direct, les barres anciennes s'estompent : l'œil suit le
            // bord droit, là où arrive le son.
            opacity: direct ? 0.5 + 0.5 * ((i + 1) / barres.length) : 0.9,
          }}
        />
      ))}
    </View>
  );
});
