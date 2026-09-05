import { agreger } from "../src/lib/stockage";

const MO = 1024 * 1024;

describe("agreger", () => {
  it("range chaque fichier dans sa catégorie", () => {
    const r = agreger(
      [
        { type: "audio", taille: 2 * MO },
        { type: "pdf", taille: 1 * MO },
      ],
      [],
      []
    );
    expect(r.categories.find((c) => c.cle === "audio")).toMatchObject({ total: 2 * MO, nb: 1 });
    expect(r.categories.find((c) => c.cle === "pdf")).toMatchObject({ total: 1 * MO, nb: 1 });
    expect(r.total).toBe(3 * MO);
    expect(r.nb).toBe(2);
  });

  it("verse un type inconnu dans « Autres » plutôt que de le perdre", () => {
    const r = agreger([{ type: "theremin", taille: MO }], [], []);
    expect(r.categories.find((c) => c.cle === "autre")).toMatchObject({ total: MO, nb: 1 });
    expect(r.total).toBe(MO);
  });

  it("compte les audios de répétition, que l'ancien calcul ignorait", () => {
    const r = agreger([], [{ taille: 5 * MO }, { taille: 3 * MO }], []);
    expect(r.categories.find((c) => c.cle === "repetitions")).toMatchObject({
      total: 8 * MO,
      nb: 2,
    });
  });

  it("compte les pistes extraites, que l'ancien calcul ignorait aussi", () => {
    // Cinq à seize pistes par morceau : c'est la famille la plus lourde.
    const r = agreger([], [], Array.from({ length: 16 }, () => ({ taille: MO })));
    expect(r.categories.find((c) => c.cle === "stems")).toMatchObject({ total: 16 * MO, nb: 16 });
  });

  it("traite une taille absente comme nulle sans perdre le fichier", () => {
    const r = agreger([{ type: "audio", taille: null }], [], []);
    expect(r.total).toBe(0);
    expect(r.nb).toBe(1);
  });

  it("rend toutes les catégories même vides, pour un graphique stable", () => {
    const r = agreger([], [], []);
    expect(r.categories).toHaveLength(8);
    expect(r.total).toBe(0);
    expect(r.nb).toBe(0);
  });
});
