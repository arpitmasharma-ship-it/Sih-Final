const helpers = require('../helpers');

function validateImporter(declarations, rule) {
  const { imported, basis } = helpers.detectImported(declarations);

  if (imported === null) {
    return {
      status: 'WARNING',
      field: 'IMPORTER_NAME',
      extractedValue: null,
      expectedRequirement: 'If imported, importer details are required; else not applicable.',
      reason: `Import status cannot be determined from image (${basis}).`,
      confidence: 0.6,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: 'No importer declaration or foreign origin found.',
        whatWasExpected: rule.description,
        whyFlagged: 'System cannot confirm whether the commodity is imported.',
        inspectorShouldVerify: 'Check if the product is imported; if so verify Rule 6(3) declarations.',
      },
    };
  }

  if (!imported) {
    return {
      status: 'NOT_APPLICABLE',
      field: 'IMPORTER_NAME',
      message: 'Package appears domestically manufactured/origin-India; importer check not applicable.',
      reason: basis,
      confidence: 0.95,
    };
  }

  const importer = helpers.getVal(declarations, 'IMPORTER_NAME');
  const origin = helpers.getVal(declarations, 'COUNTRY_OF_ORIGIN');
  const missing = [];
  if (!importer) missing.push('importer name & address');
  if (!origin) missing.push('country of origin');

  if (missing.length === 2) {
    return {
      status: 'FAIL',
      field: 'IMPORTER_NAME',
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'For imported packages: name & address of importer AND country of origin must be declared.',
      reason: `Package appears imported (${basis}) but neither importer nor origin is declared.`,
      confidence: 0.85,
    };
  }
  if (missing.length === 1) {
    return {
      status: 'WARNING',
      field: missing.includes('importer') ? 'IMPORTER_NAME' : 'COUNTRY_OF_ORIGIN',
      extractedValue: importer || origin,
      expectedRequirement: rule.description,
      reason: `Imported package detected but ${missing[0]} not verified.`,
      confidence: 0.8,
      manualVerificationRequired: true,
    };
  }

  return {
    status: 'PASS',
    field: 'IMPORTER_NAME',
    extractedValue: `${importer} | Origin: ${origin}`,
    expectedRequirement: rule.description,
    reason: 'Importer details and country of origin both declared.',
    confidence: Math.min(
      helpers.confidenceOf(declarations, 'IMPORTER_NAME'),
      helpers.confidenceOf(declarations, 'COUNTRY_OF_ORIGIN')
    ),
  };
}

module.exports = validateImporter;
