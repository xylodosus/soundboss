import {
  etatGeneration,
  generationsVisibles,
  messageErreurGeneration,
} from "../src/lib/generation-erreurs";

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

describe("messageErreurGeneration — droits d'auteur", () => {
  it("distingue le refus portant sur les paroles de celui portant sur l'enregistrement", () => {
    const paroles = messageErreurGeneration(
      "Kie.ai 413 : Uploaded audio contains copyrighted lyrics"
    );
    expect(paroles).toContain("paroles chantées");
    expect(paroles).toContain("texte original");

    const enregistrement = messageErreurGeneration(
      "Kie.ai 413 : This audio matches an existing recording in our catalog"
    );
    expect(enregistrement).toContain("enregistrement existant");
  });

  it("rappelle dans les deux cas qu'aucune facturation n'a eu lieu", () => {
    for (const brut of [
      "Uploaded audio contains copyrighted lyrics",
      "This audio matches an existing recording in our catalog",
    ]) {
      expect(messageErreurGeneration(brut)).toContain("Rien ne t'a été facturé");
    }
  });

  it("n'affiche jamais le texte brut du fournisseur pour ces refus", () => {
    // Le message brut est consigné en base ; ce qui remonte à l'écran doit
    // être la version compréhensible, jamais l'anglais technique de Kie.ai.
    expect(messageErreurGeneration("Uploaded audio contains copyrighted lyrics")).not.toContain(
      "copyrighted"
    );
  });
});

describe("generationsVisibles", () => {
  const echec = (id: string, user: string, lu: string | null) => ({
    id,
    statut: "failed",
    user_id: user,
    lu_at: lu,
  });

  it("garde toutes les générations qui n'ont pas échoué", () => {
    const liste = [
      { id: "a", statut: "completed", user_id: "autre", lu_at: null },
      { id: "b", statut: "processing", user_id: "autre", lu_at: null },
    ];
    expect(generationsVisibles(liste, "moi").map((g) => g.id)).toEqual(["a", "b"]);
  });

  it("montre son propre échec tant qu'il n'a pas été vu", () => {
    expect(generationsVisibles([echec("a", "moi", null)], "moi")).toHaveLength(1);
  });

  it("écarte l'échec une fois vu", () => {
    expect(generationsVisibles([echec("a", "moi", "2026-09-06T10:00:00Z")], "moi")).toEqual([]);
  });

  it("n'expose jamais l'échec d'un autre membre du groupe", () => {
    expect(generationsVisibles([echec("a", "quelquun", null)], "moi")).toEqual([]);
  });

  it("cache les échecs tant que l'identité n'est pas connue", () => {
    // Rien ne vaut mieux qu'un échec attribué à tort : l'identité arrive de
    // façon asynchrone, la liste peut être rendue avant.
    expect(generationsVisibles([echec("a", "moi", null)], null)).toEqual([]);
  });
});
