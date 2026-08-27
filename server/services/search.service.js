const Product = require('../models/Product');
const Inspection = require('../models/Inspection');
const ComplianceRule = require('../models/ComplianceRule');
const Report = require('../models/Report');
const { escapeRegex } = require('../utils/db');

/**
 * Global search across products, inspections, reports, and rules with high concurrency and lightweight projections.
 */
async function globalSearch({ q, status, severity, category, district, from, to, limit = 10 }) {
  const rx = q?.trim() ? new RegExp(escapeRegex(q.trim()), 'i') : null;
  const out = { products: [], inspections: [], reports: [], rules: [] };
  const filterInspection = {};

  if (status) filterInspection.finalStatus = status;
  if (district) filterInspection['location.district'] = new RegExp(escapeRegex(district), 'i');
  if (from || to) {
    filterInspection.createdAt = {};
    if (from) filterInspection.createdAt.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      filterInspection.createdAt.$lte = t;
    }
  }
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    filterInspection.violations = { $elemMatch: { severity } };
  }

  const productFilter = {};
  if (category) productFilter.category = category;

  if (!rx && !Object.keys(filterInspection).length && !Object.keys(productFilter).length) {
    return out;
  }

  // 1. Build Product Query
  const productQuery = rx
    ? {
        ...productFilter,
        $or: [
          { productName: rx },
          { manufacturer: rx },
          { brandName: rx },
          { category: rx },
          { barcode: rx },
        ],
      }
    : productFilter;

  // 2. Build Inspection Query
  const inspectionQuery = { ...filterInspection };
  if (rx) {
    inspectionQuery.$or = [
      { inspectionId: rx },
      { 'violations.ruleCode': rx },
      { 'violations.ruleTitle': rx },
      { inspectorNotes: rx },
      { 'location.district': rx },
      { 'location.city': rx },
    ];
  }

  // 3. Build Report Query
  const reportQuery = rx
    ? {
        $or: [
          { reportId: rx },
          { 'snapshot.productName': rx },
          { 'snapshot.category': rx },
        ],
      }
    : {};

  // 4. Build Rule Query
  const ruleQuery = rx
    ? {
        $or: [
          { ruleCode: rx },
          { title: rx },
          { description: rx },
          { category: rx },
        ],
      }
    : {};

  // Execute all 4 queries concurrently in parallel with lightweight projections
  const [products, inspections, reports, rules] = await Promise.all([
    Product.find(productQuery)
      .limit(limit)
      .select('productName manufacturer brandName complianceStatus complianceScore category location updatedAt')
      .lean(),

    Inspection.find(inspectionQuery)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('inspectionId finalStatus scores createdAt productId location')
      .populate('productId', 'productName brandName category')
      .lean(),

    Report.find(reportQuery)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('reportId snapshot createdAt generatedBy')
      .populate('generatedBy', 'name')
      .lean(),

    ComplianceRule.find(ruleQuery)
      .limit(8)
      .select('ruleCode title category enabled version sourceReference severity')
      .lean(),
  ]);

  out.products = products;
  out.inspections = inspections;
  out.reports = reports;
  out.rules = rules;
  return out;
}

module.exports = { globalSearch };

