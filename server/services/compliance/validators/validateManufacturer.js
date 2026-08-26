const helpers = require('../helpers');

/**
 * Rule 6(1)(a) LMPC Rules 2011 - Name & address of manufacturer / packer /
 * importer (any one, as applicable to the case).
 */
function validateManufacturer(declarations, rule) {
  const nameKeys = ['MANUFACTURER_NAME', 'PACKER_NAME', 'IMPORTER_NAME'];
  const addrKeys = ['MANUFACTURER_ADDRESS', 'PACKER_ADDRESS', 'IMPORTER_ADDRESS'];

  const availableNameKey = helpers.firstAvailableFieldKey(declarations, nameKeys);
  if (!availableNameKey) {
    return {
      status: 'FAIL',
      field: nameKeys.join(' / '),
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'Name and address of the manufacturer or packer or importer must appear on the package.',
      reason:
        'None of the responsible-party declarations (manufacturer/packer/importer) could be verified.',
      confidence: 0.6,
      explainability: {
        whatWasDetected: 'No "Mfd by / Packed by / Imported by" text detected.',
        whatWasExpected: rule.description,
        whyFlagged: 'Responsible-party declaration missing or unreadable.',
        inspectorShouldVerify: 'Check all faces of the package for the firm name & address block.',
      },
    };
  }

  const raw = helpers.getVal(declarations, availableNameKey);
  const conf = helpers.confidenceOf(declarations, availableNameKey);

  if (raw.length < 4 || /^[^a-zA-Z]+$/.test(raw)) {
    return {
      status: 'WARNING',
      field: availableNameKey,
      extractedValue: raw,
      expectedRequirement: 'A complete firm name (and address).',
      reason: 'Extracted party name looks incomplete or garbled.',
      confidence: conf,
      manualVerificationRequired: true,
    };
  }

  const hasAddress = helpers.hasAnyValue(declarations, addrKeys);
  if (!hasAddress) {
    return {
      status: 'WARNING',
      field: availableNameKey,
      extractedValue: raw,
      expectedRequirement: 'Complete postal address of the responsible firm.',
      reason: `Party detected ("${raw}") but its address could not be verified.`,
      confidence: conf,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${raw}" without a readable complete address.`,
        whatWasExpected: 'Full postal address including PIN code.',
        whyFlagged: 'Address may be on another face of the pack or unreadable.',
        inspectorShouldVerify: 'Locate the full address on the package and record it.',
      },
    };
  }

  return {
    status: 'PASS',
    field: availableNameKey,
    extractedValue: raw,
    expectedRequirement: rule.description,
    reason: 'Responsible party name and an address were detected.',
    confidence: conf,
  };
}

module.exports = validateManufacturer;
