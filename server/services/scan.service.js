const OcrResult = require('../models/OcrResult');
const ApiError = require('../utils/ApiError');
const { processImageBuffer } = require('./ocr');
const { preprocessForOcr } = require('./ocr/preprocess');
const { uploadImage } = require('./cloudinary/storage.service');
const { runComplianceCheck } = require('./compliance/ruleService');

/**
 * Full scan pipeline for one uploaded image:
 * upload -> preprocess -> OCR -> field extraction -> persist OcrResult
 */
async function processOneImage(file, { imageIndex, label, provider, variant }) {
  // Preprocess once, up front, so the same compact image is used for BOTH the
  // upload (fast, small payload) and OCR (avoids a JPEG encode/decode round-trip).
  const prepared = await preprocessForOcr(file.buffer);

  // Execute upload (network) and OCR (CPU) concurrently against the prepared image.
  // A storage failure must NOT sink the whole OCR job: fall back to an inline
  // data URL of the compact image so the evidence still displays and OCR survives.
  const [stored, ocrData] = await Promise.all([
    uploadImage(prepared.buffer, {
      folder: 'lmcc/scans',
      filename: file.originalname || 'scan.jpg',
    }).catch((err) => ({
      url: `data:image/jpeg;base64,${prepared.buffer.toString('base64')}`,
      publicId: null,
      provider: 'inline',
      storageError: err?.message,
    })),
    processImageBuffer(file.buffer, {
      imageIndex,
      filename: file.originalname,
      provider,
      variant,
      prepared,
    }),
  ]);

  const { ocr, fields } = ocrData;
  ocr.imageUrl = stored.url;

  // Persist OcrResult document
  const ocrDoc = await OcrResult.create({
    ...ocr,
    imageUrl: stored.url,
    imageIndex,
    fields: fields.map((f) => ({ ...f })),
  });

  return {
    image: { ...stored, label: label || 'FRONT_PACKAGE' },
    ocrResultId: ocrDoc._id,
    ocr: {
      provider: ocr.provider,
      simulated: ocr.simulated,
      rawText: ocr.rawText,
      linesCount: ocr.lines?.length || 0,
      meanConfidence: ocr.meanConfidence,
      imageMeta: ocr.imageMeta,
      processingMs: ocr.processingMs,
      lines: ocr.lines,
    },
    fields,
  };
}

/**
 * Process multiple uploaded files. Sequential (not Promise.all) to keep peak
 * memory bounded on small hosts (Render free tier). A single bad image must not
 * sink the whole job: per-image failures are recorded as degraded entries and
 * the remaining images still complete. Only when EVERY image fails do we
 * reject, with one combined, descriptive error.
 */
async function processImages(files, options = {}) {
  if (!files || !files.length) throw ApiError.badRequest('At least one image is required');
  const labels = ['FRONT_PACKAGE', 'BACK_PACKAGE', 'SIDE_IMAGE', 'LABEL_CLOSEUP', 'BARCODE_QR'];

  const results = [];
  const failures = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = options.labels?.[i] || labels[i] || 'FRONT_PACKAGE';
    try {
      results.push(
        await processOneImage(file, {
          imageIndex: i,
          label,
          provider: options.provider,
          variant: options.variant,
        })
      );
    } catch (err) {
      const reason = err?.message ? String(err.message) : err?.name || String(err || 'unknown');
      failures.push({ imageIndex: i, label, reason });
      results.push({
        image: { url: null, label, provider: 'error', error: reason },
        ocrResultId: null,
        ocr: {
          provider: 'error',
          simulated: false,
          rawText: '',
          linesCount: 0,
          meanConfidence: 0,
          imageMeta: {},
          processingMs: 0,
          lines: [],
        },
        fields: [],
        error: reason,
      });
    }
  }

  if (results.every((r) => r.ocr.provider === 'error')) {
    throw new Error(
      failures.map((f) => `image ${f.imageIndex + 1} (${f.label}): ${f.reason}`).join('; ') ||
        'OCR processing failed'
    );
  }

  const merged = mergeMultiImageOcr(results.filter((r) => r.ocr.provider !== 'error'));
  if (failures.length > 0) merged.partialFailures = failures;
  return merged;
}

/**
 * Merge fields across multiple images into one declaration map.
 * Highest-confidence non-rejected entry wins; NOT_DETECTED placeholders included.
 */
function mergeFieldsToDeclarations(perImageFields) {
  const declarations = {};
  perImageFields.flat().forEach((f) => {
    if (!f.field) return;
    const existing = declarations[f.field];
    if (
      !existing ||
      (existing.rejected && !f.rejected) ||
      ((f.confidence ?? 0) > (existing.confidence ?? 0) && !f.rejected)
    ) {
      declarations[f.field] = {
        value: f.value,
        confidence: f.confidence ?? 0.5,
        humanVerified: Boolean(f.humanVerified),
        rejected: Boolean(f.rejected),
        bbox: f.bbox,
        sourceImage: f.sourceImage,
        sourceImageIndex: f.sourceImageIndex,
      };
    }
  });
  return declarations;
}

function mergeMultiImageOcr(results) {
  const declarations = mergeFieldsToDeclarations(results.map((r) => r.fields));
  const meanConfidences = results.map((r) => r.ocr.meanConfidence).filter((n) => typeof n === 'number');
  const ocrMeta = {
    meanConfidence:
      meanConfidences.length > 0
        ? Math.round((meanConfidences.reduce((a, b) => a + b, 0) / meanConfidences.length) * 1000) / 1000
        : 0,
    blurScore: results[0]?.ocr.imageMeta?.blurScore,
    contrastScore: results[0]?.ocr.imageMeta?.contrastScore,
    rawText: results.map((r) => r.ocr.rawText).join('\n---\n'),
    primaryImageUrl: results[0]?.image?.url,
    simulated: results.some((r) => r.ocr.simulated),
    providers: [...new Set(results.map((r) => r.ocr.provider))],
  };
  return {
    images: results.map((r) => ({ ...r.image, ocrResultId: r.ocrResultId })),
    ocrPerImage: results.map((r) => ({
      image: r.image,
      ocrResultId: r.ocrResultId,
      ocr: { ...r.ocr, lines: undefined },
      fields: r.fields,
    })),
    declarations,
    ocrMeta,
  };
}

/**
 * Preview compliance without saving (POST /api/compliance/check)
 */
async function previewCompliance(declarations, ocrMeta) {
  return runComplianceCheck(sanitizeDeclarations(declarations), ocrMeta || {});
}

// Drop client-supplied rejected/placeholder values before evaluation
function sanitizeDeclarations(input = {}) {
  const out = {};
  Object.entries(input).forEach(([key, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    if (entry.rejected === true) return;
    const value = typeof entry.value === 'string' ? entry.value.trim() : '';
    if (!value || value.toUpperCase() === 'NOT DETECTED') return;
    out[key] = {
      value: String(value).slice(0, 500),
      confidence: Number.isFinite(entry.confidence) ? entry.confidence : 0.5,
      humanVerified: Boolean(entry.humanVerified),
      bbox: entry.bbox,
      sourceImage: entry.sourceImage,
      sourceImageIndex: entry.sourceImageIndex,
    };
  });
  // Human-verified entries are trusted at full confidence downstream
  Object.values(out).forEach((e) => {
    if (e.humanVerified) e.confidence = Math.max(e.confidence, 1);
  });
  return out;
}

module.exports = {
  processImages,
  processOneImage,
  mergeFieldsToDeclarations,
  mergeMultiImageOcr,
  previewCompliance,
  sanitizeDeclarations,
};
