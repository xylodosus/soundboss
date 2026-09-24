import {
  descendants,
  octetsDe,
  resumeSuppressionArbre,
  resumeSuppressionStem,
} from "../src/lib/suppression";

const MO = 1024 * 1024;

//  a ── b ── d
//    └─ c
//  e (indépendante)
const ARBRE = [
  { id: "a", parent_id: null, taille_octets: MO },
  { id: "b", parent_id: "a", taille_octets: 2 * MO },
  { id: "c", parent_id: "a", taille_octets: 3 * MO },
  { id: "d", parent_id: "b", taille_octets: 4 * MO },
  { id: "e", parent_id: null, taille_octets: 9 * MO },
];

describe("descendants", () => {
  it("descend sur plusieurs niveaux", () => {
    // parent_id est en cascade : supprimer « a » emporte b, c et d.
    expect(descendants(ARBRE, "a").sort()).toEqual(["b", "c", "d"]);
  });

  it("ne remonte pas vers le parent", () => {
    expect(descendants(ARBRE, "b")).toEqual(["d"]);
  });

  it("rend une liste vide pour une feuille", () => {
    expect(descendants(ARBRE, "d")).toEqual([]);
    expect(descendants(ARBRE, "e")).toEqual([]);
  });

  it("ignore une piste inconnue", () => {
    expect(descendants(ARBRE, "zzz")).toEqual([]);
  });

  it("ne boucle pas sur un cycle", () => {
    // Une donnée venue de la base peut toujours être incohérente ; le parcours
    // doit s'arrêter plutôt que d'épuiser la pile.
    const cycle = [
      { id: "x", parent_id: "y" },
      { id: "y", parent_id: "x" },
    ];
    expect(descendants(cycle, "x")).toEqual(["y"]);
  });
});

describe("octetsDe", () => {
  it("somme les tailles des pistes visées", () => {
    expect(octetsDe(ARBRE, ["b", "d"])).toBe(6 * MO);
  });

  it("compte une taille absente pour zéro", () => {
    expect(octetsDe([{ id: "a", taille_octets: null }], ["a"])).toBe(0);
  });
});

describe("resumeSuppressionStem", () => {
  it("annonce les affinages emportés, qui sont le vrai piège", () => {
    const m = resumeSuppressionStem(2, 6 * MO);
    expect(m).toContain("2 affinages");
    expect(m).toContain("6.0 Mo");
  });

  it("accorde au singulier", () => {
    expect(resumeSuppressionStem(1, MO)).toContain("1 affinage qui en découle");
  });

  it("reste sobre sur une piste seule", () => {
    const m = resumeSuppressionStem(0, MO);
    expect(m).not.toContain("affinage");
    expect(m).toContain("1.0 Mo");
  });

  it("tait le poids quand il est inconnu", () => {
    expect(resumeSuppressionStem(0, 0)).not.toContain("(");
  });
});

describe("resumeSuppressionArbre", () => {
  it("rassure sur le sort de l'audio d'origine", () => {
    // La crainte légitime est de perdre l'enregistrement lui-même.
    expect(resumeSuppressionArbre(5, 50 * MO)).toContain("L'audio d'origine est conservé");
  });

  it("accorde au singulier", () => {
    expect(resumeSuppressionArbre(1, MO)).toContain("1 piste extraite");
  });
});
