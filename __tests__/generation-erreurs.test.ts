import { etatGeneration, messageErreurGeneration } from "../src/lib/generation-erreurs";

describe("messageErreurGeneration", () => {
  it("explique le refus pour contenu reconnu", () => {
    // Constaté le 6 septembre : Suno refuse toute source dont l'empreinte
    // correspond à un enregistrement de son catalogue.
    const message = messageErreurGeneration(
      "Kie.ai 413 : This audio matches an existing recording in our catalog."
    );
    expect(message).toMatch(/droits d'auteur/i);
    // Le rejet n'étant pas facturé, le dire évite une inquiétude inutile.
    expect(message).toMatch(/facturé/i);
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

describe("etatGeneration", () => {
  it("distingue la file d'attente du traitement", () => {
    expect(etatGeneration("queued", 0)).toEqual({ libelle: "En file", ton: "attente" });
    expect(etatGeneration("processing", 0)).toEqual({ libelle: "En cours", ton: "attente" });
  });

  it("accorde le nombre de versions", () => {
    expect(etatGeneration("completed", 1).libelle).toBe("1 version");
    expect(etatGeneration("completed", 2).libelle).toBe("2 versions");
  });

  it("traite un succès sans piste comme un échec, puisque rien n'est écoutable", () => {
    expect(etatGeneration("completed", 0)).toEqual({
      libelle: "Aucune version",
      ton: "echec",
    });
  });

  it("signale l'échec", () => {
    expect(etatGeneration("failed", 0)).toEqual({ libelle: "Échec", ton: "echec" });
  });

  it("suppose un travail en cours devant un statut inconnu ou absent", () => {
    expect(etatGeneration(null, 0).ton).toBe("attente");
    expect(etatGeneration("bizarre", 0).ton).toBe("attente");
  });
});
