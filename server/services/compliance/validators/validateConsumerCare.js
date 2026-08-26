const helpers = require('../helpers');

/**
 * Consumer-care declaration (mandatory on pre-packaged commodities since the
 * 2017 amendment - contact details for consumer complaints).
 */
function validateConsumerCare(declarations, rule) {
  const keys = ['CONSUMER_CARE_PHONE', 'CONSUMER_CARE_EMAIL', 'CUSTOMER_CARE_DETAILS', 'CONSUMER_CARE_ADDRESS'];
  const availableKey = helpers.firstAvailableFieldKey(declarations, keys);

  if (!availableKey) {
    return {
      status: 'FAIL',
      field: keys.join(' / '),
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'Consumer-care details (phone / e-mail / address) must be printed on the package.',
      reason: 'No consumer-care contact details could be verified from the image(s).',
      confidence: 0.6,
      explainability: {
        whatWasDetected: 'No customer/consumer care phone, email or block detected.',
        whatWasExpected: rule.description,
        whyFlagged: 'Mandatory consumer-care declaration missing or unreadable.',
        inspectorShouldVerify: 'Look for a small-print care block, often near ingredients/address panel.',
      },
    };
  }

  const raw = helpers.getVal(declarations, availableKey);
  const conf = helpers.confidenceOf(declarations, availableKey);

  // Phone sanity check when the found field is a phone
  if (availableKey === 'CONSUMER_CARE_PHONE') {
    const digits = raw.replace(/\D/g, '');
    const looksLikePhone =
      /^(1800|18\d{2})/.test(digits) || /^[6-9]/.test(digits) || digits.length >= 8;
    if (!looksLikePhone) {
      return {
        status: 'WARNING',
        field: availableKey,
        extractedValue: raw,
        expectedRequirement: 'A valid telephone/toll-free number or e-mail.',
        reason: `"${raw}" does not look like a usable phone number.`,
        confidence: conf,
        manualVerificationRequired: true,
      };
    }
  }

  return {
    status: 'PASS',
    field: availableKey,
    extractedValue: raw,
    expectedRequirement: rule.description,
    reason: 'Consumer-care details detected.',
    confidence: conf,
  };
}

module.exports = validateConsumerCare;
