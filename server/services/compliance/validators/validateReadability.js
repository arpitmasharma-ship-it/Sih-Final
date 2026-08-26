/**
 * READABILITY check based on OCR quality signals:
 * mean OCR confidence + image quality metrics from preprocessing.
 * Low readability never produces a legal FAIL on its own - it raises a
 * WARNING with REQUIRES MANUAL VERIFICATION semantics because the system
 * cannot distinguish "unreadable label" from "bad photo".
 */
function validateReadability(declarations, rule, ctx = {}) {
  const ocrMeta = ctx.ocrMeta || {};
  const meanConf = ocrMeta.meanConfidence ?? 0;
  const blur = ocrMeta.blurScore;
  const contrast = ocrMeta.contrastScore;

  const lowQuality =
    (typeof blur === 'number' && blur < 20) || (typeof contrast === 'number' && contrast < 20);

  if (meanConf >= 0.75 && !lowQuality) {
    return {
      status: 'PASS',
      field: 'READABILITY',
      extractedValue: `mean OCR confidence ${Math.round(meanConf * 100)}%`,
      expectedRequirement: 'Declarations printed/legible enough for machine reading and human verification.',
      reason: 'OCR read the label with high confidence.',
      confidence: Math.min(0.99, meanConf),
    };
  }

  if (meanConf >= 0.55) {
    return {
      status: 'WARNING',
      field: 'READABILITY',
      extractedValue: `mean OCR confidence ${Math.round(meanConf * 100)}%`,
      expectedRequirement: rule.description,
      reason: 'Moderate OCR confidence - some declarations may be mis-read or partially illegible.',
      confidence: meanConf,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `Average text confidence ${Math.round(meanConf * 100)}%.`,
        whyFlagged: 'REQUIRES MANUAL VERIFICATION of legibility on the physical pack.',
        inspectorShouldVerify: 'Re-photograph under better lighting or verify each declaration manually.',
      },
    };
  }

  return {
    status: 'WARNING',
    severityOverride: 'HIGH',
    field: 'READABILITY',
    extractedValue: `mean OCR confidence ${Math.round(meanConf * 100)}%${blur !== undefined ? `, blur-score ${blur}` : ''}`,
    expectedRequirement: rule.description,
    reason: 'Label could not be read reliably - extraction results are not trustworthy.',
    confidence: Math.max(0.3, meanConf),
    manualVerificationRequired: true,
    explainability: {
      whatWasDetected: 'Very low OCR confidence / poor contrast-blur metrics.',
      whyFlagged: 'REQUIRES MANUAL VERIFICATION - the image quality prevents reliable automated checking.',
      inspectorShouldVerify: 'Retake photos (steady, well-lit, close-up) before drawing conclusions.',
    },
  };
}

module.exports = validateReadability;
