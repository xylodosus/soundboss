import { describe, expect, it } from 'vitest';
import {
  STEM_TYPES,
  assetsProduits,
  estTerminee,
  messageEtat,
  parseAsset,
  parseTaches,
  parseUrlDepot,
  stemsDeLAsset,
  typeDeStem,
} from '../src/fadr.ts';

describe('parseUrlDepot', () => {
  it('lit une url de dépôt signée', () => {
    expect(parseUrlDepot({ url: 'https://s3/x', s3Path: 'chemin/x' })).toEqual({
      url: 'https://s3/x',
      s3Path: 'chemin/x',
    });
  });

  it('refuse une réponse incomplète plutôt que de déposer dans le vide', () => {
    expect(() => parseUrlDepot({ url: 'https://s3/x' })).toThrow();
    expect(() => parseUrlDepot(null)).toThrow();
  });
});

describe('parseAsset', () => {
  it("lit l'identifiant d'un asset", () => {
    expect(parseAsset({ asset: { _id: 'abc' } })).toBe('abc');
  });

  it('accepte un asset rendu à la racine', () => {
    expect(parseAsset({ _id: 'abc' })).toBe('abc');
  });

  it('refuse une réponse sans identifiant', () => {
    expect(() => parseAsset({ asset: {} })).toThrow();
  });
});

describe('parseTaches', () => {
  it('lit la liste des tâches', () => {
    const taches = parseTaches({ tasks: [{ _id: 't1', status: { complete: false } }] });
    expect(taches).toHaveLength(1);
    expect(taches[0]._id).toBe('t1');
  });

  it('rend une liste vide quand il n’y a rien à lire', () => {
    expect(parseTaches({})).toEqual([]);
    expect(parseTaches(null)).toEqual([]);
  });
});

describe('estTerminee', () => {
  it('ne se fie qu’au drapeau complete', () => {
    expect(estTerminee({ _id: 't', status: { complete: true } })).toBe(true);
    expect(estTerminee({ _id: 't', status: { complete: false } })).toBe(false);
  });

  it('considère une tâche sans statut comme non terminée', () => {
    expect(estTerminee({ _id: 't' })).toBe(false);
  });
});

describe('messageEtat', () => {
  it('remonte le message de progression', () => {
    expect(messageEtat({ _id: 't', status: { msg: 'Stemming', progress: 40 } })).toBe(
      'Stemming (40%)',
    );
  });

  it('se contente du message quand la progression manque', () => {
    expect(messageEtat({ _id: 't', status: { msg: 'Queued' } })).toBe('Queued');
  });

  it('reste lisible sans statut du tout', () => {
    expect(messageEtat({ _id: 't' })).toBe('état inconnu');
  });
});

describe('assetsProduits', () => {
  it('rend les identifiants produits', () => {
    expect(assetsProduits({ _id: 't', output: { assets: ['a', 'b'] } })).toEqual(['a', 'b']);
  });

  it('accepte des assets sous forme d’objets', () => {
    expect(assetsProduits({ _id: 't', output: { assets: [{ _id: 'a' }] } })).toEqual(['a']);
  });

  it('rend une liste vide sans sortie', () => {
    expect(assetsProduits({ _id: 't' })).toEqual([]);
  });
});

describe('typeDeStem', () => {
  it('lit le type dans les métadonnées', () => {
    expect(typeDeStem({ metaData: { stemType: 'drums' } })).toBe('drums');
  });

  it('rend inconnu plutôt que d’échouer sur un type non documenté', () => {
    // La documentation Fadr n'énumère pas toutes les valeurs produites.
    expect(typeDeStem({ metaData: {} })).toBe('inconnu');
    expect(typeDeStem(null)).toBe('inconnu');
  });
});

describe('STEM_TYPES', () => {
  it('décrit les quatre découpes et leur hiérarchie', () => {
    expect(Object.keys(STEM_TYPES).sort()).toEqual([
      'drum-stem',
      'main',
      'melodic-stem',
      'vocal-stem',
    ]);
    expect(STEM_TYPES.main.parent).toBeNull();
    expect(STEM_TYPES['drum-stem'].parent).toBe('drums');
  });
});

describe('stemsDeLAsset', () => {
  it('lit les stems portés par l’asset source', () => {
    // La documentation tutoriel : « l'asset aura une propriété stems, tableau
    // des _id des nouveaux assets créés pendant la tâche ».
    expect(stemsDeLAsset({ asset: { stems: ['a', 'b'] } })).toEqual(['a', 'b']);
  });

  it('accepte un asset rendu à la racine', () => {
    expect(stemsDeLAsset({ stems: ['a'] })).toEqual(['a']);
  });

  it('accepte des stems sous forme d’objets', () => {
    expect(stemsDeLAsset({ asset: { stems: [{ _id: 'a' }] } })).toEqual(['a']);
  });

  it('rend une liste vide quand il n’y en a pas', () => {
    expect(stemsDeLAsset({ asset: {} })).toEqual([]);
    expect(stemsDeLAsset(null)).toEqual([]);
  });
});
