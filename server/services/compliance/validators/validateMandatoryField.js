const helpers = require('../helpers');

/**
 * Generic mandatory-declaration presence check.
 * PASS  - at least one of rule.requiredFields present with adequate confidence
 * WARNING - present but low OCR confidence and not human-verified
 * FAIL  - none of the required fields found
 */
function validateMandatoryField(declarations, rule, ctx = {}) {
  const keys = (rule.requiredFields || []).filter(Boolean);
  if (!keys.length) {
    return { status: 'NOT_APPLICABLE', message: 'Rule misconfigured: no required fields.' };
  }

  const availableKey = keys.find((k) => {
    const v = helpers.getVal(declarations, k);
    return v && v.toUpperCase() !== 'NOT DETECTED';
  });

  if (!availableKey) {
    return {
      status: 'FAIL',
      field: keys.join(' / '),
      extractedValue: 'NOT FOUND',
      expectedRequirement: `A legible declaration for ${rule.title} must appear on the package.`,
      reason: `None of the required declarations (${keys.join(', ')}) could be verified from the provided image(s).`,
      confidence: Math.max(
        0.6,
        ...(ctx.ocrMeta ? [ctx.ocrMeta.meanConfidence || 0.6] : [0.6])
      ),
      explainability: {
        whatWasDetected: 'No matching text region was detected by OCR.',
        whatWasExpected: rule.description,
        whyFlagged:
          'The mandatory declaration could not be located in the extracted text. It may be missing, unreadable, or on an unseen side of the package.',
        inspectorShouldVerify:
          'Physically check all faces of the package; if the declaration exists but was unreadable, correct the field manually and re-run the check.',
      },
    };
  }

  const conf = helpers.confidenceOf(declarations, availableKey);
  if (conf < ((rule.params && rule.params.minConfidence) ?? 0.55)) {
    return {
      status: 'WARNING',
      field: availableKey,
      extractedValue: helpers.getVal(declarations, availableKey),
      expectedRequirement: rule.description,
      reason: `Declaration found with low OCR confidence (${Math.round(conf * 100)}%).`,
      confidence: conf,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${helpers.getVal(declarations, availableKey)}" (confidence ${Math.round(conf * 100)}%).`,
        whatWasExpected: rule.description,
        whyFlagged: 'OCR confidence is below the reliability threshold.',
        inspectorShouldVerify: 'Compare the extracted value against the physical label and confirm/correct it.',
      },
    };
  }

  return {
    status: 'PASS',
    field: availableKey,
    extractedValue: helpers.getVal(declarations, availableKey),
    expectedRequirement: rule.description,
    reason: 'Required declaration detected.',
    confidence: conf,
    explainability: {
      whatWasDetected: `"${helpers.getVal(declarations, availableKey)}".`,
      whatWasExpected: rule.description,
      whyFlagged: 'N/A - requirement satisfied.',
      inspectorShouldVerify: 'Spot-check spelling/completeness of the declaration.',
    },
  };
}

module.exports = validateMandatoryField;
