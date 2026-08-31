import { describe, it, expect } from 'vitest';
import { PeakAccumulator } from '../src/waveform.ts';

describe('PeakAccumulator', () => {
  it('produit exactement le nombre de pics demandé', () => {
    const acc = new PeakAccumulator(100, 10);
    acc.push(new Int16Array(100));
    expect(acc.finish()).toHaveLength(10);
  });

  it('retient le maximum absolu de chaque intervalle', () => {
    // 8 échantillons, 4 pics → 2 échantillons par pic
    const acc = new PeakAccumulator(8, 4);
    acc.push(Int16Array.from([0, 32767, 100, 200, 0, 0, -32768, 5]));
    const peaks = acc.finish();
    expect(peaks[0]).toBe(255); // max(0, 32767) → plein
    expect(peaks[1]).toBeGreaterThan(0);
    expect(peaks[1]).toBeLessThan(10); // max(100, 200) → très bas
    expect(peaks[2]).toBe(0); // silence
    expect(peaks[3]).toBe(255); // |-32768| → plein
  });

  it('donne le même résultat que les données arrivent en un ou plusieurs morceaux', () => {
    const data = Int16Array.from([10, 20, 30, 40, 50, 60, 70, 80]);
    const enUnCoup = new PeakAccumulator(8, 4);
    enUnCoup.push(data);

    const enMorceaux = new PeakAccumulator(8, 4);
    enMorceaux.push(data.slice(0, 3));
    enMorceaux.push(data.slice(3, 5));
    enMorceaux.push(data.slice(5));

    expect(Array.from(enMorceaux.finish())).toEqual(Array.from(enUnCoup.finish()));
  });

  it('renvoie des pics nuls sur du silence', () => {
    const acc = new PeakAccumulator(50, 5);
    acc.push(new Int16Array(50));
    expect(Array.from(acc.finish())).toEqual([0, 0, 0, 0, 0]);
  });

  it('borne les valeurs entre 0 et 255', () => {
    const acc = new PeakAccumulator(4, 2);
    acc.push(Int16Array.from([-32768, 32767, 0, 0]));
    const peaks = acc.finish();
    for (const p of peaks) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(255);
    }
  });

  it('ne déborde pas si le flux est plus long que prévu', () => {
    const acc = new PeakAccumulator(10, 5);
    acc.push(new Int16Array(40).fill(1000));
    expect(acc.finish()).toHaveLength(5);
  });
});
