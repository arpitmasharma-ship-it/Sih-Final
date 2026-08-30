const Jimp = require('jimp');
const logger = require('../../utils/logger');

const DEFAULT_MAX_WIDTH = 1400;

/**
 * Image preprocessing pipeline for better OCR accuracy AND faster uploads.
 * Steps: downscale (cap width) -> greyscale -> normalize (contrast stretch) ->
 *        light contrast boost -> sharpen convolution. Pure-JS via Jimp.
 *
 * Returns both the Jimp instance (so OCR can consume the raw bitmap directly,
 * skipping a JPEG encode/decode round-trip) and a small, compressed JPEG buffer
 * ideal for storage/display.
 */
async function preprocessForOcr(buffer, { maxWidth = DEFAULT_MAX_WIDTH } = {}) {
  try {
    const image = await Jimp.read(buffer);
    const meta = {
      originalWidth: image.bitmap.width,
      originalHeight: image.bitmap.height,
    };

    if (image.bitmap.width > maxWidth) {
      image.resize(maxWidth, Jimp.AUTO);
    }
    image.greyscale().normalize().contrast(0.1);

    // Fast heuristic blur calculation (sampling subset for speed)
    const len = image.bitmap.data.length / 4;
    const sampleSize = Math.min(len, 20000);
    const step = Math.max(1, Math.floor(len / sampleSize));
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let i = 0; i < len; i += step) {
      const v = image.bitmap.data[i * 4];
      sum += v;
      sumSq += v * v;
      count++;
    }
    const mean = sum / count;
    const stdDev = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
    meta.blurScore = Math.round(stdDev);
    meta.contrastScore = Math.round(stdDev);
    meta.width = image.bitmap.width;
    meta.height = image.bitmap.height;

    // Compact JPEG for upload/display (much smaller than the raw original).
    const displayBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    return { image, buffer: displayBuffer, meta, preprocessed: true };
  } catch (e) {
    logger.warn('Preprocessing failed, using raw image:', e.message);
    return { image: null, buffer, meta: { preprocessed: false }, preprocessed: false };
  }
}

module.exports = { preprocessForOcr, DEFAULT_MAX_WIDTH };
