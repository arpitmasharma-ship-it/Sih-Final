const ComplianceRule = require('../models/ComplianceRule');
const ApiError = require('../utils/ApiError');

async function listRules({ category, enabled, q }) {
  const filter = {};
  if (category) filter.category = category;
  if (typeof enabled === 'boolean') filter.enabled = enabled;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ ruleCode: rx }, { title: rx }, { description: rx }];
  }
  return ComplianceRule.find(filter).sort({ ruleCode: 1 }).lean();
}

async function createRule(payload, actor) {
  const exists = await ComplianceRule.findOne({ ruleCode: payload.ruleCode });
  if (exists) throw ApiError.conflict('A rule with this code already exists');
  return ComplianceRule.create({
    ...payload,
    history: [{ version: payload.version || '1.0.0', changedBy: actor._id, changeSummary: 'Rule created' }],
  });
}

async function updateRule(id, updates, actor) {
  const rule = await ComplianceRule.findById(id);
  if (!rule) throw ApiError.notFound('Rule not found');

  const changedFields = Object.keys(updates).filter(
    (k) => JSON.stringify(updates[k]) !== JSON.stringify(rule[k])
  );
  const versionChanged = updates.version && updates.version !== rule.version;

  if (changedFields.length && !versionChanged && !('enabled' in updates)) {
    // Minor edits keep version but are logged
  }

  if (changedFields.length) {
    rule.history.push({
      version: versionChanged ? updates.version : rule.version,
      changedBy: actor._id,
      changeSummary:
        'enabledOnly' in updates
          ? `Enabled=${updates.enabled}`
          : `Updated: ${changedFields.join(', ')}`,
      snapshot: rule.toObject(),
    });
  }

  const allowed = [
    'title', 'description', 'category', 'applicableTo', 'requiredFields',
    'validationType', 'params', 'severity', 'enabled', 'sourceReference',
    'sourceUrl', 'effectiveDate', 'version', 'amendmentNote',
  ];
  allowed.forEach((k) => {
    if (updates[k] !== undefined) rule[k] = updates[k];
  });
  await rule.save();
  return rule;
}

async function deleteRule(id) {
  const rule = await ComplianceRule.findByIdAndDelete(id);
  if (!rule) throw ApiError.notFound('Rule not found');
  return rule;
}

module.exports = { listRules, createRule, updateRule, deleteRule };
