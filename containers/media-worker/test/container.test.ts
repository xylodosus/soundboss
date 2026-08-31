import { describe, it, expect } from 'vitest';
import { detectContainer, needsRemux, withExtension } from '../src/container.ts';

/** Construit un en-tête de 12 octets à partir d'octets de tête. */
function header(...bytes: number[]): Buffer {
  const b = Buffer.alloc(12);
  bytes.forEach((v, i) => (b[i] = v));
  return b;
}
const ascii = (s: string, offset = 0) => {
  const b = Buffer.alloc(12);
  b.write(s, offset, 'ascii');
  return b;
};

describe('detectContainer', () => {
  it('reconnaît un ADTS AAC MPEG-4 (0xFFF1)', () => {
    expect(detectContainer(header(0xff, 0xf1, 0x50, 0x80))).toBe('adts-aac');
  });

  it('reconnaît un ADTS AAC MPEG-2 (0xFFF9)', () => {
    expect(detectContainer(header(0xff, 0xf9, 0x50, 0x80))).toBe('adts-aac');
  });

  it('reconnaît un MP4/M4A (ftyp en offset 4)', () => {
    expect(detectContainer(ascii('ftyp', 4))).toBe('mp4');
  });

  it('voit à travers un tag ID3 : suivi de MP3 → mp3', () => {
    const b = Buffer.alloc(32);
    b.write('ID3', 0, 'ascii');
    b[9] = 10; // tag de 10 octets → sync attendu en offset 20
    b[20] = 0xff;
    b[21] = 0xfb;
    expect(detectContainer(b)).toBe('mp3');
  });

  it("voit à travers un tag ID3 : suivi d'ADTS → adts-aac (le cas qui casse en silence)", () => {
    const b = Buffer.alloc(32);
    b.write('ID3', 0, 'ascii');
    b[9] = 10;
    b[20] = 0xff;
    b[21] = 0xf1;
    expect(detectContainer(b)).toBe('adts-aac');
  });

  it("avoue son ignorance si l'en-tête ne dépasse pas le tag ID3", () => {
    const b = Buffer.alloc(12);
    b.write('ID3', 0, 'ascii');
    b[9] = 100; // tag bien plus grand que le buffer
    expect(detectContainer(b)).toBe('inconnu');
  });

  it('reconnaît les variantes de sync MP3, avec et sans CRC', () => {
    expect(detectContainer(header(0xff, 0xfb))).toBe('mp3'); // MPEG-1
    expect(detectContainer(header(0xff, 0xfa))).toBe('mp3'); // MPEG-1 + CRC
    expect(detectContainer(header(0xff, 0xf3))).toBe('mp3'); // MPEG-2
    expect(detectContainer(header(0xff, 0xf2))).toBe('mp3'); // MPEG-2 + CRC
    expect(detectContainer(header(0xff, 0xe3))).toBe('mp3'); // MPEG-2.5
  });

  it('reconnaît les variantes ADTS, avec et sans CRC', () => {
    expect(detectContainer(header(0xff, 0xf1))).toBe('adts-aac'); // MPEG-4
    expect(detectContainer(header(0xff, 0xf9))).toBe('adts-aac'); // MPEG-2
    expect(detectContainer(header(0xff, 0xf0))).toBe('adts-aac'); // MPEG-4 + CRC
    expect(detectContainer(header(0xff, 0xf8))).toBe('adts-aac'); // MPEG-2 + CRC
  });

  it('reconnaît ogg et flac', () => {
    expect(detectContainer(ascii('OggS'))).toBe('ogg');
    expect(detectContainer(ascii('fLaC'))).toBe('flac');
  });

  it('exige le sous-type WAVE pour un RIFF (RIFF couvre aussi AVI et WEBP)', () => {
    const wav = Buffer.alloc(12);
    wav.write('RIFF', 0, 'ascii');
    wav.write('WAVE', 8, 'ascii');
    expect(detectContainer(wav)).toBe('wav');

    const avi = Buffer.alloc(12);
    avi.write('RIFF', 0, 'ascii');
    avi.write('AVI ', 8, 'ascii');
    expect(detectContainer(avi)).toBe('inconnu');
  });

  it('ne classe pas ftyp sur un en-tête tronqué', () => {
    expect(detectContainer(Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79]))).toBe('inconnu');
  });

  it('renvoie inconnu sur un en-tête non reconnu ou trop court', () => {
    expect(detectContainer(header(0x00, 0x01, 0x02, 0x03))).toBe('inconnu');
    expect(detectContainer(Buffer.alloc(2))).toBe('inconnu');
  });

  it("ne confond pas ADTS et MP3 : 0xFFFB est du MP3, pas de l'ADTS", () => {
    expect(detectContainer(header(0xff, 0xfb))).not.toBe('adts-aac');
  });
});

describe('needsRemux', () => {
  it('exige un remux pour un ADTS AAC audio', () => {
    expect(needsRemux('adts-aac', 'audio')).toBe(true);
  });

  it("n'exige rien pour mp4, mp3 et les autres conteneurs", () => {
    expect(needsRemux('mp4', 'audio')).toBe(false);
    expect(needsRemux('mp3', 'audio')).toBe(false);
    expect(needsRemux('inconnu', 'audio')).toBe(false);
  });

  it('ne remuxe pas la vidéo (hors périmètre)', () => {
    expect(needsRemux('adts-aac', 'video')).toBe(false);
  });
});

describe('withExtension', () => {
  it("remplace l'extension en gardant le dossier", () => {
    expect(withExtension('audio/global/sermon_123.aac', 'm4a')).toBe(
      'audio/global/sermon_123.m4a',
    );
  });

  it('gère un nom sans extension', () => {
    expect(withExtension('audio/global/sermon', 'm4a')).toBe('audio/global/sermon.m4a');
  });

  it('gère un point dans le dossier sans casser le chemin', () => {
    expect(withExtension('audio/v1.2/sermon.aac', 'm4a')).toBe('audio/v1.2/sermon.m4a');
  });

  it('sert aussi à dériver le fichier de pics', () => {
    expect(withExtension('audio/global/sermon.m4a', 'peaks.json')).toBe(
      'audio/global/sermon.peaks.json',
    );
  });

  it("renvoie le chemin INCHANGÉ si l'extension est déjà la bonne — l'appelant doit comparer avant d'écrire", () => {
    expect(withExtension('audio/global/x.m4a', 'm4a')).toBe('audio/global/x.m4a');
  });
});
