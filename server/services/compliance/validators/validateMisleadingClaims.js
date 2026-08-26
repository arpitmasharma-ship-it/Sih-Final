/**
 * Assistive MISLEADING-CLAIM scan.
 * This is an informational aid only: common promotional superlatives are
 * flagged for human review because their legality depends on context
 * (e.g. comparative ads, prize schemes). Never auto-FAILs on this basis.
 */
const RED_FLAG_PATTERNS = [
  /\bno\.?\s*1\b/i,
  /\bbest\b/i,
  /\bsuperior\b/i,
  /\bcure[sd]?\b/i,
  /\bmiracle\b/i,
  /\bgovernment\s*approved\b/i,
  /\bisi\s*mark(ed)?\b(?!\s*:\s*\d)/i, // ISI mark claim without licence number nearby
];

function validateMisleadingClaims(declarations, rule, ctx = {}) {
  const rawText = ctx.ocrMeta?.rawText || '';
  if (!rawText) {
    return { status: 'NOT_APPLICABLE', message: 'No raw text available for claim scan.' };
  }
  const hits = RED_FLAG_PATTERNS.filter((re) => re.test(rawText)).map((re) => re.source);
  if (hits.length === 0) {
    return { status: 'PASS', field: 'MISLEADING_CLAIMS', message: 'No obvious red-flag claims detected.', confidence: 0.8 };
  }
  return {
    status: 'WARNING',
    field: 'MISLEADING_CLAIMS',
    extractedValue: `Patterns matched: ${hits.join(', ')}`,
    expectedRequirement: 'Declarations must not be false or misleading to a material degree.',
    reason: 'Promotional/superlative wording detected - verify contextual legality.',
    confidence: 0.7,
    manualVerificationRequired: true,
    explainability: {
      whatWasDetected: 'Marketing claims that may require substantiation.',
      whyFlagged: 'REQUIRES MANUAL VERIFICATION - legality depends on context, not detectable from pixels.',
      inspectorShouldVerify: 'Assess whether claims are misleading in the actual trade context.',
    },
  };
}

module.exports = validateMisleadingClaims;
