import {
  PLANCHER_DB,
  SEUIL_ELEVE,
  SEUIL_SATURATION,
  ajouterEchantillon,
  dbDepuisNiveau,
  niveauDepuisDb,
  palierNiveau,
  reduireA,
} from "../src/lib/niveau-micro";

describe("niveauDepuisDb", () => {
  it("rend le maximum à 0 dBFS", () => {
    expect(niveauDepuisDb(0)).toBe(1);
  });

  it("rend zéro au plancher et en dessous", () => {
    expect(niveauDepuisDb(PLANCHER_DB)).toBe(0);
    expect(niveauDepuisDb(-160)).toBe(0);
  });

  it("place le milieu de l'échelle à mi-course", () => {
    expect(niveauDepuisDb(PLANCHER_DB / 2)).toBeCloseTo(0.5, 5);
  });

  it("rend zéro sans mesure plutôt que d'inventer un niveau", () => {
    // L'ancienne version affichait Math.random() quand le metering manquait :
    // une jauge qui bouge sans rapport avec le son est pire qu'une jauge morte.
    expect(niveauDepuisDb(null)).toBe(0);
    expect(niveauDepuisDb(undefined)).toBe(0);
    expect(niveauDepuisDb(Number.NaN)).toBe(0);
  });

  it("n'excède jamais les bornes sur une valeur positive", () => {
    expect(niveauDepuisDb(12)).toBe(1);
  });
});

describe("ajouterEchantillon", () => {
  it("ajoute à la fin, le plus récent en dernier", () => {
    expect(ajouterEchantillon([0.1, 0.2], 0.3, 5)).toEqual([0.1, 0.2, 0.3]);
  });

  it("fait défiler en écartant les plus anciens", () => {
    expect(ajouterEchantillon([0.1, 0.2, 0.3], 0.4, 3)).toEqual([0.2, 0.3, 0.4]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const depart = [0.1, 0.2];
    ajouterEchantillon(depart, 0.3, 2);
    expect(depart).toEqual([0.1, 0.2]);
  });

  it("gère une capacité d'un seul échantillon", () => {
    expect(ajouterEchantillon([0.1], 0.2, 1)).toEqual([0.2]);
  });
});

describe("reduireA", () => {
  it("rend une copie quand il y a moins d'échantillons que de barres", () => {
    const depart = [0.2, 0.4];
    const sortie = reduireA(depart, 5);
    expect(sortie).toEqual([0.2, 0.4]);
    expect(sortie).not.toBe(depart);
  });

  it("garde le pic de chaque tranche, pas la moyenne", () => {
    // Une attaque brève entre deux silences doit rester visible.
    expect(reduireA([0, 0, 1, 0, 0, 0], 3)).toEqual([0, 1, 0]);
  });

  it("couvre toute la durée, du premier au dernier échantillon", () => {
    expect(reduireA([1, 0, 0, 0, 0, 1], 2)).toEqual([1, 1]);
  });

  it("rend exactement le nombre de barres demandé", () => {
    expect(reduireA(Array.from({ length: 997 }, () => 0.5), 40)).toHaveLength(40);
  });

  it("rend un tableau vide pour une cible nulle", () => {
    expect(reduireA([0.1, 0.2], 0)).toEqual([]);
  });
});

describe("palierNiveau", () => {
  it("classe une prise confortable en vert", () => {
    expect(palierNiveau(-40)).toBe("confortable");
    expect(palierNiveau(-18)).toBe("confortable");
  });

  it("bascule en niveau élevé à partir du seuil, pas après", () => {
    expect(palierNiveau(SEUIL_ELEVE - 0.1)).toBe("confortable");
    expect(palierNiveau(SEUIL_ELEVE)).toBe("eleve");
    expect(palierNiveau(-8)).toBe("eleve");
  });

  it("signale la saturation à partir du seuil, pas après", () => {
    expect(palierNiveau(SEUIL_SATURATION - 0.1)).toBe("eleve");
    expect(palierNiveau(SEUIL_SATURATION)).toBe("saturation");
    expect(palierNiveau(0)).toBe("saturation");
  });

  it("ne signale rien d'alarmant sans mesure", () => {
    expect(palierNiveau(null)).toBe("confortable");
    expect(palierNiveau(Number.NaN)).toBe("confortable");
  });
});

describe("dbDepuisNiveau", () => {
  it("est l'inverse exact de niveauDepuisDb dans la plage utile", () => {
    for (const db of [-60, -48, -24, -12, -6, 0]) {
      expect(dbDepuisNiveau(niveauDepuisDb(db))).toBeCloseTo(db, 5);
    }
  });

  it("permet de reclasser un échantillon normalisé", () => {
    expect(palierNiveau(dbDepuisNiveau(niveauDepuisDb(-3)))).toBe("saturation");
    expect(palierNiveau(dbDepuisNiveau(niveauDepuisDb(-30)))).toBe("confortable");
  });
});
