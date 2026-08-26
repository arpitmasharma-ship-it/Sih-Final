const dashboardService = require('../services/dashboard.service');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.summary = asyncHandler(async (req, res) => {
  ok(
    res,
    await dashboardService.summary({
      district: req.query.district,
      category: req.query.category,
      from: req.query.from,
      to: req.query.to,
      inspectorId:
        req.query.inspectorId && String(req.query.inspectorId).match(/^[0-9a-fA-F]{24}$/)
          ? req.query.inspectorId
          : undefined,
    })
  );
});

exports.trends = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, parseInt(req.query.months || '6', 10)));
  ok(res, await dashboardService.trends({ months, district: req.query.district }));
});

exports.violations = asyncHandler(async (req, res) => {
  ok(res, await dashboardService.violationStats());
});

exports.districts = asyncHandler(async (req, res) => {
  // Heatmap-ready payload
  const districts = await dashboardService.districtStats();
  ok(res, {
    heatmapData: districts.map((d) => ({
      id: d.district,
      state: d.state,
      value: d.violationRate,
      inspections: d.inspections,
      violations: d.violations,
      avgScore: d.avgScore,
    })),
    rows: districts,
  });
});

exports.inspectors = asyncHandler(async (req, res) => {
  ok(res, await dashboardService.inspectorsLeaderboard());
});

exports.systemStats = asyncHandler(async (req, res) => {
  ok(res, await dashboardService.systemStats());
});
