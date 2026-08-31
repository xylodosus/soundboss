import { nettoyerNom } from "../src/lib/telechargement";

describe("nettoyerNom", () => {
  it("remplace les caractères refusés par un système de fichiers", () => {
    expect(nettoyerNom("a/b:c*d.m4a")).toBe("a_b_c_d.m4a");
  });

  it("remplace les accents, que \\w ne reconnaît pas", () => {
    expect(nettoyerNom("Répétition.m4a")).toBe("R_p_tition.m4a");
  });

  it("retombe sur un nom par défaut quand tout est retiré", () => {
    expect(nettoyerNom("")).toBe("audio");
  });

  it("borne la longueur à 80 caractères", () => {
    expect(nettoyerNom("a".repeat(200))).toHaveLength(80);
  });
});
