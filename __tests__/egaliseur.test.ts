import {
  BANDES,
  GAIN_MAX,
  gainDepuisDeplacement,
  gainLineaire,
  libelleFrequence,
  ratioDepuisGain,
} from "../src/lib/egaliseur";

describe("gainLineaire", () => {
  it("laisse le signal intact à zéro décibel", () => {
    expect(gainLineaire(0)).toBeCloseTo(1, 10);
  });

  it("double l'amplitude à six décibels", () => {
    expect(gainLineaire(6)).toBeCloseTo(2, 1);
  });

  it("divise l'amplitude par deux à moins six décibels", () => {
    expect(gainLineaire(-6)).toBeCloseTo(0.5, 1);
  });
});

describe("BANDES", () => {
  it("va du grave à l'aigu, plateaux aux extrêmes", () => {
    expect(BANDES).toHaveLength(10);
    expect(BANDES[0].type).toBe("lowshelf");
    expect(BANDES[BANDES.length - 1].type).toBe("highshelf");
    expect(BANDES.slice(1, -1).every((b) => b.type === "peaking")).toBe(true);
    const freqs = BANDES.map((b) => b.frequence);
    expect([...freqs].sort((a, b) => a - b)).toEqual(freqs);
  });
});

describe("ratioDepuisGain", () => {
  it("place le gain maximal tout en haut", () => {
    expect(ratioDepuisGain(GAIN_MAX)).toBe(0);
  });

  it("place le gain minimal tout en bas", () => {
    expect(ratioDepuisGain(-GAIN_MAX)).toBe(1);
  });

  it("place le neutre au milieu", () => {
    expect(ratioDepuisGain(0)).toBeCloseTo(0.5, 10);
  });
});

describe("gainDepuisDeplacement", () => {
  it("monte le gain quand le doigt monte", () => {
    // dy négatif = vers le haut en coordonnées écran.
    expect(gainDepuisDeplacement(0, -60, 120)).toBe(15);
  });

  it("descend le gain quand le doigt descend", () => {
    expect(gainDepuisDeplacement(0, 60, 120)).toBe(-15);
  });

  it("rend des décibels entiers", () => {
    expect(Number.isInteger(gainDepuisDeplacement(0, -13, 120))).toBe(true);
  });

  it("n'excède jamais les bornes", () => {
    expect(gainDepuisDeplacement(10, -500, 120)).toBe(GAIN_MAX);
    expect(gainDepuisDeplacement(-10, 500, 120)).toBe(-GAIN_MAX);
  });

  it("ne bouge pas sur une hauteur nulle plutôt que de diviser par zéro", () => {
    expect(gainDepuisDeplacement(3, -40, 0)).toBe(3);
  });
});

describe("libelleFrequence", () => {
  it("abrège les kilohertz", () => {
    expect(libelleFrequence(16000)).toBe("16 kHz");
    expect(libelleFrequence(1000)).toBe("1 kHz");
  });

  it("laisse les hertz tels quels", () => {
    expect(libelleFrequence(250)).toBe("250 Hz");
  });
});
