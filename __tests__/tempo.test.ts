import { TEMPO_MAX, TEMPO_MIN, bpmAffiche, pasTempo } from "../src/lib/tempo";

/** Enchaîne des crans et rend le BPM affiché à l'arrivée. */
function apres(bpm: number, crans: number[]): number {
  let t = 1;
  for (const sens of crans) t = pasTempo(t, sens, bpm);
  return bpmAffiche(bpm, t);
}

describe("pasTempo — mode BPM", () => {
  it("déplace le BPM affiché d'exactement un cran", () => {
    expect(apres(120, [1])).toBe(121);
    expect(apres(120, [-1])).toBe(119);
  });

  it("redescend après être monté — le cas signalé", () => {
    // 120 → 130 par dix crans, puis six crans vers le bas pour viser 124.
    // L'arrondi du ratio à deux décimales bloquait la descente à 130.
    const monte = Array(10).fill(1);
    expect(apres(120, monte)).toBe(130);
    expect(apres(120, [...monte, -1])).toBe(129);
    expect(apres(120, [...monte, ...Array(6).fill(-1)])).toBe(124);
  });

  it("revient exactement à son point de départ", () => {
    for (const bpm of [60, 81, 100, 120, 137, 170]) {
      const aller = Array(12).fill(1);
      const retour = Array(12).fill(-1);
      expect(apres(bpm, [...aller, ...retour])).toBe(bpm);
    }
  });

  it("avance d'un BPM par cran sur toute la montée", () => {
    let t = 1;
    for (let i = 1; i <= 15; i += 1) {
      t = pasTempo(t, 1, 120);
      expect(bpmAffiche(120, t)).toBe(120 + i);
    }
  });

  it("respecte les bornes, en BPM et non sur le ratio", () => {
    // 120 × 1,5 = 180 en haut, 120 × 0,5 = 60 en bas.
    expect(apres(120, Array(200).fill(1))).toBe(180);
    expect(apres(120, Array(200).fill(-1))).toBe(60);
  });

  it("ne dépasse jamais les bornes du multiplicateur", () => {
    let t = 1;
    for (let i = 0; i < 300; i += 1) t = pasTempo(t, 1, 137);
    expect(t).toBeLessThanOrEqual(TEMPO_MAX);
    for (let i = 0; i < 300; i += 1) t = pasTempo(t, -1, 137);
    expect(t).toBeGreaterThanOrEqual(TEMPO_MIN);
  });

  it("reste stable une fois la borne atteinte", () => {
    let t = 1;
    for (let i = 0; i < 200; i += 1) t = pasTempo(t, 1, 120);
    const borne = t;
    expect(pasTempo(borne, 1, 120)).toBe(borne);
  });
});

describe("pasTempo — mode multiplicateur", () => {
  it("avance par pas de 0,05 quand le BPM est inconnu", () => {
    expect(pasTempo(1, 1, 0)).toBe(1.05);
    expect(pasTempo(1, -1, 0)).toBe(0.95);
  });

  it("n'accumule pas d'erreur binaire", () => {
    let t = 1;
    for (let i = 0; i < 6; i += 1) t = pasTempo(t, 1, 0);
    expect(t).toBe(1.3);
  });

  it("borne le multiplicateur", () => {
    expect(pasTempo(TEMPO_MAX, 1, 0)).toBe(TEMPO_MAX);
    expect(pasTempo(TEMPO_MIN, -1, 0)).toBe(TEMPO_MIN);
  });
});
