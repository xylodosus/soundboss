import { describe, it, expect } from 'vitest';
import { argumentsNormalisation, parseLoudnormJson, shouldNormalize } from '../src/loudness.ts';

// Sortie réelle de `ffmpeg -af loudnorm=print_format=json -f null -` :
// le JSON est précédé de lignes de log, d'où la nécessité de l'extraire.
const STDERR_REEL = `
[Parsed_loudnorm_0 @ 0x7f8]
{
	"input_i" : "-27.61",
	"input_tp" : "-9.08",
	"input_lra" : "8.30",
	"input_thresh" : "-38.12",
	"output_i" : "-16.02",
	"output_tp" : "-1.50",
	"output_lra" : "7.20",
	"output_thresh" : "-26.55",
	"normalization_type" : "dynamic",
	"target_offset" : "0.02"
}
`;

describe('parseLoudnormJson', () => {
  it('extrait les mesures du JSON noyé dans les logs ffmpeg', () => {
    const m = parseLoudnormJson(STDERR_REEL);
    expect(m).not.toBeNull();
    expect(m!.inputI).toBeCloseTo(-27.61);
    expect(m!.inputTp).toBeCloseTo(-9.08);
    expect(m!.inputLra).toBeCloseTo(8.3);
    expect(m!.inputThresh).toBeCloseTo(-38.12);
    expect(m!.targetOffset).toBeCloseTo(0.02);
  });

  it('renvoie null si aucun JSON exploitable', () => {
    expect(parseLoudnormJson('rien à voir ici')).toBeNull();
    expect(parseLoudnormJson('')).toBeNull();
  });

  it('renvoie null sur un silence total (input_i = -inf)', () => {
    const silence = STDERR_REEL.replace('"-27.61"', '"-inf"');
    expect(parseLoudnormJson(silence)).toBeNull();
  });
});

describe('shouldNormalize', () => {
  it('normalise un fichier nettement trop faible', () => {
    expect(shouldNormalize(-27.6, -16, 2)).toBe(true);
  });

  it('normalise un fichier nettement trop fort', () => {
    expect(shouldNormalize(-8, -16, 2)).toBe(true);
  });

  it("ne touche pas un fichier déjà dans la tolérance (évite un réencodage inutile)", () => {
    expect(shouldNormalize(-16, -16, 2)).toBe(false);
    expect(shouldNormalize(-17.5, -16, 2)).toBe(false);
    expect(shouldNormalize(-14.5, -16, 2)).toBe(false);
  });

  it('traite la limite exacte de tolérance comme acceptable', () => {
    expect(shouldNormalize(-18, -16, 2)).toBe(false);
  });

  it('refuse une mesure non exploitable', () => {
    expect(shouldNormalize(null, -16, 2)).toBe(false);
    expect(shouldNormalize(Number.NEGATIVE_INFINITY, -16, 2)).toBe(false);
  });
});

describe('argumentsNormalisation', () => {
  const base = {
    inputPath: '/tmp/src.mp3',
    outputPath: '/tmp/out.m4a',
    filtre: 'loudnorm=I=-16',
    sampleRate: 44100,
    bitrate: '64k',
  };

  it('applique le débit demandé', () => {
    const args = argumentsNormalisation(base);
    const i = args.indexOf('-b:a');
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe('64k');
  });

  it('respecte un débit différent', () => {
    const args = argumentsNormalisation({ ...base, bitrate: '96k' });
    expect(args[args.indexOf('-b:a') + 1]).toBe('96k');
  });

  it("ne prend que le premier flux audio — une pochette ferait échouer l'encodage", () => {
    const args = argumentsNormalisation(base);
    const i = args.indexOf('-map');
    expect(args[i + 1]).toBe('0:a:0');
  });

  it("force le taux d'échantillonnage d'origine quand il est connu", () => {
    const args = argumentsNormalisation(base);
    expect(args[args.indexOf('-ar') + 1]).toBe('44100');
  });

  it("omet -ar quand le taux est inconnu plutôt que d'en inventer un", () => {
    const args = argumentsNormalisation({ ...base, sampleRate: null });
    expect(args).not.toContain('-ar');
  });

  it('place moov en tête pour la lecture progressive', () => {
    const args = argumentsNormalisation(base);
    expect(args[args.indexOf('-movflags') + 1]).toBe('+faststart');
  });
});
