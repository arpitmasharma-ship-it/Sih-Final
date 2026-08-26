/**
 * Deterministic, explainable compliance engine.
 *
 * evaluate(rules, declarations, ctx) -> {
 *   checks[], violations[], warnings[], scores{}, summary{}, status
 * }
 *
 * - Rules come from the ComplianceRule collection (versioned, sourced).
 * - LLM/AI is NEVER consulted for legal status; this module is pure logic.
 */
const { VALIDATORS } = require('./validators');
const { FIELDS } = require('../../constants');

const SEVERITY_WEIGHTS = { CRITICAL: 5, HIGH: 3, MEDIUM: 2, LOW: 1 };
const ENGINE_VERSION = 'engine-1.0.0';

function isApplicable(rule, declarations) {
  if (rule.applicableTo?.importedOnly) {
    const importer = declarations.IMPORTER_NAME?.value;
    const origin = declarations.COUNTRY_OF_ORIGIN?.value;
    return Boolean(importer) || Boolean(origin && !/india/i.test(origin));
  }
  return true;
}

function normalizeResult(rule, res, ocrMeta) {
  return {
    ruleCode: rule.ruleCode,
    ruleTitle: rule.title,
    category: rule.category,
    validationType: rule.validationType,
    status: res.status,
    severity: res.severityOverride || rule.severity,
    field: res.field || null,
    message: res.message || res.reason || '',
    confidence:
      typeof res.confidence === 'number'
        ? Math.round(res.confidence * 1000) / 1000
        : ocrMeta?.meanConfidence ?? 0.5,
    manualVerificationRequired: Boolean(res.manualVerificationRequired),
    // Advisory checks (font-size/placement/misleading-scan) can never be reliably
    // automated - their warnings never flip the final status by themselves.
    advisory: Boolean(rule.advisory),
    extractedValue: res.extractedValue ?? null,
    expectedRequirement: res.expectedRequirement ?? rule.description,
    reason: res.reason || '',
    evidenceImage: res.evidenceImage ?? null,
    bbox: res.bbox ?? null,
    sourceReference: rule.sourceReference,
    ruleVersion: rule.version,
    explainability: {
      whatWasDetected:
        res.explainability?.whatWasDetected ||
        (res.extractedValue ? `Detected value: "${res.extractedValue}".` : 'See extracted declaration.'),
      whatWasExpected: res.explainability?.whatWasExpected || res.expectedRequirement || rule.description,
      whyFlagged: res.explainability?.whyFlagged || res.reason || 'N/A',
      ruleApplied: `${rule.ruleCode} — ${rule.title} (${rule.sourceReference}, v${rule.version})`,
      inspectorShouldVerify:
        res.explainability?.inspectorShouldVerify ||
        'Cross-check the physical package before final determination.',
      ...(res.explainability || {}),
    },
  };
}

function scoreFor(checks, predicate) {
  const subset = checks.filter(predicate);
  let got = 0;
  let max = 0;
  subset.forEach((c) => {
    if (c.status === 'NOT_APPLICABLE') return;
    const w = SEVERITY_WEIGHTS[c.severity] || 2;
    max += w;
    if (c.status === 'PASS') got += w;
    else if (c.status === 'WARNING') got += w * 0.5;
  });
  return max === 0 ? null : Math.round((got / max) * 100);
}

const COMPLETENESS_FIELDS = [
  FIELDS.PRODUCT_NAME,
  FIELDS.MANUFACTURER_NAME,
  FIELDS.NET_QUANTITY,
  FIELDS.MRP,
  FIELDS.MFG_DATE,
  FIELDS.CONSUMER_CARE_PHONE,
  FIELDS.COUNTRY_OF_ORIGIN,
  FIELDS.COMMODITY_IDENTITY,
];

function evaluateCompliance(rules, declarations = {}, ocrMeta = {}) {
  const checks = [];

  rules.forEach((rawRule) => {
    const rule = typeof rawRule.toObject === 'function' ? rawRule.toObject() : rawRule;
    if (rule.enabled === false) return;

    if (!isApplicable(rule, declarations)) {
      checks.push(
        normalizeResult(
          rule,
          {
            status: 'NOT_APPLICABLE',
            message: `Not applicable to this package (${rule.applicableTo?.notes || 'condition unmet'}).`,
          },
          ocrMeta
        )
      );
      return;
    }

    const validator = VALIDATORS[rule.validationType];
    if (!validator) {
      checks.push(
        normalizeResult(rule, { status: 'NOT_APPLICABLE', message: 'No validator registered.' }, ocrMeta)
      );
      return;
    }

    let res;
    try {
      res = validator(declarations, rule, { ocrMeta });
    } catch (e) {
      res = {
        status: 'WARNING',
        message: `Check error: ${e.message}`,
        manualVerificationRequired: true,
      };
    }
    checks.push(normalizeResult(rule, res, ocrMeta));
  });

  // ---- violations & warnings ----
  const violations = checks.filter((c) => c.status === 'FAIL').map((c) => ({
    ruleCode: c.ruleCode,
    ruleTitle: c.ruleTitle,
    category: c.category,
    severity: c.severity,
    field: c.field,
    extractedValue: c.extractedValue,
    expectedRequirement: c.expectedRequirement,
    reason: c.reason,
    evidenceImage: c.evidenceImage || ocrMeta.primaryImageUrl || null,
    bbox: c.bbox,
    confidence: c.confidence,
    sourceReference: c.sourceReference,
    ruleVersion: c.ruleVersion,
    explainability: c.explainability,
  }));

  const warnings = checks.filter((c) => c.status === 'WARNING').map((c) => ({
    ruleCode: c.ruleCode,
    ruleTitle: c.ruleTitle,
    category: c.category,
    severity: c.severity,
    field: c.field,
    message: c.message || c.reason,
    manualVerificationRequired: c.manualVerificationRequired,
    advisory: Boolean(c.advisory),
  }));

  // ---- scores ----
  const mandatoryCategories = [
    'MANDATORY_DECLARATION', 'NET_QUANTITY', 'MRP', 'MANUFACTURER_INFO',
    'PACKER_INFO', 'IMPORTER_INFO', 'COUNTRY_OF_ORIGIN', 'CONSUMER_CARE',
    'DATE_DECLARATIONS', 'UNIT_DECLARATIONS',
  ];
  const readabilityCategories = ['READABILITY', 'FONT_SIZE', 'PLACEMENT', 'FORMATTING'];

  const overall = scoreFor(checks, () => true);
  const mandatory = scoreFor(checks, (c) => mandatoryCategories.includes(c.category));
  const readability = scoreFor(checks, (c) => readabilityCategories.includes(c.category));

  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const v = declarations[f]?.value;
    return v && String(v).trim() && String(v).toUpperCase() !== 'NOT DETECTED';
  }).length;
  const dataCompleteness = Math.round((filled / COMPLETENESS_FIELDS.length) * 100);

  const summary = {
    totalChecks: checks.length,
    passed: checks.filter((c) => c.status === 'PASS').length,
    failed: violations.length,
    warnings: warnings.length,
    notApplicable: checks.filter((c) => c.status === 'NOT_APPLICABLE').length,
    requiresManualVerification: checks.some((c) => c.manualVerificationRequired),
  };

  // ---- final deterministic status ----
  const blockingWarnings = warnings.filter((w) => !w.advisory);
  let status;
  if (violations.length > 0) {
    status = 'NON_COMPLIANT';
  } else if (blockingWarnings.length > 0 || checks.some((c) => c.manualVerificationRequired && !c.advisory)) {
    status = 'REQUIRES_REVIEW';
  } else if (overall !== null && overall < 60) {
    status = 'REQUIRES_REVIEW';
  } else {
    status = 'COMPLIANT';
  }

  return {
    engineVersion: ENGINE_VERSION,
    checks,
    violations,
    warnings,
    scores: {
      overall: overall ?? 100,
      mandatoryDeclarations: mandatory ?? overall ?? 100,
      readability: readability ?? overall ?? 100,
      dataCompleteness,
    },
    summary,
    status,
  };
}

module.exports = { evaluateCompliance, ENGINE_VERSION, SEVERITY_WEIGHTS };
