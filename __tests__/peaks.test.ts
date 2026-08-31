import { echantillonnerPics, parsePics } from "../src/lib/peaks";

describe("parsePics", () => {
  it("lit le format produit par le worker", () => {
    expect(parsePics(JSON.stringify({ v: 1, peaks: [0, 128, 255] }))).toEqual([0, 128, 255]);
  });

  it("rejette une version inconnue plutôt que d'interpréter au hasard", () => {
    expect(parsePics(JSON.stringify({ v: 2, peaks: [1, 2] }))).toBeNull();
  });

  it("rejette un JSON invalide", () => {
    expect(parsePics("pas du json")).toBeNull();
  });

  it("rejette un tableau absent", () => {
    expect(parsePics(JSON.stringify({ v: 1 }))).toBeNull();
  });
});

describe("echantillonnerPics", () => {
  it("réduit à la largeur demandée en gardant le maximum de chaque intervalle", () => {
    expect(echantillonnerPics([0, 10, 2, 200, 4, 6], 3)).toEqual([10, 200, 6]);
  });

  it("rend le tableau tel quel quand il est déjà assez court", () => {
    expect(echantillonnerPics([5, 9], 4)).toEqual([5, 9]);
  });

  it("rend un tableau vide sur une entrée vide", () => {
    expect(echantillonnerPics([], 10)).toEqual([]);
  });
});
