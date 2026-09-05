import {
  arbreStems,
  decoupeQuiAffine,
  gainEffectif,
  libelleStem,
  memoireEstimee,
  ordonnerStems,
  peutCharger,
  titreStem,
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
    // Nom réellement produit par l'API, différent de sa documentation.
    expect(libelleStem("drums-other")).toBe("Autres percussions");
    expect(libelleStem("electric")).toBe("Guitare électrique");
    expect(libelleStem("acoustic")).toBe("Guitare acoustique");
    expect(libelleStem("melodics-other")).toBe("Autres mélodies");
    expect(libelleStem("vocals-lead")).toBe("Voix principale");
    expect(libelleStem("vocals-background")).toBe("Chœurs");
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

describe("titreStem", () => {
  it("compose le titre attendu", () => {
    expect(titreStem("HOSANNA reprise", "bass")).toBe("HOSANNA reprise - Stem Basse");
  });

  it("retire l'extension du fichier source", () => {
    // Le titre vient souvent d'un nom de fichier : « .mp3 » n'a rien à faire
    // au milieu d'un libellé.
    expect(titreStem("HOSANNA reprise.mp3", "drums")).toBe("HOSANNA reprise - Stem Batterie");
  });

  it("garde un point qui n'est pas une extension", () => {
    expect(titreStem("Op. 27 no 2", "vocals")).toBe("Op. 27 no 2 - Stem Voix");
  });

  it("reprend tel quel un type inconnu", () => {
    expect(titreStem("Morceau", "theremin")).toBe("Morceau - Stem theremin");
  });

  it("se rabat sur un titre neutre quand il manque", () => {
    expect(titreStem(null, "bass")).toBe("Audio - Stem Basse");
  });
});

describe("decoupeQuiAffine", () => {
  it("associe chaque stem redécoupable à sa découpe", () => {
    expect(decoupeQuiAffine("vocals")).toBe("vocal-stem");
    expect(decoupeQuiAffine("drums")).toBe("drum-stem");
    expect(decoupeQuiAffine("other")).toBe("melodic-stem");
  });

  it("accepte aussi le nom documenté du stem mélodique", () => {
    expect(decoupeQuiAffine("melodies")).toBe("melodic-stem");
  });

  it("rend null pour ce qui ne se redécoupe pas", () => {
    // L'instrumental est un mixage, la basse et les feuilles sont terminales.
    expect(decoupeQuiAffine("instrumental")).toBeNull();
    expect(decoupeQuiAffine("bass")).toBeNull();
    expect(decoupeQuiAffine("kick")).toBeNull();
  });
});

describe("arbreStems", () => {
  const s = (id: string, type: string, parent_id: string | null = null) => ({
    id,
    type,
    parent_id,
  });

  it("place chaque enfant juste sous son parent", () => {
    const arbre = arbreStems([
      s("a", "vocals"),
      s("b", "drums"),
      s("c", "kick", "b"),
      s("d", "snare", "b"),
    ]);
    expect(arbre.map((n) => [n.stem.type, n.niveau])).toEqual([
      ["vocals", 0],
      ["drums", 0],
      ["kick", 1],
      ["snare", 1],
    ]);
  });

  it("garde l'ordre de console entre les branches", () => {
    const arbre = arbreStems([s("a", "drums"), s("b", "vocals")]);
    expect(arbre.map((n) => n.stem.type)).toEqual(["vocals", "drums"]);
  });

  it("ne perd pas un enfant dont le parent est absent", () => {
    // Une découpe partiellement supprimée ne doit pas faire disparaître de piste.
    const arbre = arbreStems([s("c", "kick", "inconnu")]);
    expect(arbre.map((n) => [n.stem.type, n.niveau])).toEqual([["kick", 0]]);
  });

  it("rend une liste vide sans stem", () => {
    expect(arbreStems([])).toEqual([]);
  });
});
