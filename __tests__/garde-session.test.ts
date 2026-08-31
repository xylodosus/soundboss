import { decisionGarde } from "../src/lib/garde-session";

describe("decisionGarde", () => {
  it("attend tant que la session n'est pas résolue", () => {
    expect(decisionGarde({ pret: false, aUneSession: false, enLigne: true })).toBe("attendre");
  });

  it("laisse passer dès qu'une session existe, même hors ligne", () => {
    expect(decisionGarde({ pret: true, aUneSession: true, enLigne: false })).toBe("autorise");
  });

  it("montre l'écran hors-ligne quand la session manque et que le réseau est coupé", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: false })).toBe("hors-ligne");
  });

  it("renvoie au login quand la session manque alors que le réseau fonctionne", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: true })).toBe("connexion");
  });

  it("renvoie au login quand l'état réseau est inconnu, pour ne pas piéger un utilisateur déconnecté", () => {
    expect(decisionGarde({ pret: true, aUneSession: false, enLigne: null })).toBe("connexion");
  });
});
