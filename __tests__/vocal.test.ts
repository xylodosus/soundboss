import {
  DUREE_MINIMALE_MS,
  DUREE_TAP_MS,
  SEUIL_ANNULATION,
  SEUIL_VERROU,
  chronoVocal,
  issueAuRelachement,
  issueDuGeste,
  progressionVers,
} from "../src/lib/vocal";

describe("issueDuGeste", () => {
  it("ne décide rien tant qu'aucun seuil n'est franchi", () => {
    expect(issueDuGeste(0, 0)).toBe("rien");
    expect(issueDuGeste(-(SEUIL_ANNULATION - 1), 0)).toBe("rien");
    expect(issueDuGeste(0, -(SEUIL_VERROU - 1))).toBe("rien");
  });

  it("annule sur un glissement vers la gauche", () => {
    expect(issueDuGeste(-SEUIL_ANNULATION, 0)).toBe("annuler");
    expect(issueDuGeste(-200, -10)).toBe("annuler");
  });

  it("verrouille sur un glissement vers le haut", () => {
    expect(issueDuGeste(0, -SEUIL_VERROU)).toBe("verrouiller");
    expect(issueDuGeste(-10, -200)).toBe("verrouiller");
  });

  it("tranche en diagonale par l'axe dominant", () => {
    // Sans arbitrage, un geste approximatif annulerait alors que l'utilisateur
    // visait le verrou — on perdrait l'enregistrement.
    expect(issueDuGeste(-100, -80)).toBe("annuler");
    expect(issueDuGeste(-80, -100)).toBe("verrouiller");
  });

  it("ignore les mouvements vers la droite et vers le bas", () => {
    expect(issueDuGeste(300, 300)).toBe("rien");
  });
});

describe("progressionVers", () => {
  it("va de zéro à un et n'excède pas le seuil", () => {
    expect(progressionVers(0, 70)).toBe(0);
    expect(progressionVers(35, 70)).toBe(0.5);
    expect(progressionVers(70, 70)).toBe(1);
    expect(progressionVers(500, 70)).toBe(1);
  });

  it("reste à zéro sur un déplacement à contresens", () => {
    expect(progressionVers(-40, 70)).toBe(0);
  });
});

describe("issueAuRelachement", () => {
  it("passe en mains libres sur un simple tap", () => {
    // Sans cette issue, le geste serait la seule sortie de l'enregistrement :
    // s'il se perd, l'utilisateur est enfermé sans bouton pour envoyer.
    expect(issueAuRelachement(0)).toBe("verrouiller");
    expect(issueAuRelachement(DUREE_TAP_MS - 1)).toBe("verrouiller");
  });

  it("écarte un appui trop bref pour être une note", () => {
    expect(issueAuRelachement(DUREE_TAP_MS)).toBe("trop-court");
    expect(issueAuRelachement(DUREE_MINIMALE_MS - 1)).toBe("trop-court");
  });

  it("envoie dès la durée minimale", () => {
    expect(issueAuRelachement(DUREE_MINIMALE_MS)).toBe("envoyer");
    expect(issueAuRelachement(30_000)).toBe("envoyer");
  });
});

describe("chronoVocal", () => {
  it("affiche minutes et secondes, sans heures", () => {
    expect(chronoVocal(0)).toBe("0:00");
    expect(chronoVocal(1_000)).toBe("0:01");
    expect(chronoVocal(61_000)).toBe("1:01");
    expect(chronoVocal(605_000)).toBe("10:05");
  });

  it("ne rend jamais de temps négatif", () => {
    expect(chronoVocal(-5_000)).toBe("0:00");
  });
});
