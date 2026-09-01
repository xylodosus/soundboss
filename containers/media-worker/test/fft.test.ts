import { describe, expect, it } from 'vitest';
import { fft, magnitudes } from '../src/fft.ts';

describe('fft', () => {
  it('transforme un signal constant en une seule composante continue', () => {
    const re = Float64Array.from([1, 1, 1, 1]);
    const im = new Float64Array(4);
    fft(re, im);
    expect(re[0]).toBeCloseTo(4, 10);
    expect(re[1]).toBeCloseTo(0, 10);
    expect(re[2]).toBeCloseTo(0, 10);
    expect(re[3]).toBeCloseTo(0, 10);
  });

  it('place une sinusoïde dans son propre intervalle', () => {
    const N = 64;
    const k = 7;
    const re = new Float64Array(N);
    for (let n = 0; n < N; n++) re[n] = Math.sin((2 * Math.PI * k * n) / N);
    const im = new Float64Array(N);
    fft(re, im);
    const mags = magnitudes(re, im);
    let meilleur = 0;
    for (let i = 1; i < N / 2; i++) if (mags[i] > mags[meilleur]) meilleur = i;
    expect(meilleur).toBe(k);
  });

  it('refuse une taille qui n’est pas une puissance de deux', () => {
    expect(() => fft(new Float64Array(3), new Float64Array(3))).toThrow();
  });

  it('refuse des tableaux de tailles différentes', () => {
    expect(() => fft(new Float64Array(4), new Float64Array(8))).toThrow();
  });
});
