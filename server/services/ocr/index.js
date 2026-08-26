/**
 * OCR service facade.
 *
 * Provider selection via env: OCR_PROVIDER = tesseract (default) | demo | remote
 * Swap in Google Vision / Azure / AWS Textract by adding a provider file here and
 * registering it below - the rest of the platform is provider-agnostic.
 */
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { preprocessForOcr } = require('./preprocess');
const { extractFieldsFromLines } = require('./fieldExtractor');
const tesseractProvider = require('./providers/tesseract.provider');
const demoProvider = require('./providers/demo.provider');
const remoteProvider = require('./providers/remote.provider');

const PROVIDERS = {
  tesseract: tesseractProvider,
  demo: demoProvider,
  remote: remoteProvider,
};

function getProvider(name) {
  const p = PROVIDERS[name || config.ocr.provider];
  if (!p) throw new Error(`Unknown OCR provider: ${name}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  return p;
}

/**
 * Process one image buffer -> { ocr, fields }
 */
async function processImageBuffer(buffer, options = {}) {
  const { imageUrl, imageIndex, variant, onProgress } = options;
  const startedAt = Date.now();

  const { buffer: preparedBuffer, meta: preMeta, preprocessed } =
    options.skipPreprocess
      ? { buffer, meta: {}, preprocessed: false }
      : await preprocessForOcr(buffer);

  const providerName = options.provider || config.ocr.provider;
  let result;
  try {
    result = await getProvider(providerName).recognize({
      buffer: preparedBuffer,
      variant,
      filename: options.filename,
      onProgress,
    });
  } catch (e) {
    logger.error(`OCR provider '${providerName}' failed:`, e.message);
    // Graceful degradation: fall back to demo simulation so demos never break,
    // clearly flagged as simulated.
    if (providerName !== 'demo') {
      logger.warn('Falling back to demo-simulation OCR output (flagged simulated=true).');
      result = await demoProvider.recognize({ variant });
      result.fallbackFrom = providerName;
    } else {
      throw e;
    }
  }

  const imageMeta = {
    ...preMeta,
    ...(result.imageMeta || {}),
    width: result.imageMeta?.width || preMeta.width,
    height: result.imageMeta?.height || preMeta.height,
  };

  const fields = extractFieldsFromLines(result.lines, { imageUrl, imageIndex });

  const meanConfidence =
    result.lines.length > 0
      ? Math.round(
          (result.lines.reduce((s, l) => s + (l.confidence || 0), 0) / result.lines.length) * 1000
        ) / 1000
      : 0;

  return {
    ocr: {
      imageUrl,
      imageIndex,
      provider: result.provider,
      simulated: Boolean(result.simulated),
      rawText: result.rawText,
      lines: result.lines,
      meanConfidence,
      imageMeta,
      processingMs: Date.now() - startedAt,
    },
    fields,
  };
}

/** Resolve a stored image URL/path into a Buffer */
async function loadImageBuffer(url) {
  if (!url) throw new Error('Image URL required');
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  // local /uploads path
  const path = require('path');
  const fs = require('fs');
  const localPath = path.join(__dirname, '..', '..', url.replace(/^\//, ''));
  return fs.promises.readFile(localPath);
}

module.exports = {
  processImageBuffer,
  loadImageBuffer,
  getProvider,
  PROVIDERS,
};
