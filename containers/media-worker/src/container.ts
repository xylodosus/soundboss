/**
 * Reconnaissance du conteneur média à partir des octets d'en-tête.
 *
 * L'extension ne fait pas foi : sur les 6 audios de prédication en base,
 * 4 portaient une extension .mp3 ou .aac alors que leur contenu était de
 * l'ADTS AAC. On lit donc toujours les octets.
 */
export type MediaContainer =
  | 'adts-aac'
  | 'mp3'
  | 'mp4'
  | 'ogg'
  | 'wav'
  | 'flac'
  | 'asf'
  | 'inconnu';

function ascii(b: Buffer, from: number, len: number): string {
  return b.subarray(from, from + len).toString('ascii');
}

/**
 * Classe un mot de synchronisation MPEG à l'offset donné.
 *
 * On raisonne par masques de bits plutôt que par énumération : les bits de
 * layer distinguent structurellement l'ADTS (layer 00) du MP3 (layer 01, soit
 * Layer III), ce qui rend les deux familles mutuellement exclusives par
 * construction et couvre d'un coup les variantes avec CRC et MPEG-2/2.5.
 */
function detectSync(b: Buffer, offset: number): MediaContainer {
  if (offset + 2 > b.length) return 'inconnu';
  if (b[offset] !== 0xff) return 'inconnu';
  const h1 = b[offset + 1];
  if ((h1 & 0xe0) !== 0xe0) return 'inconnu';
  // ADTS : sync 0xFFF + layer 00 → couvre 0xF0/0xF1/0xF8/0xF9 (± CRC, MPEG-2/4)
  if ((h1 & 0xf6) === 0xf0) return 'adts-aac';
  // MP3 : Layer III → couvre 0xFB/0xFA/0xF3/0xF2/0xE3/0xE2 (± CRC, MPEG-1/2/2.5)
  if (((h1 >> 1) & 0x03) === 0x01) return 'mp3';
  return 'inconnu';
}

/** GUID d'en-tête ASF, le conteneur des .wma et .wmv. */
const GUID_ASF = Buffer.from([
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11,
  0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
]);

export function detectContainer(head: Buffer): MediaContainer {
  if (head.length < 4) return 'inconnu';

  // Signatures de conteneur, sans ambiguïté possible.
  if (head.length >= GUID_ASF.length && head.subarray(0, GUID_ASF.length).equals(GUID_ASF)) {
    return 'asf';
  }
  if (head.length >= 8 && ascii(head, 4, 4) === 'ftyp') return 'mp4';
  if (ascii(head, 0, 4) === 'OggS') return 'ogg';
  if (ascii(head, 0, 4) === 'fLaC') return 'flac';
  // RIFF est générique (WAVE, AVI, WEBP) : exiger le sous-type.
  if (ascii(head, 0, 4) === 'RIFF') {
    return head.length >= 12 && ascii(head, 8, 4) === 'WAVE' ? 'wav' : 'inconnu';
  }

  // ID3 n'est qu'un préfixe : il peut précéder du MP3 comme de l'ADTS. On saute
  // le tag et on redétecte derrière, sinon un ADTS taggé serait classé mp3 et
  // ne serait jamais remuxé — l'échec le plus coûteux, car silencieux.
  let offset = 0;
  if (ascii(head, 0, 3) === 'ID3') {
    if (head.length < 10) return 'inconnu';
    // Taille du tag : entier « synchsafe » sur 4 octets de 7 bits utiles.
    const size =
      ((head[6] & 0x7f) << 21) |
      ((head[7] & 0x7f) << 14) |
      ((head[8] & 0x7f) << 7) |
      (head[9] & 0x7f);
    const footer = (head[5] & 0x10) !== 0 ? 10 : 0;
    offset = 10 + size + footer;
    // En-tête trop court pour voir derrière le tag : on préfère l'aveu
    // d'ignorance à une classification fausse.
    if (offset + 2 > head.length) return 'inconnu';
  }

  return detectSync(head, offset);
}

/**
 * Un ADTS AAC brut n'a ni en-tête global ni table de positions : les lecteurs
 * natifs ne savent ni rapporter la position ni s'y déplacer. Le remuxer en MP4
 * corrige cela sans réencodage. Les autres conteneurs sont déjà navigables.
 */
export function needsRemux(container: MediaContainer, typeMedia: string): boolean {
  return typeMedia === 'audio' && container === 'adts-aac';
}

/**
 * Conteneurs que les lecteurs mobiles décodent sans réserve, sur les deux
 * plateformes. Tout le reste doit être réencodé.
 */
const LUS_PARTOUT: MediaContainer[] = ['mp3', 'mp4', 'wav'];

/**
 * Faut-il réencoder ce fichier pour qu'il soit lisible dans l'app ?
 *
 * Contrairement au remux, c'est un vrai réencodage : un WMA n'est pas de l'AAC
 * déguisé, on ne peut pas recopier ses trames. Cas réel : un `HOSANNA.wma`
 * déposé le 2 septembre a été analysé sans encombre — ffmpeg lit l'ASF — puis
 * s'est révélé injouable côté client, faute d'avoir jamais été converti.
 *
 * L'ADTS est exclu : son remux, sans perte, fait déjà le travail.
 * `ogg` et `flac` sont convertis parce qu'aucun des deux n'est décodé de façon
 * fiable sur les deux plateformes à la fois.
 */
export function needsTranscode(container: MediaContainer, typeMedia: string): boolean {
  if (typeMedia !== 'audio') return false;
  if (container === 'adts-aac') return false;
  return !LUS_PARTOUT.includes(container);
}

/**
 * Remplace l'extension d'un chemin ; sert au `.m4a` et au `.peaks.json`.
 *
 * ⚠️ Renvoie le chemin INCHANGÉ si l'extension est déjà la bonne. L'appelant
 * doit donc comparer avant d'écrire : sur un fichier déjà en .m4a, réutiliser
 * ce chemin écraserait l'original dans R2 — irréversible, et le CDN sert les
 * médias en `immutable`.
 */
export function withExtension(filePath: string, extension: string): string {
  const slash = filePath.lastIndexOf('/');
  const dir = slash === -1 ? '' : filePath.slice(0, slash + 1);
  const name = filePath.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${dir}${base}.${extension}`;
}
