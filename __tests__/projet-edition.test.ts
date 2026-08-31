import { champsAEffacer } from "../src/lib/projet-edition";

describe("champsAEffacer", () => {
  it("liste un champ texte qui portait une valeur et n'en porte plus", () => {
    expect(champsAEffacer({ description: "ancien" }, { description: null })).toEqual(["description"]);
  });

  it("liste une date retirée", () => {
    expect(champsAEffacer({ date_fin: "2026-09-01" }, { date_fin: null })).toEqual(["date_fin"]);
  });

  it("ignore un champ inchangé", () => {
    expect(champsAEffacer({ description: "texte" }, { description: "texte" })).toEqual([]);
  });

  it("ignore un champ que l'on remplit", () => {
    expect(champsAEffacer({ lieu_evenement: null }, { lieu_evenement: "Abidjan" })).toEqual([]);
  });

  it("ignore un champ déjà vide avant comme après", () => {
    expect(champsAEffacer({ description: null }, { description: null })).toEqual([]);
  });

  it("traite la chaîne vide comme un effacement", () => {
    expect(champsAEffacer({ description: "ancien" }, { description: "" })).toEqual(["description"]);
  });

  it("cumule plusieurs effacements", () => {
    expect(
      champsAEffacer(
        { description: "d", lieu_evenement: "l", date_debut: "2026-01-01" },
        { description: null, lieu_evenement: null, date_debut: "2026-01-01" }
      )
    ).toEqual(["description", "lieu_evenement"]);
  });
});
