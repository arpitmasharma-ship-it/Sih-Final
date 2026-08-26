const OcrResult = require('../models/OcrResult');
const ApiError = require('../utils/ApiError');
const { processImageBuffer } = require('./ocr');
const { uploadImage } = require('./cloudinary/storage.service');
const { runComplianceCheck } = require('./compliance/ruleService');

/**
 * Full scan pipeline for one uploaded image:
 * upload -> preprocess -> OCR -> field extraction -> persist OcrResult
 */
async function processOneImage(file, { imageIndex, label, provider, variant }) {
  const stored = await uploadImage(file.buffer, {
    folder: 'lmcc/scans',
    filename: file.originalname || 'scan.png',
  });

  const { ocr, fields } = await processImageBuffer(file.buffer, {
    imageUrl: stored.url,
    imageIndex,
    filename: file.originalname,
    provider,
    variant,
  });

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
      linesCount: ocr.lines.length,
      meanConfidence: ocr.meanConfidence,
      imageMeta: ocr.imageMeta,
      processingMs: ocr.processingMs,
      lines: ocr.lines,
    },
    fields,
  };
}

/** Process multiple uploaded files */
async function processImages(files, options = {}) {
  if (!files || !files.length) throw ApiError.badRequest('At least one image is required');
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const labels = ['FRONT_PACKAGE', 'BACK_PACKAGE', 'SIDE_IMAGE', 'LABEL_CLOSEUP', 'BARCODE_QR'];
    results.push(
      await processOneImage(files[i], {
        imageIndex: i,
        label: options.labels?.[i] || labels[i] || 'FRONT_PACKAGE',
        provider: options.provider,
        variant: options.variant,
      })
    );
  }
  return mergeMultiImageOcr(results);
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
