const ruleService = require('../services/rule.service');
const complianceService = require('../services/compliance/ruleService');
const { ok, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { objectIdOrThrow } = require('../utils/db');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.list = asyncHandler(async (req, res) => {
  const enabled = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined;
  const rules = await ruleService.listRules({
    category: req.query.category,
    enabled,
    q: req.query.q,
  });
  ok(res, rules);
});

exports.create = asyncHandler(async (req, res) => {
  const rule = await ruleService.createRule(req.body, req.user);
  await recordAudit({ req, action: ACTIONS.RULE_CREATED, entity: 'ComplianceRule', entityId: rule._id, metadata: { code: rule.ruleCode } });
  created(res, { rule }, 'Rule created');
});

exports.update = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'rule id');
  const rule = await ruleService.updateRule(id, req.body, req.user);
  complianceService.invalidateCache();
  await recordAudit({ req, action: ACTIONS.RULE_UPDATED, entity: 'ComplianceRule', entityId: id, metadata: { updates: Object.keys(req.body) } });
  ok(res, { rule }, { message: 'Rule updated' });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'rule id');
  await ruleService.deleteRule(id);
  complianceService.invalidateCache();
  await recordAudit({ req, action: ACTIONS.RULE_DELETED, entity: 'ComplianceRule', entityId: id });
  ok(res, null, { message: 'Rule deleted' });
});

// Re-sync built-in official rules from seed definitions
exports.sync = asyncHandler(async (req, res) => {
  const count = await complianceService.syncRulesFromSeed();
  ok(res, { updated: count }, { message: `${count} rule(s) synced from official seed` });
});
