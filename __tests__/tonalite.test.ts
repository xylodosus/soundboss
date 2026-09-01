import {
  TONALITES,
  demiTonsEntre,
  libelleTonalite,
  tonalitesDuMode,
  transposer,
} from "../src/lib/tonalite";

describe("TONALITES", () => {
  it("couvre les douze degrés dans les deux modes", () => {
    expect(TONALITES.filter((t) => t.mode === "majeur")).toHaveLength(12);
    expect(TONALITES.filter((t) => t.mode === "mineur")).toHaveLength(12);
  });
});

describe("libelleTonalite", () => {
  it("nomme les tonalités en français", () => {
    expect(libelleTonalite("Do:majeur")).toBe("Do majeur");
    expect(libelleTonalite("La:mineur")).toBe("La mineur");
  });

  it("rend une chaîne vide pour une tonalité inconnue", () => {
    expect(libelleTonalite(null)).toBe("");
    expect(libelleTonalite("Xx:majeur")).toBe("");
  });
});

describe("demiTonsEntre", () => {
  it("rend zéro pour une tonalité inchangée", () => {
    expect(demiTonsEntre("Do:majeur", "Do:majeur")).toBe(0);
  });

  it("compte les demi-tons vers le haut", () => {
    expect(demiTonsEntre("Do:majeur", "Ré:majeur")).toBe(2);
  });

  it("choisit le chemin le plus court plutôt que de monter de onze demi-tons", () => {
    expect(demiTonsEntre("Do:majeur", "Si:majeur")).toBe(-1);
  });

  it("ne dépasse jamais six demi-tons", () => {
    for (const depart of TONALITES) {
      for (const arrivee of TONALITES) {
        const d = demiTonsEntre(depart.id, arrivee.id);
        expect(Math.abs(d)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("rend zéro quand une tonalité manque", () => {
    expect(demiTonsEntre(null, "Do:majeur")).toBe(0);
    expect(demiTonsEntre("Do:majeur", null)).toBe(0);
  });
});

describe("transposer", () => {
  it("décale la tonalité du nombre de demi-tons demandé", () => {
    expect(transposer("Do:majeur", 2)).toBe("Ré:majeur");
  });

  it("repasse par le début de l'octave", () => {
    expect(transposer("La:mineur", 3)).toBe("Do:mineur");
  });

  it("garde le mode", () => {
    expect(transposer("Mi:mineur", 1)).toBe("Fa:mineur");
  });

  it("rend null sans tonalité de départ", () => {
    expect(transposer(null, 2)).toBeNull();
  });
});

describe("tonalitesDuMode", () => {
  it("ne propose que des tonalités du même mode", () => {
    const majeures = tonalitesDuMode("Do:majeur");
    expect(majeures).toHaveLength(12);
    expect(majeures.every((t) => t.mode === "majeur")).toBe(true);
  });

  it("propose les deux modes quand aucune tonalité n'est connue", () => {
    expect(tonalitesDuMode(null)).toHaveLength(24);
  });
});
