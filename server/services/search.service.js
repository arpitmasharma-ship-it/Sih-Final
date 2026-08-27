const Product = require('../models/Product');
const Inspection = require('../models/Inspection');
const ComplianceRule = require('../models/ComplianceRule');
const Report = require('../models/Report');
const User = require('../models/User');
const { escapeRegex } = require('../utils/db');

/**
 * Global search across products, inspections, reports, and rules.
 */
async function globalSearch({ q, status, severity, category, district, from, to, limit = 10 }) {
  const rx = q ? new RegExp(escapeRegex(q.trim()), 'i') : null;
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

  if (!q && !Object.keys(filterInspection).length && !Object.keys(productFilter).length) {
    return out;
  }

  // 1. Search products
  const productQuery = rx
    ? {
        ...productFilter,
        $or: [
          { productName: rx },
          { manufacturer: rx },
          { brandName: rx },
          { category: rx },
          { barcode: rx },
          { importer: rx },
          { packer: rx },
          { 'location.city': rx },
          { 'location.district': rx },
          { 'location.state': rx },
          { 'location.addressLabel': rx },
        ],
      }
    : productFilter;

  const products = await Product.find(productQuery)
    .limit(limit)
    .select('productName manufacturer brandName complianceStatus complianceScore images category location updatedAt')
    .lean();

  const matchingProductIds = products.map((p) => p._id);

  // 2. Search inspections (by ID, notes, rule code/title, location, or matching product ID)
  const inspectionOrConditions = [];
  if (rx) {
    inspectionOrConditions.push(
      { inspectionId: rx },
      { 'violations.ruleCode': rx },
      { 'violations.ruleTitle': rx },
      { inspectorNotes: rx },
      { 'location.district': rx },
      { 'location.state': rx },
      { 'location.city': rx },
      { 'location.addressLabel': rx }
    );
    if (matchingProductIds.length > 0) {
      inspectionOrConditions.push({ productId: { $in: matchingProductIds } });
    }
  }

  const [inspections, reports, rules] = await Promise.all([
    Inspection.find({
      ...filterInspection,
      ...(inspectionOrConditions.length > 0 ? { $or: inspectionOrConditions } : {}),
    })
      .limit(limit)
      .sort(rx ? {} : { createdAt: -1 })
      .select('inspectionId finalStatus scores violations createdAt productId location')
      .populate('productId', 'productName brandName images category')
      .lean(),

    Report.find(
      rx
        ? {
            $or: [
              { reportId: rx },
              { 'snapshot.productName': rx },
              { 'snapshot.category': rx },
              ...(matchingProductIds.length > 0 ? [{ productId: { $in: matchingProductIds } }] : []),
            ],
          }
        : {}
    )
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('inspectionId', 'inspectionId finalStatus')
      .populate('generatedBy', 'name')
      .lean(),

    ComplianceRule.find(
      rx
        ? {
            $or: [
              { ruleCode: rx },
              { title: rx },
              { description: rx },
              { category: rx },
              { 'metadata.penaltySection': rx },
            ],
          }
        : {}
    )
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
