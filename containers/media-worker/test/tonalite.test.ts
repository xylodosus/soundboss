import { describe, expect, it } from 'vitest';
import { NOTES, chromaDepuisSignal, detecterTonalite, PROFILS } from '../src/tonalite.ts';

const FE = 11025;

function sinusoide(frequences: number[], secondes: number): Float32Array {
  const n = Math.round(FE * secondes);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const f of frequences) v += Math.sin((2 * Math.PI * f * i) / FE);
    s[i] = v / frequences.length;
  }
  return s;
}

function rotation(profil: readonly number[], demiTons: number): number[] {
  return profil.map((_, i) => profil[(i - demiTons + 12) % 12]);
}

describe('chromaDepuisSignal', () => {
  it('range un la 440 dans la classe La', () => {
    const chroma = chromaDepuisSignal(sinusoide([440], 2), FE);
    let meilleur = 0;
    for (let i = 1; i < 12; i++) if (chroma[i] > chroma[meilleur]) meilleur = i;
    expect(NOTES[meilleur]).toBe('La');
  });

  it('retrouve les trois notes d’un accord de do majeur', () => {
    const chroma = chromaDepuisSignal(sinusoide([261.63, 329.63, 392.0], 2), FE);
    const classes = [...chroma.keys()].sort((a, b) => chroma[b] - chroma[a]).slice(0, 3).sort();
    expect(classes).toEqual([0, 4, 7]);
  });

  it('rend un chroma nul sur un signal trop court pour une seule fenêtre', () => {
    const chroma = chromaDepuisSignal(new Float32Array(100), FE);
    expect(chroma.every((v) => v === 0)).toBe(true);
  });
});

describe('detecterTonalite', () => {
  it('reconnaît le profil majeur non transposé', () => {
    expect(detecterTonalite(Float64Array.from(PROFILS.majeur))?.id).toBe('Do:majeur');
  });

  it('reconnaît un profil majeur transposé', () => {
    expect(detecterTonalite(Float64Array.from(rotation(PROFILS.majeur, 7)))?.id).toBe('Sol:majeur');
  });

  it('reconnaît un profil mineur transposé', () => {
    expect(detecterTonalite(Float64Array.from(rotation(PROFILS.mineur, 9)))?.id).toBe('La:mineur');
  });

  it('rend une confiance strictement positive sur un profil net', () => {
    expect(detecterTonalite(Float64Array.from(PROFILS.majeur))!.confiance).toBeGreaterThan(0);
  });

  it('refuse de trancher sur un chroma plat', () => {
    expect(detecterTonalite(Float64Array.from(new Array(12).fill(1)))).toBeNull();
  });

  it('refuse de trancher sur un chroma vide', () => {
    expect(detecterTonalite(new Float64Array(12))).toBeNull();
  });
});
