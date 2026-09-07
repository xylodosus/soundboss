import { describe, expect, it } from 'vitest';
import {
  DELAI_ABANDON_MIN,
  DELAI_INTERROGATION_MIN,
  ageEnMinutes,
  aInterroger,
  suiteADonner,
} from '../src/generation-regles.ts';

const MAINTENANT = new Date('2026-09-07T12:00:00Z');

describe('ageEnMinutes', () => {
  it('mesure l’écart en minutes', () => {
    expect(ageEnMinutes('2026-09-07T11:30:00Z', MAINTENANT)).toBe(30);
  });

  it('traite une date absente ou illisible comme infiniment vieille', () => {
    // Un job sans horodatage ne doit pas échapper au balayage en devenant
    // éternellement « trop récent pour être interrogé ».
    expect(ageEnMinutes(null, MAINTENANT)).toBe(Number.POSITIVE_INFINITY);
    expect(ageEnMinutes('pas une date', MAINTENANT)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('aInterroger', () => {
  it('laisse passer les quelques minutes que demande une génération', () => {
    expect(aInterroger(DELAI_INTERROGATION_MIN - 0.1)).toBe(false);
    expect(aInterroger(DELAI_INTERROGATION_MIN)).toBe(true);
  });
});

describe('suiteADonner', () => {
  it('termine un job dont le fournisseur a les pistes', () => {
    expect(suiteADonner('reussie', 6)).toBe('finir');
    // Même très vieux : les pistes existent, on les rapatrie.
    expect(suiteADonner('reussie', 10_000)).toBe('finir');
  });

  it('acte un échec annoncé par le fournisseur, sans attendre l’échéance', () => {
    expect(suiteADonner('echouee', 6)).toBe('echouer');
  });

  it('patiente tant que la tâche court', () => {
    expect(suiteADonner('en_cours', 6)).toBe('attendre');
  });

  it('ne prend pas un statut inconnu pour un échec', () => {
    // Un statut que nous ne connaissons pas encore ne prouve rien.
    expect(suiteADonner('inconnue', 6)).toBe('attendre');
  });

  it('cesse d’attendre à l’échéance absolue', () => {
    expect(suiteADonner('en_cours', DELAI_ABANDON_MIN - 0.1)).toBe('attendre');
    expect(suiteADonner('en_cours', DELAI_ABANDON_MIN)).toBe('echouer');
    expect(suiteADonner('inconnue', DELAI_ABANDON_MIN)).toBe('echouer');
  });
});
