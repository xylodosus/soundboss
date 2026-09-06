import { libelleOrigine, sourcesDisponibles } from "../src/lib/sources-generation";

describe("sourcesDisponibles", () => {
  it("place le morceau ouvert dans le labo en tête", () => {
    const sources = sourcesDisponibles({
      labo: { cle: "r2/hosanna.mp3", titre: "Hosanna" },
      enregistrements: [{ url: "r2/autre.mp3", titre: "Autre" }],
    });
    expect(sources[0]).toEqual({
      cle: "r2/hosanna.mp3",
      titre: "Hosanna",
      origine: "labo",
    });
  });

  it("ne propose pas deux fois le même fichier", () => {
    // L'audio ouvert dans le labo est le plus souvent aussi un audio de la
    // répétition : sans dédoublonnage, la liste le proposerait deux fois.
    const sources = sourcesDisponibles({
      labo: { cle: "r2/hosanna.mp3", titre: "Hosanna" },
      enregistrements: [
        { url: "r2/hosanna.mp3", titre: "HOSANNA.mp3" },
        { url: "r2/pardonne.mp3", titre: "Pardonne-nous" },
      ],
    });
    expect(sources.map((s) => s.cle)).toEqual(["r2/hosanna.mp3", "r2/pardonne.mp3"]);
    expect(sources[0].origine).toBe("labo");
  });

  it("écarte les fichiers du groupe qui ne sont pas de l'audio", () => {
    const sources = sourcesDisponibles({
      ressources: [
        { url: "r2/partition.pdf", nom: "Partition", type: "pdf" },
        { url: "r2/demo.mp3", nom: "Démo", type: "audio" },
      ],
    });
    expect(sources).toEqual([
      { cle: "r2/demo.mp3", titre: "Démo", origine: "groupe" },
    ]);
  });

  it("remplace un titre absent ou vide par un libellé neutre", () => {
    const sources = sourcesDisponibles({
      enregistrements: [
        { url: "r2/a.mp3", titre: null },
        { url: "r2/b.mp3", titre: "   " },
      ],
    });
    expect(sources.map((s) => s.titre)).toEqual(["Audio", "Audio"]);
  });

  it("ignore une clé vide plutôt que de proposer une source injouable", () => {
    expect(sourcesDisponibles({ enregistrements: [{ url: "", titre: "Vide" }] })).toEqual([]);
  });

  it("rend une liste vide sans aucune provenance", () => {
    expect(sourcesDisponibles({})).toEqual([]);
  });
});

describe("libelleOrigine", () => {
  it("nomme chaque provenance", () => {
    expect(libelleOrigine("labo")).toBe("Ouvert dans le labo");
    expect(libelleOrigine("repetition")).toBe("Audio de la répétition");
    expect(libelleOrigine("groupe")).toBe("Fichier du groupe");
    expect(libelleOrigine("micro")).toBe("Enregistrement micro");
  });
});
