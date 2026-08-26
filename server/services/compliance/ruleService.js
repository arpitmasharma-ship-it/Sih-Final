const ComplianceRule = require('../../models/ComplianceRule');
const rulesSeed = require('./rulesSeed');
const { evaluateCompliance } = require('./engine');

// Short-TTL cache so hot paths don't hit Mongo on every evaluation
let cache = { rules: null, loadedAt: 0 };
const CACHE_MS = 60 * 1000;

async function getActiveRules({ force = false } = {}) {
  if (!force && cache.rules && Date.now() - cache.loadedAt < CACHE_MS) return cache.rules;
  const rules = await ComplianceRule.find({ enabled: true }).lean();
  cache = { rules, loadedAt: Date.now() };
  return rules;
}

function invalidateCache() {
  cache = { rules: null, loadedAt: 0 };
}

async function syncRulesFromSeed() {
  let upserted = 0;
  for (const rule of rulesSeed) {
    const existing = await ComplianceRule.findOne({ ruleCode: rule.ruleCode });
    if (!existing) {
      await ComplianceRule.create({ ...rule, history: [] });
      upserted++;
    } else if (existing.version !== rule.version) {
      existing.history.push({
        version: existing.version,
        changeSummary: 'Auto-synced to newer seed version',
        snapshot: existing.toObject(),
      });
      Object.assign(existing, rule);
      await existing.save();
      upserted++;
    }
  }
  invalidateCache();
  return upserted;
}

/**
 * Run the deterministic engine against current active rules.
 * declarations: map FIELD_KEY -> { value, confidence, humanVerified, bbox, sourceImage }
 */
async function runComplianceCheck(declarations, ocrMeta) {
  const rules = await getActiveRules();
  return evaluateCompliance(rules, declarations, ocrMeta);
}

module.exports = {
  getActiveRules,
  syncRulesFromSeed,
  runComplianceCheck,
  invalidateCache,
};
