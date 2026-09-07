import {
  basculer,
  modificationsProfil,
  texteOuNull,
  validerProfil,
  type SaisieProfil,
} from "../src/lib/profil-edition";

const VIDE: SaisieProfil = {
  prenom: "Donatien",
  nom: "Koné",
  ville: "",
  pays: "",
  telephone: "",
  bio: "",
  instruments: [],
  genres: [],
  niveau: null,
};

describe("texteOuNull", () => {
  it("traite les blancs seuls comme une absence", () => {
    expect(texteOuNull("   ")).toBeNull();
    expect(texteOuNull("")).toBeNull();
  });

  it("rogne les bords sans toucher au reste", () => {
    expect(texteOuNull("  Abidjan  ")).toBe("Abidjan");
  });
});

describe("validerProfil", () => {
  it("exige un prénom", () => {
    expect(validerProfil({ ...VIDE, prenom: "  " })).toContain("prénom");
  });

  it("laisse le nom facultatif", () => {
    // Beaucoup de musiciens n'en portent qu'un seul sur scène.
    expect(validerProfil({ ...VIDE, nom: "" })).toBeNull();
  });

  it("borne la bio", () => {
    expect(validerProfil({ ...VIDE, bio: "x".repeat(501) })).toContain("500");
    expect(validerProfil({ ...VIDE, bio: "x".repeat(500) })).toBeNull();
  });
});

describe("basculer", () => {
  it("ajoute puis retire", () => {
    expect(basculer([], "Piano")).toEqual(["Piano"]);
    expect(basculer(["Piano", "Kora"], "Piano")).toEqual(["Kora"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const depart = ["Piano"];
    basculer(depart, "Kora");
    expect(depart).toEqual(["Piano"]);
  });
});

describe("modificationsProfil", () => {
  const initial = {
    prenom: "Donatien",
    nom: "Koné",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    telephone: null,
    bio: null,
    instruments: ["Piano"],
    genres_musicaux: ["Gospel"],
    niveau_global: "avance",
  };
  const saisieIdentique: SaisieProfil = {
    prenom: "Donatien",
    nom: "Koné",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    telephone: "",
    bio: "",
    instruments: ["Piano"],
    genres: ["Gospel"],
    niveau: "avance",
  };

  it("ne rend rien quand rien n'a changé", () => {
    // update() écrase tout ce qu'on lui donne : réécrire à l'identique
    // effacerait ce qu'un autre appareil vient de modifier.
    expect(modificationsProfil(initial, saisieIdentique)).toEqual({});
  });

  it("ne rend que le champ touché", () => {
    expect(modificationsProfil(initial, { ...saisieIdentique, ville: "Bouaké" })).toEqual({
      ville: "Bouaké",
    });
  });

  it("efface un champ vidé", () => {
    expect(modificationsProfil(initial, { ...saisieIdentique, ville: "  " })).toEqual({
      ville: null,
    });
  });

  it("ignore l'ordre dans les sélections multiples", () => {
    const avecDeux = { ...initial, instruments: ["Piano", "Kora"] };
    const saisie = { ...saisieIdentique, instruments: ["Kora", "Piano"] };
    expect(modificationsProfil(avecDeux, saisie)).toEqual({});
  });

  it("détecte l'ajout et le retrait dans une sélection", () => {
    expect(
      modificationsProfil(initial, { ...saisieIdentique, instruments: ["Piano", "Kora"] })
    ).toEqual({ instruments: ["Piano", "Kora"] });
    expect(modificationsProfil(initial, { ...saisieIdentique, instruments: [] })).toEqual({
      instruments: [],
    });
  });

  it("traite un profil vierge sans rien inventer", () => {
    expect(modificationsProfil({}, VIDE)).toEqual({ prenom: "Donatien", nom: "Koné" });
  });

  it("suit le changement de niveau, y compris son retrait", () => {
    expect(modificationsProfil(initial, { ...saisieIdentique, niveau: "expert" })).toEqual({
      niveau_global: "expert",
    });
    expect(modificationsProfil(initial, { ...saisieIdentique, niveau: null })).toEqual({
      niveau_global: null,
    });
  });
});
