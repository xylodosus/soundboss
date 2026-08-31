import { decisionGarde } from "../src/lib/garde-session";

const base = { pret: true, aUneSession: true, enLigne: true, profil: "complet" } as const;

describe("decisionGarde — session", () => {
  it("attend tant que la session n'est pas résolue", () => {
    expect(decisionGarde({ ...base, pret: false })).toBe("attendre");
  });

  it("montre l'écran hors-ligne quand la session manque et que le réseau est coupé", () => {
    expect(decisionGarde({ ...base, aUneSession: false, enLigne: false })).toBe("hors-ligne");
  });

  it("renvoie au login quand la session manque alors que le réseau fonctionne", () => {
    expect(decisionGarde({ ...base, aUneSession: false })).toBe("connexion");
  });

  it("renvoie au login quand l'état réseau est inconnu, pour ne pas piéger un utilisateur déconnecté", () => {
    expect(decisionGarde({ ...base, aUneSession: false, enLigne: null })).toBe("connexion");
  });
});

describe("decisionGarde — profil", () => {
  it("attend pendant le chargement du profil", () => {
    expect(decisionGarde({ ...base, profil: "inconnu" })).toBe("attendre");
  });

  it("laisse passer un profil complet", () => {
    expect(decisionGarde(base)).toBe("autorise");
  });

  it("envoie à l'onboarding un profil réellement incomplet", () => {
    expect(decisionGarde({ ...base, profil: "incomplet" })).toBe("onboarding");
  });

  it("montre l'écran hors-ligne quand le profil n'a pas pu être lu, jamais l'onboarding", () => {
    expect(decisionGarde({ ...base, profil: "echec" })).toBe("hors-ligne");
  });

  it("ne renvoie pas à l'onboarding sur échec, même si le réseau se dit disponible", () => {
    expect(decisionGarde({ ...base, profil: "echec", enLigne: true })).toBe("hors-ligne");
  });
});
