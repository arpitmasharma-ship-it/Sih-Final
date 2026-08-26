const helpers = require('../helpers');

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
// Accepts 03/2025, 03-25, Mar 2025, MAR-25, 12/08/2025 etc.
function parseDeclarationDate(value) {
  const v = String(value).trim();
  let m = v.match(new RegExp(`^(?:[0-3]?[0-9][\\/\\-.])?([01]?[0-9]|[a-z]{3,9})[\\/\\-. ]([0-9]{2,4})$`, 'i'));
  if (!m) return null;
  let month;
  if (/^[a-z]+$/i.test(m[1])) {
    const idx = MONTHS.split('|').indexOf(m[1].slice(0, 3).toLowerCase());
    if (idx === -1) return null;
    month = idx + 1;
  } else {
    month = parseInt(m[1], 10);
  }
  if (month < 1 || month > 12) return null;
  let year = parseInt(m[2], 10);
  if (year < 100) year += year < 70 ? 2000 : 1900;
  return { month, year };
}

function validateDate(declarations, rule) {
  const keys = rule.requiredFields && rule.requiredFields.length
    ? rule.requiredFields
    : ['MFG_DATE', 'PACK_DATE'];
  const availableKey = helpers.firstAvailableFieldKey(declarations, keys);

  if (!availableKey) {
    return {
      status: 'FAIL',
      field: keys.join(' / '),
      extractedValue: 'NOT FOUND',
      expectedRequirement:
        'The month and year of manufacture / pre-packing must be declared on the package.',
      reason: 'Manufacture/packing date could not be verified from the provided image(s).',
      confidence: 0.6,
      explainability: {
        whatWasDetected: 'No date-of-manufacture/packing text detected.',
        whatWasExpected: 'A declaration such as "MFG 03/2025" or "Packed on Mar 2025".',
        whyFlagged: 'Mandatory date declaration was not found in extracted text.',
        inspectorShouldVerify: 'Check embossed/punched codes near the seal or crimp area.',
      },
    };
  }

  const raw = helpers.getVal(declarations, availableKey);
  const parsed = parseDeclarationDate(raw);
  if (!parsed) {
    return {
      status: 'WARNING',
      field: availableKey,
      extractedValue: raw,
      expectedRequirement: 'Month & year in a recognizable format (e.g. MM/YYYY).',
      reason: `"${raw}" is not a recognizable date format.`,
      confidence: helpers.confidenceOf(declarations, availableKey),
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${raw}"`,
        whatWasExpected: 'e.g. "03/2025" or "Mar 2025".',
        whyFlagged: 'Format ambiguous or partially read; could be a lot/batch code.',
        inspectorShouldVerify: 'Read the printed/embossed date from the physical package.',
      },
    };
  }

  // Implausibly far-future date (typo guard)
  const now = new Date();
  const decl = new Date(parsed.year, parsed.month - 1, 1);
  const diffMonths =
    (decl.getFullYear() - now.getFullYear()) * 12 + (decl.getMonth() - now.getMonth());
  if (diffMonths > 6) {
    return {
      status: 'WARNING',
      field: availableKey,
      extractedValue: raw,
      expectedRequirement: 'A plausible past or current manufacturing/pre-packing date.',
      reason: `Date appears more than 6 months in the future (${raw}).`,
      confidence: 0.9,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: `"${raw}"`,
        whyFlagged: 'Future-dated manufacture is unusual; likely OCR misread of digits.',
        inspectorShouldVerify: 'Verify each digit of the date on the pack.',
      },
    };
  }

  return {
    status: 'PASS',
    field: availableKey,
    extractedValue: raw,
    expectedRequirement: rule.description,
    reason: 'Valid month/year declaration detected.',
    confidence: helpers.confidenceOf(declarations, availableKey),
  };
}

module.exports = validateDate;
