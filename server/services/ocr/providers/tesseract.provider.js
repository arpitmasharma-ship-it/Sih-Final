/**
 * Tesseract.js provider (local, no API key).
 * Uses a bundled `eng.traineddata` when present so the first call does not need
 * to download the model from the tesseract.js CDN — this is important on hosts
 * (like Render free tier) where that runtime download can be slow or blocked.
 */
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const logger = require('../../../utils/logger');

const MODEL_DIR = path.join(__dirname, '..', '..', '..');
const MODEL_PATH = path.join(MODEL_DIR, 'eng.traineddata');

let workerPromise = null;

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const options = {
          logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
          },
        };
        // Prefer the bundled model to avoid a first-run CDN download.
        if (fs.existsSync(MODEL_PATH)) {
          options.langPath = MODEL_DIR;
        }
        const worker = await createWorker('eng', 1, options);
        return worker;
      } catch (err) {
        workerPromise = null;
        throw err;
      }
    })();
  }
  return workerPromise;
}

function collectLines(data) {
  // tesseract.js v5 exposes nested blocks -> paragraphs -> lines -> words
  const lines = [];
  try {
    if (Array.isArray(data.blocks)) {
      data.blocks.forEach((block) =>
        (block.paragraphs || []).forEach((para) =>
          (para.lines || []).forEach((line) => {
            if (!line.text || !line.text.trim()) return;
            const words = line.words || [];
            const avgConf =
              words.length > 0
                ? words.reduce((s, w) => s + (w.confidence ?? 0), 0) / words.length / 100
                : (line.confidence ?? 80) / 100;
            lines.push({
              text: line.text.replace(/\n+$/, ''),
              confidence: Math.round(avgConf * 1000) / 1000,
              bbox: {
                x: Math.round(line.bbox?.x0 ?? 0),
                y: Math.round(line.bbox?.y0 ?? 0),
                width: Math.round((line.bbox?.x1 ?? 0) - (line.bbox?.x0 ?? 0)),
                height: Math.round((line.bbox?.y1 ?? 0) - (line.bbox?.y0 ?? 0)),
              },
            });
          })
        )
      );
    }
  } catch (e) {
    logger.warn('Failed to parse tesseract blocks:', e.message);
  }
  if (!lines.length && data.text) {
    // fallback: whole page as one line (bbox unknown)
    data.text.split('\n').forEach((t) => {
      if (t.trim()) lines.push({ text: t.trim(), confidence: 0.7, bbox: null });
    });
  }
  return lines;
}

async function recognize({ buffer, image, onProgress } = {}) {
  const worker = await getWorker(onProgress);
  // Use the preprocessed JPEG buffer. (Passing the raw Jimp bitmap as an
  // ImageLike is not reliably byte-compatible with tesseract.js and can throw
  // "truncated file / Error attempting to read image", so we keep it simple and
  // feed the compact JPEG produced by preprocessing.)
  const { data } = await worker.recognize(buffer, {}, { text: true, blocks: true });
  return {
    provider: 'tesseract',
    simulated: false,
    rawText: data.text || '',
    lines: collectLines(data),
    imageMeta: { preprocessed: true },
  };
}

module.exports = { recognize };
