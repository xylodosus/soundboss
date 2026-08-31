import { describe, expect, it } from 'vitest';
import { bpmDepuisBattements, parseBattements } from '../src/bpm.ts';

describe('parseBattements', () => {
  it('lit les instants produits par aubiotrack', () => {
    expect(parseBattements('0.000000\n0.500000\n1.000000\n')).toEqual([0, 0.5, 1]);
  });

  it('ignore les lignes vides et le bruit', () => {
    expect(parseBattements('0.500000\n\nbruit\n1.000000\n')).toEqual([0.5, 1]);
  });

  it('rend une liste vide sur une sortie vide', () => {
    expect(parseBattements('')).toEqual([]);
  });
});

describe('bpmDepuisBattements', () => {
  it('déduit le tempo d\'intervalles réguliers', () => {
    expect(bpmDepuisBattements([0, 0.5, 1.0, 1.5])).toBe(120);
  });

  it('résiste au tremblement grâce à la médiane', () => {
    expect(bpmDepuisBattements([0, 0.5, 1.02, 1.48, 2.0])).toBe(118);
  });

  it('refuse de conclure sur trop peu de battements', () => {
    expect(bpmDepuisBattements([0, 0.5])).toBeNull();
  });

  it('rejette un tempo sous la borne musicale plausible', () => {
    expect(bpmDepuisBattements([0, 10, 20, 30])).toBeNull();
  });

  it('rejette un tempo au-dessus de la borne plausible', () => {
    expect(bpmDepuisBattements([0, 0.1, 0.2, 0.3])).toBeNull();
  });
});
