/**
 * PLACEMENT check - statutory placement requirements cannot be verified from
 * a single arbitrary photograph (we do not know which face we are seeing or
 * the package geometry). Always returns REQUIRES MANUAL VERIFICATION.
 */
function validatePlacement(declarations, rule, ctx = {}) {
  if (!ctx.placementConfirmed) {
    return {
      status: 'WARNING',
      field: 'PLACEMENT',
      extractedValue: null,
      expectedRequirement:
        'Declarations must appear on the principal display panel / as prescribed, not on the base alone.',
      reason: 'Placement on the package cannot be reliably judged from uploaded photo(s).',
      confidence: 0.99,
      manualVerificationRequired: true,
      explainability: {
        whatWasDetected: 'Text regions detected but panel orientation/face unknown.',
        whatWasExpected: rule.description,
        whyFlagged: 'REQUIRES MANUAL VERIFICATION of physical placement.',
        inspectorShouldVerify: 'Confirm declarations are on the prescribed panel(s) of the package.',
      },
    };
  }
  return { status: 'PASS', field: 'PLACEMENT', message: 'Placement confirmed by inspector.' };
}

module.exports = validatePlacement;
