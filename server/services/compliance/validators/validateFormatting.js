const helpers = require('../helpers');

/** FORMATTING sanity checks on numeric declarations. */
function validateFormatting(declarations) {
  const issues = [];

  const mrp = helpers.getVal(declarations, 'MRP');
  if (mrp && /\d{7,}/.test(mrp.replace(/[,.\s]/g, ''))) {
    issues.push(`MRP "${mrp}" appears to contain an implausibly long digit run.`);
  }

  const nq = helpers.getVal(declarations, 'NET_QUANTITY');
  if (nq && /[;|]/.test(nq)) {
    issues.push(`Net quantity "${nq}" contains stray separator characters - possible OCR artifact.`);
  }

  const mfg = helpers.getVal(declarations, 'MFG_DATE');
  if (mfg && /^(?:[01]?[0-9])\/(?:0?[1-9]|[12][0-9]|3[01])\/\d{2,4}$/.test(mfg.trim())) {
    issues.push(
      `Date "${mfg}" looks like DD/MM/YYYY - LMPC requires month & year; verify it is not an expiry date misread.`
    );
  }

  if (!issues.length) {
    return {
      status: 'PASS',
      field: 'FORMATTING',
      message: 'No obvious formatting anomalies in numeric declarations.',
      confidence: 0.9,
    };
  }
  return {
    status: 'WARNING',
    field: 'FORMATTING',
    extractedValue: issues.join(' | '),
    expectedRequirement: 'Clean, unambiguous numeral formatting.',
    reason: issues.join(' '),
    confidence: 0.8,
    manualVerificationRequired: true,
  };
}

module.exports = validateFormatting;
