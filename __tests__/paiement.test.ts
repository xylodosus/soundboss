import {
  ESSAIS_MAX,
  doitAttendre,
  lireRetour,
  messageIssue,
} from "../src/lib/paiement";

describe("lireRetour", () => {
  it("lit l'issue et la référence du lien profond", () => {
    expect(lireRetour("soundboss://wallet?paiement=retour&ref=SB-abc123")).toEqual({
      issue: "retour",
      reference: "SB-abc123",
    });
  });

  it("reconnaît une interruption", () => {
    expect(lireRetour("soundboss://wallet?paiement=interrompu&ref=SB-x").issue).toBe(
      "interrompu"
    );
  });

  it("ne prend pas une valeur inattendue pour un retour", () => {
    // Quelqu'un peut ouvrir l'adresse à la main : tout ce qui n'est pas
    // exactement attendu vaut « inconnue », jamais « retour ».
    expect(lireRetour("soundboss://wallet?paiement=succes&ref=SB-x").issue).toBe("inconnue");
    expect(lireRetour("soundboss://wallet").issue).toBe("inconnue");
  });

  it("survit à une URL absente ou illisible", () => {
    expect(lireRetour(null)).toEqual({ issue: "inconnue", reference: null });
    expect(lireRetour("pas une url")).toEqual({ issue: "inconnue", reference: null });
  });
});

describe("doitAttendre", () => {
  it("continue tant que le paiement est en attente", () => {
    // `pending` n'est pas une réponse, c'est l'absence de réponse.
    expect(doitAttendre("pending", 0)).toBe(true);
    expect(doitAttendre(null, 3)).toBe(true);
  });

  it("s'arrête sur un statut définitif", () => {
    expect(doitAttendre("completed", 0)).toBe(false);
    expect(doitAttendre("failed", 0)).toBe(false);
    expect(doitAttendre("refunded", 0)).toBe(false);
  });

  it("abandonne au plafond, même en attente", () => {
    expect(doitAttendre("pending", ESSAIS_MAX - 1)).toBe(true);
    expect(doitAttendre("pending", ESSAIS_MAX)).toBe(false);
  });
});

describe("messageIssue", () => {
  it("annonce les crédits reçus", () => {
    expect(messageIssue("completed", 55)).toContain("55 crédits ajoutés");
    expect(messageIssue("completed", 1)).toContain("1 crédit ajouté");
  });

  it("rassure sur l'échec", () => {
    expect(messageIssue("failed", 10)).toContain("Rien ne t'a été débité");
  });

  it("ne conclut pas à l'échec quand rien n'est tranché", () => {
    // L'argent peut encore arriver : annoncer un échec ferait croire à une
    // perte, et le solde se mettrait à jour derrière.
    const m = messageIssue("pending", 10);
    expect(m).not.toContain("n'a pas abouti");
    expect(m).toContain("vérification");
  });
});
