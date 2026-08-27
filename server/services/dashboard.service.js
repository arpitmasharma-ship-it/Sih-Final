const Inspection = require('../models/Inspection');
const Product = require('../models/Product');
const User = require('../models/User');
const Report = require('../models/Report');

async function summary({ district, category, from, to, inspectorId } = {}) {
  const matchIns = {};
  if (district) matchIns['location.district'] = new RegExp(district, 'i');
  if (inspectorId) matchIns.inspectorId = inspectorId;
  if (from || to) {
    matchIns.createdAt = {};
    if (from) matchIns.createdAt.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      matchIns.createdAt.$lte = t;
    }
  }

  // Single-pass facet aggregation on Inspection collection
  const [totalProducts, [inspectionStats], reportsCount] = await Promise.all([
    Product.countDocuments(category ? { category } : {}),
    Inspection.aggregate([
      { $match: matchIns },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          byStatus: [
            {
              $group: {
                _id: '$finalStatus',
                count: { $sum: 1 },
                avgScore: { $avg: '$scores.overall' },
              },
            },
          ],
          highSeverity: [
            { $unwind: '$violations' },
            { $match: { 'violations.severity': { $in: ['HIGH', 'CRITICAL'] } } },
            { $count: 'count' },
          ],
          overallScore: [
            { $group: { _id: null, avg: { $avg: '$scores.overall' } } },
          ],
        },
      },
    ]),
    Report.estimatedDocumentCount().catch(() => Report.countDocuments()),
  ]);

  const totalInspections = inspectionStats?.totalCount[0]?.count || 0;
  const statusAgg = inspectionStats?.byStatus || [];
  const highSeverity = inspectionStats?.highSeverity[0]?.count || 0;
  const avgScore = inspectionStats?.overallScore[0]?.avg ?? 0;

  const byStatus = {};
  let scoreSum = 0;
  let scoreCount = 0;
  statusAgg.forEach((s) => {
    byStatus[s._id] = s.count;
    if (typeof s.avgScore === 'number') {
      scoreSum += s.avgScore * s.count;
      scoreCount += s.count;
    }
  });

  const compliant = byStatus.COMPLIANT || byStatus.PASS_AFTER_REVIEW || 0;
  const nonCompliant = (byStatus.NON_COMPLIANT || 0) + (byStatus.VIOLATION_CONFIRMED || 0);
  const requiresReview = byStatus.REQUIRES_REVIEW || 0;

  return {
    totalProducts,
    totalInspections,
    compliant,
    nonCompliant,
    requiresReview,
    highSeverityViolations: highSeverity,
    compliancePercentage: totalInspections > 0 ? Math.round((compliant / totalInspections) * 100) : 0,
    averageComplianceScore: Math.round((scoreCount > 0 ? scoreSum / scoreCount : avgScore) * 10) / 10,
    reportsGenerated: reportsCount,
  };
}

async function trends({ months = 6, district } = {}) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const match = { createdAt: { $gte: since } };
  if (district) match['location.district'] = new RegExp(district, 'i');

  const monthly = await Inspection.aggregate([
    { $match: match },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        inspections: { $sum: 1 },
        violations: { $sum: { $size: { $ifNull: ['$violations', []] } } },
        avgScore: { $avg: '$scores.overall' },
        compliant: {
          $sum: {
            $cond: [{ $in: ['$finalStatus', ['COMPLIANT', 'PASS_AFTER_REVIEW']] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  return monthly.map((r) => ({
    month: `${new Date(0).toLocaleString('en', { month: 'short' }).length ? '' : ''}${[
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ][r._id.m - 1]} ${String(r._id.y).slice(2)}`,
    inspections: r.inspections,
    violations: r.violations,
    compliant: r.compliant,
    complianceRate: r.inspections > 0 ? Math.round((r.compliant / r.inspections) * 100) : 0,
    avgScore: Math.round((r.avgScore || 0) * 10) / 10,
  }));
}

async function violationStats() {
  const [byCategory, bySeverity, mostCommon] = await Promise.all([
    Inspection.aggregate([
      { $unwind: '$violations' },
      { $group: { _id: '$violations.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Inspection.aggregate([
      { $unwind: '$violations' },
      { $group: { _id: '$violations.severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Inspection.aggregate([
      { $unwind: '$violations' },
      {
        $group: {
          _id: { code: '$violations.ruleCode', title: '$violations.ruleTitle' },
          count: { $sum: 1 },
          severity: { $first: '$violations.severity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);
  return {
    byCategory: byCategory.map((x) => ({ name: x._id || 'OTHER', value: x.count })),
    bySeverity: bySeverity.map((x) => ({ name: x._id, value: x.count })),
    mostCommon: mostCommon.map((x) => ({ ruleCode: x._id.code, title: x._id.title, count: x.count, severity: x.severity })),
  };
}

async function districtStats() {
  const rows = await Inspection.aggregate([
    { $match: { 'location.district': { $exists: true, $ne: null } } },
    {
      $group: {
        _id: { district: '$location.district', state: '$location.state' },
        inspections: { $sum: 1 },
        violations: { $sum: { $size: { $ifNull: ['$violations', []] } } },
        compliant: {
          $sum: { $cond: [{ $in: ['$finalStatus', ['COMPLIANT', 'PASS_AFTER_REVIEW']] }, 1, 0] },
        },
        avgScore: { $avg: '$scores.overall' },
      },
    },
    { $sort: { violations: -1 } },
  ]);
  return rows.map((r) => ({
    district: r._id.district,
    state: r._id.state || '',
    inspections: r.inspections,
    violations: r.violations,
    compliant: r.compliant,
    violationRate:
      r.violations + r.inspections > 0
        ? Math.round((r.violations / Math.max(1, r.inspections)) * 100)
        : 0,
    complianceRate: r.inspections > 0 ? Math.round((r.compliant / r.inspections) * 100) : 0,
    avgScore: Math.round((r.avgScore || 0) * 10) / 10,
  }));
}

async function inspectorsLeaderboard() {
  return Inspection.aggregate([
    {
      $group: {
        _id: '$inspectorId',
        inspections: { $sum: 1 },
        violationsFound: { $sum: { $size: { $ifNull: ['$violations', []] } } },
      },
    },
    { $sort: { inspections: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'inspector',
      },
    },
    { $unwind: '$inspector' },
    {
      $project: {
        _id: 0,
        name: '$inspector.name',
        district: '$inspector.district',
        inspections: 1,
        violationsFound: 1,
      },
    },
  ]);
}

async function systemStats() {
  const [users, products, inspections, reports] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Inspection.countDocuments(),
    Report.countDocuments(),
  ]);
  return { users, products, inspections, reports };
}

module.exports = {
  summary,
  trends,
  violationStats,
  districtStats,
  inspectorsLeaderboard,
  systemStats,
};
