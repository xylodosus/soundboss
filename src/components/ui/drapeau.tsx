import { SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { couleurs } from "@/lib/theme";
import { CI, SN, CM, ML, BF, BJ, TG, GN, NE, TD, GA, CD, CG, MG, RW, BI, CF, MR, KM, DJ } from "country-flag-icons/string/3x2";

/** Pays → code ISO (drapeaux 3:2). */
const DRAPEAUX: Record<string, string> = {
  "Côte d'Ivoire": CI,
  Sénégal: SN,
  Cameroun: CM,
  Mali: ML,
  "Burkina Faso": BF,
  Bénin: BJ,
  Togo: TG,
  Guinée: GN,
  Niger: NE,
  Tchad: TD,
  Gabon: GA,
  "Congo (RDC)": CD,
  "Congo (Brazzaville)": CG,
  Madagascar: MG,
  Rwanda: RW,
  Burundi: BI,
  Centrafrique: CF,
  Mauritanie: MR,
  Comores: KM,
  Djibouti: DJ,
};

/**
 * Drapeau d'un pays (SVG 3:2) — repli globe pour les pays sans drapeau
 * (ex : « Autre »).
 */
export function Drapeau({ pays, largeur = 26 }: { pays: string; largeur?: number }) {
  const xml = DRAPEAUX[pays];
  if (!xml) {
    return (
      <Ionicons
        name="globe-outline"
        size={largeur - 6}
        color={couleurs.texteSecondaire}
      />
    );
  }
  return <SvgXml xml={xml} width={largeur} height={(largeur * 2) / 3} />;
}
