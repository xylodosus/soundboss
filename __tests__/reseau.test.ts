import { doitRafraichirLaSession } from "../src/lib/reseau-regles";

describe("doitRafraichirLaSession", () => {
  it("rafraîchit quand l'app est au premier plan et connectée", () => {
    expect(doitRafraichirLaSession("active", true)).toBe(true);
  });

  it("ne rafraîchit pas hors ligne — un échec détruirait la session", () => {
    expect(doitRafraichirLaSession("active", false)).toBe(false);
  });

  it("ne rafraîchit pas quand l'app est en arrière-plan", () => {
    expect(doitRafraichirLaSession("background", true)).toBe(false);
  });

  it("ne rafraîchit pas quand l'app est inactive", () => {
    expect(doitRafraichirLaSession("inactive", true)).toBe(false);
  });

  it("s'abstient tant que l'état réseau est inconnu", () => {
    expect(doitRafraichirLaSession("active", null)).toBe(false);
  });
});
