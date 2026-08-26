/**
 * FONT SIZE / physical letter-height validation.
 *
 * IMPORTANT: exact physical font size CANNOT be measured from an uncalibrated
 * photograph. Pixels cannot be converted to millimetres without a reference
 * dimension in the image. Per the platform's legal-data policy this validator
 * therefore returns REQUIRES MANUAL VERIFICATION unless explicit calibration
 * metadata (ctx.calibration = { pxPerMm }) is supplied by a calibrated rig.
 */
function validateFontSize(declarations, rule, ctx = {}) {
  const calibration = ctx.calibration;

  if (!calibration || !calibration.pxPerMm) {
    return {
      status: 'WARNING',
      field: 'FONT_SIZE',
      extractedValue: null,
      expectedRequirement:
        'Minimum letter/numeral height per Rule 9 LMPC Rules 2011 (depends on package area).',
      reason:
        'Image is uncalibrated - physical character height cannot be reliably measured from pixels.',
      confidence: 0.99,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: 'Text present; pixel heights measurable but no physical scale reference.',
        whatWasExpected: 'Letter/numeral height above the statutory minimum for the package area.',
        whyFlagged: 'REQUIRES MANUAL VERIFICATION - automatic PASS/FAIL would be unreliable.',
        inspectorShouldVerify:
          'Measure numeral height with a ruler/gauge against the size table for the package area.',
      },
    };
  }

  // Calibrated path (future hardware integration)
  const targetField = ctx.targetBbox || null;
  if (!targetField) return { status: 'NOT_APPLICABLE', message: 'No text region selected for measurement.' };
  const mmHeight = targetField.height / calibration.pxPerMm;
  const minMm = (rule.params && rule.params.minHeightMm) || 1;
  return {
    status: mmHeight >= minMm ? 'PASS' : 'FAIL',
    field: 'FONT_SIZE',
    extractedValue: `${mmHeight.toFixed(2)} mm (calibrated)`,
    expectedRequirement: `>= ${minMm} mm`,
    reason: 'Measured using provided calibration.',
    confidence: 0.9,
    manualVerificationRequired: false,
  };
}

module.exports = validateFontSize;
