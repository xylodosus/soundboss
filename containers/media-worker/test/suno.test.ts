import { describe, expect, it } from 'vitest';
import {
  MODELES,
  estCallbackFinal,
  parseTacheId,
  pistesDuCallback,
  validerDemande,
} from '../src/suno.ts';

describe('parseTacheId', () => {
  it('lit l’identifiant de tâche', () => {
    expect(parseTacheId({ code: 200, msg: 'success', data: { taskId: 't1' } })).toBe('t1');
  });

  it('refuse une réponse en erreur plutôt que d’attendre un rappel qui ne viendra pas', () => {
    expect(() => parseTacheId({ code: 402, msg: 'Insufficient Credits' })).toThrow(
      /402|crédit/i,
    );
  });

  it('refuse une réponse sans identifiant', () => {
    expect(() => parseTacheId({ code: 200, data: {} })).toThrow();
    expect(() => parseTacheId(null)).toThrow();
  });
});

describe('estCallbackFinal', () => {
  it('ne retient que le rappel complet', () => {
    // « text » annonce les paroles, « first » la première piste : agir dessus
    // enregistrerait un résultat partiel comme définitif.
    expect(estCallbackFinal({ callbackType: 'complete' })).toBe(true);
    expect(estCallbackFinal({ callbackType: 'first' })).toBe(false);
    expect(estCallbackFinal({ callbackType: 'text' })).toBe(false);
    expect(estCallbackFinal({})).toBe(false);
  });
});

describe('pistesDuCallback', () => {
  it('lit les pistes générées', () => {
    const pistes = pistesDuCallback({
      data: [
        { id: 'a', audio_url: 'https://x/a.mp3', duration: 120, title: 'Titre' },
        { id: 'b', audio_url: 'https://x/b.mp3', duration: 118, title: 'Autre' },
      ],
    });
    expect(pistes).toHaveLength(2);
    expect(pistes[0]).toMatchObject({ id: 'a', url: 'https://x/a.mp3', duree: 120 });
  });

  it('écarte une piste sans audio : il n’y aurait rien à rapatrier', () => {
    expect(pistesDuCallback({ data: [{ id: 'a' }] })).toEqual([]);
  });

  it('accepte les données enveloppées dans data.data', () => {
    // La forme observée varie selon les rappels ; les deux sont acceptées.
    const pistes = pistesDuCallback({ data: { data: [{ id: 'a', audio_url: 'https://x/a.mp3' }] } });
    expect(pistes).toHaveLength(1);
  });

  it('rend une liste vide sans données', () => {
    expect(pistesDuCallback({})).toEqual([]);
    expect(pistesDuCallback(null)).toEqual([]);
  });
});

describe('validerDemande', () => {
  it('accepte une demande simple', () => {
    const d = validerDemande({ prompt: 'Un gospel joyeux en si bémol' });
    expect(d.customMode).toBe(false);
    expect(d.instrumental).toBe(false);
    expect(MODELES).toContain(d.model);
  });

  it('exige un style et un titre en mode personnalisé', () => {
    expect(() => validerDemande({ prompt: 'x', customMode: true })).toThrow(/style|titre/i);
    const d = validerDemande({ prompt: 'x', customMode: true, style: 'gospel', title: 'Hosanna' });
    expect(d.style).toBe('gospel');
  });

  it('refuse une invite vide, sauf en instrumental personnalisé', () => {
    expect(() => validerDemande({ prompt: '   ' })).toThrow();
    const d = validerDemande({
      prompt: '',
      customMode: true,
      instrumental: true,
      style: 'gospel',
      title: 'Intro',
    });
    expect(d.instrumental).toBe(true);
  });

  it('refuse un modèle inconnu plutôt que de laisser l’API le rejeter', () => {
    expect(() => validerDemande({ prompt: 'x', model: 'V9' })).toThrow(/mod/i);
  });
});
