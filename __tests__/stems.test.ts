import { libelleStem, ordonnerStems } from "../src/lib/stems";

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
