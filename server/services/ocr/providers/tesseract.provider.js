/**
 * Tesseract.js provider (local, no API key). First call downloads the
 * `eng.traineddata` model (needs internet once) then runs offline.
 */
const { createWorker } = require('tesseract.js');
const logger = require('../../../utils/logger');

let workerPromise = null;

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
        },
      });
      return worker;
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

async function recognize({ buffer, onProgress } = {}) {
  const worker = await getWorker(onProgress);
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
