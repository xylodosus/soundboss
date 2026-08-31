import { clicsDansHorizon } from "../src/lib/metronome";

describe("clicsDansHorizon", () => {
  it("rend les temps depuis le départ quand la phase est nulle", () => {
    expect(clicsDansHorizon(0, 0, 120, 1)).toEqual([0, 0.5]);
  });

  it("ne rend que les temps à venir quand la lecture est déjà engagée", () => {
    expect(clicsDansHorizon(0.6, 0, 120, 1)).toEqual([1, 1.5]);
  });

  it("respecte une phase décalée", () => {
    expect(clicsDansHorizon(0, 0.25, 60, 2)).toEqual([0.25, 1.25]);
  });

  it("commence à la phase quand la lecture la précède", () => {
    expect(clicsDansHorizon(0, 3, 60, 5)).toEqual([3, 4]);
  });

  it("rejette un tempo trop lent plutôt que de boucler sans fin", () => {
    expect(clicsDansHorizon(0, 0, 10, 1)).toEqual([]);
  });

  it("rejette un tempo trop rapide", () => {
    expect(clicsDansHorizon(0, 0, 400, 1)).toEqual([]);
  });

  it("rejette un tempo absurde", () => {
    expect(clicsDansHorizon(0, 0, Number.NaN, 1)).toEqual([]);
    expect(clicsDansHorizon(0, 0, 0, 1)).toEqual([]);
  });

  it("rend un tableau vide sur un horizon nul", () => {
    expect(clicsDansHorizon(0, 0, 120, 0)).toEqual([]);
  });
});
