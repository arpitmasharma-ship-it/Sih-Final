const Jimp = require('jimp');
const logger = require('../../utils/logger');

/**
 * Image preprocessing pipeline for better OCR accuracy.
 * Steps: resize (cap width) -> greyscale -> normalize (contrast stretch) ->
 *        light contrast boost -> sharpen convolution.
 * Pure-JS via Jimp so it works on Windows without native builds.
 */
async function preprocessForOcr(buffer, { maxWidth = 1600 } = {}) {
  try {
    const image = await Jimp.read(buffer);
    const meta = {
      originalWidth: image.bitmap.width,
      originalHeight: image.bitmap.height,
    };
    if (image.bitmap.width > maxWidth) {
      image.resize(maxWidth, Jimp.AUTO);
    }
    image
      .greyscale()
      .normalize() // contrast stretch - handles uneven lighting
      .contrast(0.12)
      .convolute([
        [0, -0.3, 0],
        [-0.3, 2.2, -0.3],
        [0, -0.3, 0],
      ]); // sharpen

    // Simple blur estimate: variance of Laplacian-ish via pixel stddev (lower = blurrier)
    const stats = image.statistics ? null : null; // keep jimp 0.22 compat
    let sum = 0;
    let sumSq = 0;
    const n = Math.min(image.bitmap.data.length / 4, 200000);
    const step = Math.floor((image.bitmap.data.length / 4) / n);
    for (let i = 0; i < n; i += step) {
      const v = image.bitmap.data[i * 4];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / n;
    const stdDev = Math.sqrt(sumSq / n - mean * mean);
    meta.blurScore = Math.round(stdDev); // heuristic 0-80ish; low => blurry/flat
    meta.contrastScore = Math.round(stdDev);

    const outBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return { buffer: outBuffer, meta, preprocessed: true };
  } catch (e) {
    logger.warn('Preprocessing failed, using raw image:', e.message);
    return { buffer, meta: { preprocessed: false }, preprocessed: false };
  }
}

module.exports = { preprocessForOcr };
