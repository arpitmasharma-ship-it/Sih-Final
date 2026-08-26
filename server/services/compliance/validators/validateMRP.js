const helpers = require('../helpers');
const { parseMRP } = require('../../ocr/fieldExtractor');

/**
 * MRP validation:
 * - presence (Rule 18, LMPC Rules 2011)
 * - numeric format
 * - "inclusive of all taxes" wording flagged as informational warning when missing
 */
function validateMRP(declarations, rule, ctx = {}) {
  const raw = helpers.getVal(declarations, 'MRP');

  if (!raw || raw.toUpperCase() === 'NOT DETECTED') {
    return {
      status: 'FAIL',
      field: 'MRP',
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'Every pre-packaged commodity shall bear the retail sale price (MRP) declared on it.',
      reason: 'MRP declaration could not be verified from the provided image(s).',
      confidence: Math.max(0.6, ctx.ocrMeta?.meanConfidence || 0.6),
      explainability: {
        whatWasDetected: 'No MRP text region detected by OCR.',
        whatWasExpected: `${rule.description} A legible "MRP Rs xx" / "Max. Retail Price Rs xx" declaration.`,
        whyFlagged: 'The mandatory MRP declaration was not found in the extracted text.',
        inspectorShouldVerify:
          'Check all package faces and any affixed sticker/price label; if present but unreadable, enter it manually.',
      },
    };
  }

  const parsed = parseMRP(raw) || parseMRP(`mrp ${raw}`);
  if (!parsed || !Number.isFinite(parsed.numericValue) || parsed.numericValue <= 0) {
    return {
      status: 'FAIL',
      field: 'MRP',
      extractedValue: raw,
      expectedRequirement: 'MRP must be a clear numeric amount in Indian currency.',
      reason: `Could not parse a valid amount from "${raw}".`,
      confidence: helpers.confidenceOf(declarations, 'MRP'),
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${raw}"`,
        whatWasExpected: 'A valid numeric MRP e.g. "Rs 99" / "₹499".',
        whyFlagged: 'The value does not parse as a valid rupee amount.',
        inspectorShouldVerify: 'Read the MRP from the physical label and correct the field if OCR mis-read it.',
      },
    };
  }

  const inclusive = helpers.getVal(declarations, 'INCLUSIVE_OF_ALL_TAXES') === 'YES';
  if (!inclusive) {
    return {
      status: 'WARNING',
      field: 'MRP',
      extractedValue: raw,
      expectedRequirement: 'MRP declaration to be inclusive of all taxes.',
      reason: '"Inclusive of all taxes" wording not detected near the MRP.',
      confidence: helpers.confidenceOf(declarations, 'MRP'),
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `MRP "${raw}" without the phrase "inclusive of all taxes".`,
        whatWasExpected: 'MRP stated inclusive of all taxes.',
        whyFlagged: 'Phrase not found; may be printed elsewhere or too small for OCR.',
        inspectorShouldVerify: 'Confirm on the physical pack whether tax-inclusive wording is present.',
      },
    };
  }

  return {
    status: 'PASS',
    field: 'MRP',
    extractedValue: raw,
    expectedRequirement: rule.description,
    reason: 'Valid numeric MRP detected with tax-inclusive wording.',
    confidence: helpers.confidenceOf(declarations, 'MRP'),
    explainability: {
      whatWasDetected: `MRP "${raw}", inclusive-of-taxes phrase found.`,
      whatWasExpected: rule.description,
      whyFlagged: 'N/A - requirement satisfied.',
      inspectorShouldVerify: 'Spot-check that the amount matches any sticker/overprint.',
    },
  };
}

module.exports = validateMRP;
