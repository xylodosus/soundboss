import {
  TONALITES,
  demiTonsEntre,
  libelleTonalite,
  parseSections,
  resumeSections,
  sectionA,
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

describe("sectionA", () => {
  const sections = [
    { debut: 0, fin: 90, id: "Mi:majeur", confiance: 0.1 },
    { debut: 90, fin: 180, id: "Fa#:majeur", confiance: 0.2 },
  ];

  it("rend la section qui contient la position", () => {
    expect(sectionA(sections, 10)?.id).toBe("Mi:majeur");
    expect(sectionA(sections, 120)?.id).toBe("Fa#:majeur");
  });

  it("place la borne du côté de la section qui commence", () => {
    expect(sectionA(sections, 90)?.id).toBe("Fa#:majeur");
  });

  it("retient la dernière section au-delà de la fin", () => {
    // La dernière tranche est tronquée : la lecture dépasse souvent sa borne.
    expect(sectionA(sections, 500)?.id).toBe("Fa#:majeur");
  });

  it("retient la première avant le début", () => {
    expect(sectionA(sections, -5)?.id).toBe("Mi:majeur");
  });

  it("rend null sans section", () => {
    expect(sectionA([], 10)).toBeNull();
    expect(sectionA(null, 10)).toBeNull();
  });
});

describe("resumeSections", () => {
  it("ne dit rien quand le morceau ne module pas", () => {
    expect(resumeSections([{ debut: 0, fin: 90, id: "Mi:majeur", confiance: 0.1 }])).toBe("");
  });

  it("annonce la modulation et son instant", () => {
    expect(
      resumeSections([
        { debut: 0, fin: 90, id: "Mi:majeur", confiance: 0.1 },
        { debut: 90, fin: 180, id: "Fa#:majeur", confiance: 0.2 },
      ])
    ).toBe("Mi majeur, puis Fa# majeur à 1:30");
  });

  it("ne dit rien sans section", () => {
    expect(resumeSections(null)).toBe("");
  });
});

describe("parseSections", () => {
  it("lit une chronologie bien formée", () => {
    const brut = [{ debut: 0, fin: 90, id: "Mi:majeur", confiance: 0.1 }];
    expect(parseSections(brut)).toEqual(brut);
  });

  it("écarte les entrées dont la tonalité est inconnue", () => {
    expect(
      parseSections([
        { debut: 0, fin: 90, id: "Mi:majeur", confiance: 0.1 },
        { debut: 90, fin: 180, id: "Xx:majeur", confiance: 0.2 },
      ])
    ).toHaveLength(1);
  });

  it("écarte les entrées mal formées plutôt que de faire confiance au JSONB", () => {
    expect(parseSections([{ debut: "0", fin: 90, id: "Mi:majeur" }])).toBeNull();
    expect(parseSections([null])).toBeNull();
  });

  it("rend null sur autre chose qu'un tableau", () => {
    expect(parseSections(null)).toBeNull();
    expect(parseSections({ debut: 0 })).toBeNull();
    expect(parseSections("Mi:majeur")).toBeNull();
  });
});
