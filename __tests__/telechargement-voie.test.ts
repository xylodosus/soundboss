import { voieTelechargement } from "../src/lib/telechargement";

describe("voieTelechargement", () => {
  it("télécharge réellement un audio sur Android", () => {
    expect(voieTelechargement("android", "audio/mp4", true)).toBe("bibliotheque");
  });

  it("partage images et vidéos : les recevoir exigerait un accès en lecture à toute la médiathèque", () => {
    expect(voieTelechargement("android", "image/jpeg", true)).toBe("partage");
    expect(voieTelechargement("android", "video/mp4", true)).toBe("partage");
  });

  it("partage les documents : la médiathèque Android les refuse", () => {
    expect(voieTelechargement("android", "application/pdf", true)).toBe("partage");
  });

  it("partage quand la permission est refusée, plutôt que d'échouer", () => {
    expect(voieTelechargement("android", "audio/mp4", false)).toBe("partage");
  });

  it("partage toujours sur iOS, où aucun dossier utilisateur n'existe", () => {
    expect(voieTelechargement("ios", "audio/mp4", true)).toBe("partage");
  });

  it("partage quand le type est inconnu", () => {
    expect(voieTelechargement("android", undefined, true)).toBe("partage");
  });
});
