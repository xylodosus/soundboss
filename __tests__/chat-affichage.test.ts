import { debutDeSerie, nomAuteur } from "../src/lib/chat-affichage";

describe("nomAuteur", () => {
  it("compose prénom et nom", () => {
    expect(nomAuteur({ id: "1", prenom: "Awa", nom: "Diop" })).toBe("Awa Diop");
  });

  it("tolère un nom manquant", () => {
    expect(nomAuteur({ id: "1", prenom: "Awa", nom: null })).toBe("Awa");
  });

  it("retombe sur un libellé neutre quand tout manque", () => {
    expect(nomAuteur(null)).toBe("Membre");
  });
});

describe("debutDeSerie", () => {
  const a = { user_id: "a" };
  const b = { user_id: "b" };

  it("affiche l'en-tête sur le tout premier message", () => {
    expect(debutDeSerie(a, null, false)).toBe(true);
  });

  it("affiche l'en-tête quand l'auteur change", () => {
    expect(debutDeSerie(b, a, false)).toBe(true);
  });

  it("masque l'en-tête sur un message consécutif du même auteur", () => {
    expect(debutDeSerie(a, a, false)).toBe(false);
  });

  it("réaffiche l'en-tête à chaque nouveau jour", () => {
    expect(debutDeSerie(a, a, true)).toBe(true);
  });

  it("groupe deux messages sans auteur connu, user_id étant nullable en base", () => {
    expect(debutDeSerie({ user_id: null }, { user_id: null }, false)).toBe(false);
  });
});
