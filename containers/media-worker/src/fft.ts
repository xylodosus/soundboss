/**
 * Transformée de Fourier rapide, radix-2, en place.
 *
 * Écrite ici plutôt qu'empruntée : le besoin tient en quarante lignes, et une
 * dépendance de plus dans l'image du conteneur se paie à chaque déploiement.
 */

/** Transforme en place. `re` et `im` doivent avoir la même longueur, puissance de deux. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (im.length !== n) throw new Error('parties réelle et imaginaire de tailles différentes');
  if (n === 0 || (n & (n - 1)) !== 0) throw new Error(`taille ${n} : puissance de deux attendue`);

  // Permutation par inversion de bits.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let longueur = 2; longueur <= n; longueur <<= 1) {
    const angle = (-2 * Math.PI) / longueur;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += longueur) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < longueur / 2; j++) {
        const aRe = re[i + j];
        const aIm = im[i + j];
        const bRe = re[i + j + longueur / 2] * curRe - im[i + j + longueur / 2] * curIm;
        const bIm = re[i + j + longueur / 2] * curIm + im[i + j + longueur / 2] * curRe;
        re[i + j] = aRe + bRe;
        im[i + j] = aIm + bIm;
        re[i + j + longueur / 2] = aRe - bRe;
        im[i + j + longueur / 2] = aIm - bIm;
        const suivantRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = suivantRe;
      }
    }
  }
}

/** Module de chaque composante. */
export function magnitudes(re: Float64Array, im: Float64Array): Float64Array {
  const out = new Float64Array(re.length);
  for (let i = 0; i < re.length; i++) out[i] = Math.hypot(re[i], im[i]);
  return out;
}
