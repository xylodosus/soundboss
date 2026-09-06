import {
  SECONDES_PAR_LIGNE,
  ajouterBalise,
  dureeParolesEstimee,
  lignesChantees,
  parolesTropCourtes,
} from "../src/lib/paroles";

describe("lignesChantees", () => {
  it("ne compte que ce qui est réellement chanté", () => {
    const paroles = [
      "[Verse 1]",
      "Seigneur je te loue",
      "De tout mon cœur",
      "",
      "[Instrumental Break]",
      "(extended solo)",
      "[Outro]",
    ].join("\n");
    expect(lignesChantees(paroles)).toBe(2);
  });

  it("ignore les lignes vides et les espaces seuls", () => {
    expect(lignesChantees("Une ligne\n\n   \nUne autre")).toBe(2);
  });

  it("rend zéro sur un texte vide", () => {
    expect(lignesChantees("")).toBe(0);
    expect(lignesChantees("   \n  ")).toBe(0);
  });
});

describe("dureeParolesEstimee", () => {
  it("dérive la durée du nombre de lignes chantées", () => {
    expect(dureeParolesEstimee("Une\nDeux\nTrois\nQuatre")).toBe(4 * SECONDES_PAR_LIGNE);
  });
});

describe("parolesTropCourtes", () => {
  it("n'alerte pas quand aucune durée n'est demandée", () => {
    expect(parolesTropCourtes("Une ligne", null)).toBe(false);
  });

  it("alerte sur un couplet de quatre lignes face à trois minutes", () => {
    // Le cas constaté : 4 lignes rendaient 16 s pour 180 demandées.
    expect(parolesTropCourtes("Une\nDeux\nTrois\nQuatre", 180)).toBe(true);
  });

  it("laisse passer un texte à la mesure de la durée", () => {
    const long = Array.from({ length: 30 }, (_, i) => `Ligne ${i}`).join("\n");
    expect(parolesTropCourtes(long, 180)).toBe(false);
  });

  it("ne harcèle pas sur un écart léger", () => {
    // 24 lignes ≈ 120 s pour 180 demandées : court, mais pas absurde.
    const texte = Array.from({ length: 24 }, (_, i) => `Ligne ${i}`).join("\n");
    expect(parolesTropCourtes(texte, 180)).toBe(false);
  });
});

describe("ajouterBalise", () => {
  it("pose la balise seule sur un champ vide", () => {
    expect(ajouterBalise("", "[Intro]")).toBe("[Intro]\n");
  });

  it("détache la balise du texte existant", () => {
    expect(ajouterBalise("Une ligne", "[Chorus]")).toBe("Une ligne\n\n[Chorus]\n");
  });

  it("n'empile pas les sauts de ligne", () => {
    expect(ajouterBalise("Une ligne\n\n\n", "[Outro]")).toBe("Une ligne\n\n[Outro]\n");
  });
});
