import { accordCredits, creditsManquants, soldeInsuffisant } from "../src/lib/facturation";

describe("accordCredits", () => {
  it("accorde le pluriel", () => {
    expect(accordCredits(1)).toBe("Cette opération te coûtera 1 crédit.");
    expect(accordCredits(4)).toBe("Cette opération te coûtera 4 crédits.");
  });
});

describe("creditsManquants", () => {
  it("dit ce qui manque", () => {
    expect(creditsManquants(4, 1)).toBe(3);
  });

  it("ne rend jamais de manque négatif", () => {
    // Un solde suffisant ne « manque » pas de crédits ; afficher -3 serait
    // absurde dans une phrase.
    expect(creditsManquants(2, 10)).toBe(0);
    expect(creditsManquants(2, 2)).toBe(0);
  });
});

describe("soldeInsuffisant", () => {
  it("annonce le coût, le solde et le manque", () => {
    const m = soldeInsuffisant(4, 1);
    expect(m).toContain("insuffisant");
    expect(m).toContain("4 crédits");
    expect(m).toContain("il t'en reste 1");
    expect(m).toContain("il en manque 3");
  });

  it("accorde au singulier", () => {
    expect(soldeInsuffisant(1, 0)).toContain("1 crédit,");
  });

  it("tait le manque quand il n'y en a pas", () => {
    // Le message ne devrait pas s'afficher dans ce cas, mais il ne doit pas
    // pour autant écrire « il en manque 0 ».
    expect(soldeInsuffisant(2, 5)).not.toContain("manque");
  });
});
