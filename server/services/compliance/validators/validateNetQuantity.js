const helpers = require('../helpers');
const { parseNetQuantity } = require('../../ocr/fieldExtractor');

const METRIC_UNITS = new Set([
  'kg', 'g', 'mg', 'l', 'ml', 'cl', 'm', 'cm', 'mm',
  'nos', 'pcs', 'units',
]);

function validateNetQuantity(declarations, rule) {
  const raw = helpers.getVal(declarations, 'NET_QUANTITY');

  if (!raw || raw.toUpperCase() === 'NOT DETECTED') {
    return {
      status: 'FAIL',
      field: 'NET_QUANTITY',
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'The net quantity must be declared on every pre-packaged commodity in standard units.',
      reason: 'Net quantity declaration could not be verified from the provided image(s).',
      confidence: 0.6,
      explainability: {
        whatWasDetected: 'No net-quantity text region detected.',
        whatWasExpected: 'A declaration such as "Net Qty. 500 g" or "NET QUANTITY 1 L".',
        whyFlagged: 'Mandatory net-quantity declaration was not found in extracted text.',
        inspectorShouldVerify: 'Check all package faces; weigh/measure the package if necessary.',
      },
    };
  }

  const parsed = parseNetQuantity(raw);
  if (!parsed || !Number.isFinite(parsed.numericValue)) {
    return {
      status: 'FAIL',
      field: 'NET_QUANTITY',
      extractedValue: raw,
      expectedRequirement: `Numeric quantity followed by a legal unit (${[...METRIC_UNITS].join(', ')}).`,
      reason: `"${raw}" does not contain a recognizable quantity + unit combination.`,
      confidence: helpers.confidenceOf(declarations, 'NET_QUANTITY'),
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${raw}"`,
        whatWasExpected: 'e.g. "500 g", "750 ml", "1 kg".',
        whyFlagged: 'Quantity/unit could not be parsed reliably.',
        inspectorShouldVerify: 'Read the exact figure and unit from the label.',
      },
    };
  }

  if (!METRIC_UNITS.has(parsed.unit)) {
    return {
      status: 'FAIL',
      field: 'NET_QUANTITY',
      extractedValue: raw,
      expectedRequirement:
        'Net quantity declared in prescribed metric units (weight/volume/length/count as applicable).',
      reason: `Unit "${parsed.unit}" is not a recognized legal unit for net-quantity declaration.`,
      confidence: Math.min(0.9, helpers.confidenceOf(declarations, 'NET_QUANTITY')),
      manualVerificationRequired: false,
      explainability: {
        whatWasDetected: `Unit "${parsed.unit}".`,
        whatWasExpected: 'A prescribed unit such as g / kg / ml / L.',
        whyFlagged: 'Declared unit appears non-standard or was mis-read by OCR.',
        inspectorShouldVerify: 'Confirm the printed unit on the pack.',
      },
    };
  }

  if (parsed.numericValue <= 0) {
    return {
      status: 'FAIL',
      field: 'NET_QUANTITY',
      extractedValue: raw,
      expectedRequirement: 'Positive numeric quantity.',
      reason: 'Quantity value is zero or negative.',
      confidence: 0.95,
    };
  }

  return {
    status: 'PASS',
    field: 'NET_QUANTITY',
    extractedValue: raw,
    expectedRequirement: rule.description,
    reason: 'Valid numeric quantity with recognized unit detected.',
    confidence: helpers.confidenceOf(declarations, 'NET_QUANTITY'),
    explainability: {
      whatWasDetected: `"${raw}".`,
      whatWasExpected: rule.description,
      whyFlagged: 'N/A - requirement satisfied.',
      inspectorShouldVerify: 'Spot-check against actual fill level if suspicion exists.',
    },
  };
}

module.exports = validateNetQuantity;
