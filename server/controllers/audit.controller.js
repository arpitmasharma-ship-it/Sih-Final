const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { paginated, ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '15', 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.userId && /^[0-9a-fA-F]{24}$/.test(req.query.userId)) filter.user = req.query.userId;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const t = new Date(req.query.to);
      t.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = t;
    }
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  paginated(res, { items, total, page, limit });
});

exports.actions = asyncHandler(async (req, res) => {
  const actions = await AuditLog.distinct('action');
  ok(res, actions.sort());
});
