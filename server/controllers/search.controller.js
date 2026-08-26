const searchService = require('../services/search.service');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.globalSearch = asyncHandler(async (req, res) => {
  ok(
    res,
    await searchService.globalSearch({
      q: req.query.q,
      status: req.query.status,
      severity: req.query.severity,
      category: req.query.category,
      district: req.query.district,
      from: req.query.from,
      to: req.query.to,
      limit: Math.min(20, parseInt(req.query.limit || '8', 10)),
    })
  );
});

module.exports = exports;
