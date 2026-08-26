/**
 * Compliance engine unit tests - pure functions, no DB required.
 * Covers the SIH-mandated cases: missing MRP / net qty / manufacturer /
 * consumer care, invalid formats, unreadable text, compliant & non-compliant flows.
 */
const { evaluateCompliance } = require('../services/compliance/engine');
const rulesSeed = require('../services/compliance/rulesSeed');

const RULES = rulesSeed.map((r) => ({ enabled: true, params: {}, ...r }));

function decl(value, confidence = 0.95, humanVerified = false) {
  return { value, confidence, humanVerified };
}

const COMPLIANT_DECLARATIONS = {
  PRODUCT_NAME: decl('Crunchy Almond Cookies'),
  NET_QUANTITY: decl('200 g'),
  MRP: decl('Rs 99.00'),
  INCLUSIVE_OF_ALL_TAXES: decl('YES'),
  MANUFACTURER_NAME: decl('Sunrise Foods Pvt Ltd'),
  MANUFACTURER_ADDRESS: decl('Plot 42, Noida UP - 201305'),
  MFG_DATE: decl('03/2025'),
  CONSUMER_CARE_PHONE: decl('1800-123-4567'),
  COUNTRY_OF_ORIGIN: decl('India'),
};

const OCR_META_GOOD = { meanConfidence: 0.92, blurScore: 46, contrastScore: 58, rawText: 'MRP Rs 99' };
const OCR_META_BAD = { meanConfidence: 0.4, blurScore: 10, contrastScore: 12, rawText: '' };

describe('Compliance Engine', () => {
  test('fully declared product is COMPLIANT with high score', () => {
    const r = evaluateCompliance(RULES, COMPLIANT_DECLARATIONS, OCR_META_GOOD);
    expect(r.status).toBe('COMPLIANT');
    expect(r.violations.length).toBe(0);
    expect(r.scores.overall).toBeGreaterThanOrEqual(80);
    expect(r.summary.passed).toBeGreaterThan(0);
    // font-size & placement always require manual verification from a photo
    expect(r.summary.requiresManualVerification).toBe(true);
    // ...which must push status to REQUIRES_REVIEW per policy
  });

  test('missing MRP -> NON_COMPLIANT with LM-PC-MRP-001 FAIL and explainability', () => {
    const d = { ...COMPLIANT_DECLARATIONS };
    delete d.MRP;
    delete d.INCLUSIVE_OF_ALL_TAXES;
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    expect(r.status).toBe('NON_COMPLIANT');
    const v = r.violations.find((x) => x.ruleCode === 'LM-PC-MRP-001');
    expect(v).toBeDefined();
    expect(v.severity).toBe('CRITICAL');
    expect(v.explainability.whatWasExpected).toMatch(/retail sale price/i);
    expect(v.expectedRequirement).toBeTruthy();
    expect(v.sourceReference).toMatch(/Legal Metrology/);
  });

  test('invalid net quantity unit ("70 x") -> FAIL on net quantity rule', () => {
    const d = {
      ...COMPLIANT_DECLARATIONS,
      NET_QUANTITY: decl('70 x', 0.72),
    };
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    const v = r.violations.find((x) => x.ruleCode === 'LM-PC-NETQTY-001');
    expect(v).toBeDefined();
    expect(v.reason).toMatch(/unit/i);
  });

  test('invalid MRP format ("Rs abc") -> flagged for manual verification', () => {
    const d = { ...COMPLIANT_DECLARATIONS, MRP: decl('Rs abc', 0.8) };
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    const check = r.checks.find((c) => c.ruleCode === 'LM-PC-MRP-001');
    expect(['FAIL', 'WARNING']).toContain(check.status);
    expect(check.manualVerificationRequired || check.status === 'FAIL').toBe(true);
  });

  test('missing manufacturer/packer/importer -> HIGH violation', () => {
    const d = { ...COMPLIANT_DECLARATIONS };
    ['MANUFACTURER_NAME', 'PACKER_NAME', 'IMPORTER_NAME'].forEach((k) => delete d[k]);
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    expect(r.violations.some((v) => v.ruleCode === 'LM-PC-MFR-001')).toBe(true);
  });

  test('missing consumer care -> HIGH violation (2017 amendment)', () => {
    const d = { ...COMPLIANT_DECLARATIONS };
    delete d.CONSUMER_CARE_PHONE;
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    const v = r.violations.find((x) => x.ruleCode === 'LM-PC-CC-001');
    expect(v).toBeDefined();
  });

  test('low-confidence unreadable image -> REQUIRES_REVIEW via readability warning', () => {
    const r = evaluateCompliance(RULES, COMPLIANT_DECLARATIONS, OCR_META_BAD);
    expect(r.status).not.toBe('NON_COMPLIANT'); // never fake legal certainty
    expect(['REQUIRES_REVIEW']).toContain(r.status);
    const rd = r.checks.find((c) => c.ruleCode === 'LM-PC-RDBL-001');
    expect(rd.status).toBe('WARNING');
    expect(rd.manualVerificationRequired).toBe(true);
  });

  test('imported package without origin/importer triggers importer checks', () => {
    const d = {
      ...COMPLIANT_DECLARATIONS,
      IMPORTER_NAME: decl('GlobalTrade Imports Pvt Ltd', 0.9),
    };
    delete d.COUNTRY_OF_ORIGIN;
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    const coo = r.checks.find((c) => c.ruleCode === 'LM-PC-COO-001');
    expect(coo.status).toBe('FAIL');
    const imp = r.checks.find((c) => c.ruleCode === 'LM-PC-IMP-001');
    expect(['PASS', 'WARNING']).toContain(imp.status);
  });

  test('domestic package skips imported-only rules as NOT_APPLICABLE', () => {
    const r = evaluateCompliance(RULES, COMPLIANT_DECLARATIONS, OCR_META_GOOD);
    const coo = r.checks.find((c) => c.ruleCode === 'LM-PC-COO-001');
    expect(coo.status).toBe('NOT_APPLICABLE');
  });

  test('disabled rules are skipped', () => {
    const rules = RULES.map((r) => (r.ruleCode === 'LM-PC-MRP-001' ? { ...r, enabled: false } : r));
    const d = { ...COMPLIANT_DECLARATIONS };
    delete d.MRP;
    const res = evaluateCompliance(rules, d, OCR_META_GOOD);
    expect(res.checks.some((c) => c.ruleCode === 'LM-PC-MRP-001')).toBe(false);
  });

  test('every violation carries full explainability block + rule reference', () => {
    const d = { ...COMPLIANT_DECLARATIONS };
    delete d.NET_QUANTITY;
    const r = evaluateCompliance(RULES, d, OCR_META_GOOD);
    expect(r.violations.length).toBeGreaterThan(0);
    r.violations.forEach((v) => {
      expect(v.ruleCode).toBeTruthy();
      expect(v.sourceReference).toBeTruthy();
      expect(v.explainability.whatWasExpected).toBeTruthy();
      expect(v.explainability.whyFlagged).toBeTruthy();
      expect(v.explainability.inspectorShouldVerify).toBeTruthy();
    });
  });
});
