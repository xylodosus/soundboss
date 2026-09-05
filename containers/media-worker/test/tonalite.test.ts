import { describe, expect, it } from 'vitest';
import {
  NOTES,
  chromaDepuisSignal,
  detecterTonalite,
  PROFILS,
  sectionsTonales,
} from '../src/tonalite.ts';

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
    const chroma = chromaDepuisSignal(sinusoide([440], 30), FE);
    let meilleur = 0;
    for (let i = 1; i < 12; i++) if (chroma[i] > chroma[meilleur]) meilleur = i;
    expect(NOTES[meilleur]).toBe('La');
  });

  it('retrouve les trois notes d’un accord de do majeur', () => {
    const chroma = chromaDepuisSignal(sinusoide([261.63, 329.63, 392.0], 30), FE);
    const classes = [...chroma.keys()].sort((a, b) => chroma[b] - chroma[a]).slice(0, 3).sort();
    expect(classes).toEqual([0, 4, 7]);
  });

  it('rend un chroma nul sur un signal trop court pour une seule fenêtre', () => {
    const chroma = chromaDepuisSignal(new Float32Array(100), FE);
    expect(chroma.every((v) => v === 0)).toBe(true);
  });

  it('refuse d’analyser un extrait de quelques secondes', () => {
    // Une note vocale n'a pas de tonalité, et en proposer une avec assurance
    // est pire que de se taire.
    const chroma = chromaDepuisSignal(sinusoide([440], 7), FE);
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

describe('sectionsTonales', () => {
  const profil = (demiTons: number, mode: 'majeur' | 'mineur' = 'majeur') =>
    Float64Array.from(
      PROFILS[mode].map((_, i) => PROFILS[mode][(i - demiTons + 12) % 12]),
    );

  it('rend une seule section quand la tonalité ne bouge pas', () => {
    const sections = sectionsTonales([profil(0), profil(0), profil(0), profil(0)], 30);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ id: 'Do:majeur', debut: 0, fin: 120 });
  });

  it('sépare deux sections quand le morceau module', () => {
    const sections = sectionsTonales(
      [profil(4), profil(4), profil(4), profil(6), profil(6), profil(6)],
      30,
    );
    expect(sections.map((s) => s.id)).toEqual(['Mi:majeur', 'Fa#:majeur']);
    expect(sections[0]).toMatchObject({ debut: 0, fin: 90 });
    expect(sections[1]).toMatchObject({ debut: 90, fin: 180 });
  });

  it('absorbe une tranche isolée : une modulation dure, un accident non', () => {
    const sections = sectionsTonales(
      [profil(0), profil(0), profil(7), profil(0), profil(0)],
      30,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('Do:majeur');
  });

  it('fait hériter une tranche muette de la précédente', () => {
    const sections = sectionsTonales(
      [profil(0), profil(0), new Float64Array(12), profil(0)],
      30,
    );
    expect(sections).toHaveLength(1);
  });

  it('rend un tableau vide sans tranche', () => {
    expect(sectionsTonales([], 30)).toEqual([]);
  });

  it('ne rend rien quand aucune tranche ne se laisse trancher', () => {
    expect(sectionsTonales([new Float64Array(12), new Float64Array(12)], 30)).toEqual([]);
  });
});

describe('sectionsTonales — absorption des dominantes', () => {
  const profil = (demiTons: number, mode: 'majeur' | 'mineur' = 'majeur') =>
    Float64Array.from(
      PROFILS[mode].map((_, i) => PROFILS[mode][(i - demiTons + 12) % 12]),
    );
  const ids = (tranches: Float64Array[]) => sectionsTonales(tranches, 30).map((s) => s.id);

  // Chaque cas reprend une chronologie réellement produite le 5 septembre, avec
  // la tonalité relevée à l'oreille par le chef de groupe.

  it('HOSANNA reprise : Ré est la dominante de Sol', () => {
    // Détecté : Ré | Sol. Réel : Sol.
    expect(ids([profil(2), profil(7), profil(7)])).toEqual(['Sol:majeur']);
  });

  it('ABBA : La est la dominante de Ré', () => {
    // Détecté : Ré | La | Ré. Réel : Ré.
    expect(ids([profil(2), profil(9), profil(9), profil(2), profil(2)])).toEqual(['Ré:majeur']);
  });

  it('HOSANNA.wma : deux dominantes encadrent une vraie modulation', () => {
    // Détecté : Mi | Si | Do# | Fa#. Réel : Mi puis Fa#.
    expect(
      ids([profil(4), profil(11), profil(11), profil(1), profil(1), profil(6), profil(6)]),
    ).toEqual(['Mi:majeur', 'Fa#:majeur']);
  });

  it('préserve une modulation d’un ton, qui n’est pas une dominante', () => {
    // Mi vers Fa# : deux demi-tons, le motif réel du répertoire.
    expect(ids([profil(4), profil(4), profil(6), profil(6)])).toEqual([
      'Mi:majeur',
      'Fa#:majeur',
    ]);
  });

  it('préserve une modulation d’un demi-ton', () => {
    expect(ids([profil(0), profil(0), profil(1), profil(1)])).toEqual([
      'Do:majeur',
      'Do#:majeur',
    ]);
  });

  it('absorbe une dominante de mode différent quand elle est encadrée', () => {
    // DEBOUT : Mi | Si | Si mineur | Mi. Réel : Mi.
    expect(
      ids([profil(4), profil(11), profil(11), profil(11, 'mineur'), profil(4), profil(4)]),
    ).toEqual(['Mi:majeur']);
  });
});
