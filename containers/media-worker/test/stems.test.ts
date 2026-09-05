import { describe, expect, it } from 'vitest';
import { cleStem, echeanceDepassee, parentPourType } from '../src/stems-regles.ts';

describe('cleStem', () => {
  it('range les stems à côté du morceau, dans leur propre dossier', () => {
    expect(cleStem('seances/enregistrements/abc/def.m4a', 'drums')).toBe(
      'seances/enregistrements/abc/def.stems/drums.m4a',
    );
  });

  it('normalise un type à espaces', () => {
    expect(cleStem('a/b.m4a', 'lead vocals')).toBe('a/b.stems/lead-vocals.m4a');
  });

  it('neutralise ce qui n’a rien à faire dans une clé', () => {
    // Le type vient de Fadr : il n'est pas contraint, donc pas digne de confiance.
    expect(cleStem('a/b.m4a', '../../secret')).toBe('a/b.stems/secret.m4a');
    expect(cleStem('a/b.m4a', 'Autres Mélodies')).toBe('a/b.stems/autres-melodies.m4a');
  });

  it('se rabat sur un nom neutre pour un type vide', () => {
    expect(cleStem('a/b.m4a', '')).toBe('a/b.stems/stem.m4a');
  });
});

describe('parentPourType', () => {
  const existants = [
    { id: 's1', type: 'drums' },
    { id: 's2', type: 'melodies' },
  ];

  it('rattache un affinage au stem dont il descend', () => {
    expect(parentPourType('drum-stem', existants)).toBe('s1');
    expect(parentPourType('melodic-stem', existants)).toBe('s2');
  });

  it('ne rattache rien à une découpe principale', () => {
    expect(parentPourType('main', existants)).toBeNull();
  });

  it('ne rattache rien quand le stem parent n’existe pas encore', () => {
    expect(parentPourType('vocal-stem', existants)).toBeNull();
  });
});

describe('echeanceDepassee', () => {
  it('laisse passer tant que le délai court', () => {
    expect(echeanceDepassee(1000, 500, 5000)).toBe(false);
  });

  it('coupe au-delà du délai', () => {
    // Fadr ne décrit aucun état d'échec : l'échéance est le seul juge.
    expect(echeanceDepassee(1000, 7000, 5000)).toBe(true);
  });
});
