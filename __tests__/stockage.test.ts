import { agreger } from "../src/lib/stockage";

const MO = 1024 * 1024;

describe("agreger", () => {
  it("range chaque fichier dans sa catégorie", () => {
    const r = agreger({
      fichiers: [
        { type: "audio", taille: 2 * MO },
        { type: "pdf", taille: 1 * MO },
      ],
    });
    expect(r.categories.find((c) => c.cle === "audio")).toMatchObject({ total: 2 * MO, nb: 1 });
    expect(r.categories.find((c) => c.cle === "pdf")).toMatchObject({ total: 1 * MO, nb: 1 });
    expect(r.total).toBe(3 * MO);
    expect(r.nb).toBe(2);
  });

  it("verse un type inconnu dans « Autres » plutôt que de le perdre", () => {
    const r = agreger({ fichiers: [{ type: "theremin", taille: MO }] });
    expect(r.categories.find((c) => c.cle === "autre")).toMatchObject({ total: MO, nb: 1 });
    expect(r.total).toBe(MO);
  });

  it("compte les audios de répétition, que l'ancien calcul ignorait", () => {
    const r = agreger({ enregistrements: [{ taille: 5 * MO }, { taille: 3 * MO }] });
    expect(r.categories.find((c) => c.cle === "repetitions")).toMatchObject({
      total: 8 * MO,
      nb: 2,
    });
  });

  it("compte les pistes extraites, que l'ancien calcul ignorait aussi", () => {
    // Cinq à seize pistes par morceau : c'est la famille la plus lourde.
    const r = agreger({ stems: Array.from({ length: 16 }, () => ({ taille: MO })) });
    expect(r.categories.find((c) => c.cle === "stems")).toMatchObject({ total: 16 * MO, nb: 16 });
  });

  it("traite une taille absente comme nulle sans perdre le fichier", () => {
    const r = agreger({ fichiers: [{ type: "audio", taille: null }] });
    expect(r.total).toBe(0);
    expect(r.nb).toBe(1);
  });

  it("rend toutes les catégories même vides, pour un graphique stable", () => {
    const r = agreger({});
    expect(r.categories).toHaveLength(10);
    expect(r.total).toBe(0);
    expect(r.nb).toBe(0);
  });
});

describe("agreger — médias des discussions", () => {
  const MO = 1024 * 1024;

  it("compte les pièces jointes du chat, qui ne vivent pas dans ressources", () => {
    const r = agreger({ discussions: [{ taille: 2 * MO }, { taille: MO }] });
    const chat = r.categories.find((c) => c.cle === "discussions")!;
    expect(chat.nb).toBe(2);
    expect(chat.total).toBe(3 * MO);
    expect(r.total).toBe(3 * MO);
  });

  it("reste absent du total quand la discussion est vide", () => {
    const r = agreger({ fichiers: [{ type: "image", taille: MO }] });
    expect(r.categories.find((c) => c.cle === "discussions")!.nb).toBe(0);
    expect(r.total).toBe(MO);
  });

  it("compte un fichier dont la taille manque, sans gonfler le total", () => {
    // Les images envoyées dans le chat n'enregistraient aucune taille : mieux
    // vaut un fichier compté à zéro qu'un fichier invisible.
    const r = agreger({ discussions: [{ taille: null }, { taille: MO }] });
    const chat = r.categories.find((c) => c.cle === "discussions")!;
    expect(chat.nb).toBe(2);
    expect(chat.total).toBe(MO);
  });

  it("laisse l'espace perso inchangé, faute de discussion", () => {
    const r = agreger({ fichiers: [{ type: "audio", taille: MO }], enregistrements: [{ taille: MO }] });
    expect(r.total).toBe(2 * MO);
  });
});

describe("agreger — générations IA", () => {
  const MO2 = 1024 * 1024;

  it("compte les pistes produites par Suno, rangées sous generations/", () => {
    // 16 fichiers, 19,3 Mo sur le projet de test, comptés nulle part.
    const r = agreger({ generations: [{ taille: 3 * MO2 }, { taille: 2 * MO2 }] });
    const g = r.categories.find((c) => c.cle === "generations")!;
    expect(g.nb).toBe(2);
    expect(g.total).toBe(5 * MO2);
    expect(r.total).toBe(5 * MO2);
  });

  it("ne se confond pas avec les médias des discussions", () => {
    // C'est la raison des paramètres nommés : deux listes du même type que
    // rien ne distinguerait si elles étaient positionnelles.
    const r = agreger({
      discussions: [{ taille: MO2 }],
      generations: [{ taille: 7 * MO2 }],
    });
    expect(r.categories.find((c) => c.cle === "discussions")!.total).toBe(MO2);
    expect(r.categories.find((c) => c.cle === "generations")!.total).toBe(7 * MO2);
  });
});
