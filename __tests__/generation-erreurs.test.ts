import { messageErreurGeneration } from "../src/lib/generation-erreurs";

describe("messageErreurGeneration", () => {
  it("explique le refus pour contenu reconnu", () => {
    // Constaté le 6 septembre : Suno refuse toute source dont l'empreinte
    // correspond à un enregistrement de son catalogue.
    expect(
      messageErreurGeneration("Kie.ai 413 : This audio matches an existing recording in our catalog.")
    ).toMatch(/enregistrement connu|original/i);
  });

  it("explique un solde insuffisant", () => {
    expect(messageErreurGeneration("Kie.ai 402 : Insufficient Credits")).toMatch(/crédit/i);
  });

  it("explique une source inaccessible", () => {
    expect(messageErreurGeneration("Le lien signé de la source n'est pas accessible (403).")).toMatch(
      /source/i
    );
  });

  it("rend le message tel quel s'il n'est pas reconnu", () => {
    expect(messageErreurGeneration("Panne inattendue")).toBe("Panne inattendue");
  });

  it("rend un message neutre quand il n'y a rien", () => {
    expect(messageErreurGeneration(null)).toBe("La génération n'a pas abouti.");
  });
});
