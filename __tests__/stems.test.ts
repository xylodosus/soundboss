import {
  gainEffectif,
  libelleStem,
  memoireEstimee,
  ordonnerStems,
  peutCharger,
} from "../src/lib/stems";

describe("libelleStem", () => {
  it("traduit les types connus", () => {
    expect(libelleStem("vocals")).toBe("Voix");
    expect(libelleStem("bass")).toBe("Basse");
    expect(libelleStem("drums")).toBe("Batterie");
    expect(libelleStem("instrumental")).toBe("Instrumental");
  });

  it("nomme « Mélodies » le stem que Fadr appelle other", () => {
    // L'API produit « other » là où sa documentation annonce « melodies ».
    expect(libelleStem("other")).toBe("Mélodies");
    expect(libelleStem("melodies")).toBe("Mélodies");
  });

  it("traduit les types d'affinage", () => {
    expect(libelleStem("kick")).toBe("Grosse caisse");
    expect(libelleStem("snare")).toBe("Caisse claire");
    expect(libelleStem("lead vocals")).toBe("Voix principale");
    expect(libelleStem("background vocals")).toBe("Chœurs");
  });

  it("affiche tel quel un type inconnu plutôt que de le masquer", () => {
    // La documentation n'énumère pas tout : un type non prévu doit rester lisible.
    expect(libelleStem("theremin")).toBe("theremin");
    expect(libelleStem("")).toBe("Piste");
  });
});

describe("ordonnerStems", () => {
  const s = (type: string) => ({ id: type, type });

  it("suit l'ordre d'une console : voix, mélodies, basse, batterie", () => {
    const range = ordonnerStems([s("drums"), s("vocals"), s("bass"), s("other")]);
    expect(range.map((x) => x.type)).toEqual(["vocals", "other", "bass", "drums"]);
  });

  it("relègue l'instrumental en fin : c'est un mixage, pas un instrument", () => {
    const range = ordonnerStems([s("instrumental"), s("vocals")]);
    expect(range.map((x) => x.type)).toEqual(["vocals", "instrumental"]);
  });

  it("place les types inconnus après les connus, sans les perdre", () => {
    const range = ordonnerStems([s("theremin"), s("bass")]);
    expect(range.map((x) => x.type)).toEqual(["bass", "theremin"]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const entree = [s("drums"), s("vocals")];
    ordonnerStems(entree);
    expect(entree.map((x) => x.type)).toEqual(["drums", "vocals"]);
  });
});

describe("memoireEstimee", () => {
  it("compte quatre octets par échantillon mono", () => {
    // Mesuré le 5 septembre : 102 s décodées à 48 kHz pèsent ~19,6 Mo.
    expect(memoireEstimee(102, 48000)).toBeCloseTo(102 * 48000 * 4, 0);
  });

  it("rend zéro sans durée connue", () => {
    expect(memoireEstimee(null, 48000)).toBe(0);
  });
});

describe("peutCharger", () => {
  const MO = 1024 * 1024;

  it("accepte tant que le plafond n'est pas franchi", () => {
    expect(peutCharger(100 * MO, 40 * MO, 250 * MO)).toBe(true);
  });

  it("refuse ce qui ferait dépasser", () => {
    // 225 Mo tiennent sur un Pocophone F1 ; 450 Mo ne tiendraient pas.
    expect(peutCharger(225 * MO, 40 * MO, 250 * MO)).toBe(false);
  });

  it("accepte toujours la première piste, même très longue", () => {
    // Refuser la seule piste demandée rendrait la fonction inutilisable sur un
    // morceau long, alors qu'une piste seule reste jouable.
    expect(peutCharger(0, 400 * MO, 250 * MO)).toBe(true);
  });
});

describe("gainEffectif", () => {
  const etat = (p: Partial<Parameters<typeof gainEffectif>[1]> = {}) => ({
    volumes: {},
    mutes: new Set<string>(),
    solos: new Set<string>(),
    ...p,
  });

  it("laisse passer une piste au volume par défaut", () => {
    expect(gainEffectif("a", etat())).toBe(1);
  });

  it("applique le volume de la piste", () => {
    expect(gainEffectif("a", etat({ volumes: { a: 0.4 } }))).toBeCloseTo(0.4);
  });

  it("coupe une piste en sourdine, quel que soit son volume", () => {
    expect(gainEffectif("a", etat({ volumes: { a: 0.9 }, mutes: new Set(["a"]) }))).toBe(0);
  });

  it("ne laisse passer que les pistes en solo", () => {
    const e = etat({ solos: new Set(["a"]) });
    expect(gainEffectif("a", e)).toBe(1);
    expect(gainEffectif("b", e)).toBe(0);
  });

  it("accepte plusieurs solos à la fois", () => {
    const e = etat({ solos: new Set(["a", "b"]) });
    expect(gainEffectif("a", e)).toBe(1);
    expect(gainEffectif("b", e)).toBe(1);
    expect(gainEffectif("c", e)).toBe(0);
  });

  it("la sourdine l'emporte sur le solo de la même piste", () => {
    // Convention des consoles : M coupe, même si S est enclenché.
    const e = etat({ mutes: new Set(["a"]), solos: new Set(["a"]) });
    expect(gainEffectif("a", e)).toBe(0);
  });

  it("respecte le volume d'une piste en solo", () => {
    expect(gainEffectif("a", etat({ volumes: { a: 0.5 }, solos: new Set(["a"]) }))).toBeCloseTo(0.5);
  });
});
