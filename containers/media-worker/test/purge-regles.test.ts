import { describe, expect, it } from 'vitest';
import { ESSAIS_MAX, aAbandonner, estPurgee } from '../src/purge-regles.ts';

describe('aAbandonner', () => {
  it('laisse sa chance à une clé qui vient d’échouer', () => {
    expect(aAbandonner(0)).toBe(false);
    expect(aAbandonner(ESSAIS_MAX - 1)).toBe(false);
  });

  it('cesse au plafond', () => {
    // Une clé qui échoue cinq fois relève d’un problème qu’un sixième essai
    // ne résoudra pas ; la ligne reste en base avec son motif.
    expect(aAbandonner(ESSAIS_MAX)).toBe(true);
    expect(aAbandonner(99)).toBe(true);
  });
});

describe('estPurgee', () => {
  it('accepte les réponses de suppression', () => {
    expect(estPurgee(204)).toBe(true);
    expect(estPurgee(200)).toBe(true);
  });

  it('tient une clé déjà absente pour purgée', () => {
    // Le drain rejoue : conteneur redémarré, balayage périodique. Compter le
    // 404 comme un échec ferait boucler des purges déjà faites.
    expect(estPurgee(404)).toBe(true);
  });

  it('retient les vraies erreurs', () => {
    for (const s of [401, 403, 429, 500, 503]) {
      expect(estPurgee(s)).toBe(false);
    }
  });
});
