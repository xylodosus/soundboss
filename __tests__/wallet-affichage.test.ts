import {
  estDebit,
  formatMontantTransaction,
  montantTransaction,
} from "../src/lib/wallet-affichage";

describe("montantTransaction", () => {
  it("rend un débit négatif, alors qu'il est stocké positif", () => {
    // debiter_credits enregistre `credits = 1` avec type = 'debit'.
    // C'est le type qui porte le sens, jamais la valeur.
    expect(montantTransaction("debit", 1)).toBe(-1);
    expect(montantTransaction("debit", 4)).toBe(-4);
  });

  it("rend positifs l'achat, le bonus et le remboursement", () => {
    expect(montantTransaction("achat", 60)).toBe(60);
    expect(montantTransaction("bonus", 10)).toBe(10);
    expect(montantTransaction("remboursement", 1)).toBe(1);
  });

  it("ignore un signe déjà stocké dans la valeur", () => {
    // Défensif : si une ligne ancienne porte un négatif, le type reste maître.
    expect(montantTransaction("debit", -3)).toBe(-3);
    expect(montantTransaction("achat", -3)).toBe(3);
  });

  it("traite l'absence de montant comme zéro", () => {
    expect(montantTransaction("debit", null)).toBe(0);
    expect(montantTransaction(null, undefined)).toBe(0);
  });
});

describe("formatMontantTransaction", () => {
  it("préfixe le signe", () => {
    expect(formatMontantTransaction("debit", 1)).toBe("-1");
    expect(formatMontantTransaction("bonus", 10)).toBe("+10");
  });

  it("n'attribue pas de signe à zéro", () => {
    // « +0 » se lirait comme un gain.
    expect(formatMontantTransaction("debit", 0)).toBe("0");
  });
});

describe("estDebit", () => {
  it("ne retient que le débit", () => {
    expect(estDebit("debit")).toBe(true);
    for (const t of ["achat", "bonus", "remboursement", "ajustement_admin", null]) {
      expect(estDebit(t)).toBe(false);
    }
  });
});
