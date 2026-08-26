const helpers = require('../helpers');

function validateCountryOfOrigin(declarations, rule) {
  const { imported, basis } = helpers.detectImported(declarations);

  if (imported === false) {
    return {
      status: 'NOT_APPLICABLE',
      field: 'COUNTRY_OF_ORIGIN',
      message: 'Domestic package; country-of-origin declaration not applicable.',
      reason: basis,
      confidence: 0.95,
    };
  }

  const origin = helpers.getVal(declarations, 'COUNTRY_OF_ORIGIN');
  if (!origin) {
    return imported === true
      ? {
          status: 'FAIL',
          field: 'COUNTRY_OF_ORIGIN',
          extractedValue: 'NOT FOUND',
          expectedRequirement:
            'Imported packages shall declare the country of origin / manufacture.',
          reason: `Package appears imported (${basis}) but origin is not declared.`,
          confidence: 0.85,
        }
      : {
          status: 'WARNING',
          field: 'COUNTRY_OF_ORIGIN',
          extractedValue: null,
          expectedRequirement: rule.description,
          reason: 'Origin not found; import status also undetermined.',
          confidence: 0.6,
          manualVerificationRequired: true,
        };
  }

  return {
    status: 'PASS',
    field: 'COUNTRY_OF_ORIGIN',
    extractedValue: origin,
    expectedRequirement: rule.description,
    reason: 'Country of origin detected.',
    confidence: helpers.confidenceOf(declarations, 'COUNTRY_OF_ORIGIN'),
  };
}

module.exports = validateCountryOfOrigin;
