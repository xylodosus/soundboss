import { deltaEcoute, estEcoutee, SAUT_MAX_SECONDES } from "../src/lib/ecoute";

describe("deltaEcoute", () => {
  it("compte une progression normale", () => {
    expect(deltaEcoute(10, 11)).toBe(1);
  });

  it("ignore un retour en arrière", () => {
    expect(deltaEcoute(60, 10)).toBe(0);
  });

  it("ignore un saut en avant, signe d'un glissement de barre", () => {
    expect(deltaEcoute(10, 10 + SAUT_MAX_SECONDES + 1)).toBe(0);
  });

  it("accepte un écart à la limite du saut toléré", () => {
    expect(deltaEcoute(10, 10 + SAUT_MAX_SECONDES)).toBe(SAUT_MAX_SECONDES);
  });

  it("ignore une position identique", () => {
    expect(deltaEcoute(10, 10)).toBe(0);
  });
});

describe("estEcoutee", () => {
  it("compte l'écoute à partir de 30 % de la durée", () => {
    expect(estEcoutee(30, 100)).toBe(true);
  });

  it("ne compte pas en deçà", () => {
    expect(estEcoutee(29, 100)).toBe(false);
  });

  it("reste prudent quand la durée est inconnue", () => {
    expect(estEcoutee(999, null)).toBe(false);
  });

  it("reste prudent quand la durée est nulle", () => {
    expect(estEcoutee(10, 0)).toBe(false);
  });
});
