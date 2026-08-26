const Product = require('../models/Product');
const Inspection = require('../models/Inspection');
const ComplianceRule = require('../models/ComplianceRule');
const User = require('../models/User');
const { escapeRegex } = require('../utils/db');

/**
 * Global search across products, inspections, rules (and users for ADMIN).
 */
async function globalSearch({ q, status, severity, category, district, from, to, limit = 10 }) {
  const rx = q ? new RegExp(escapeRegex(q), 'i') : null;
  const out = { products: [], inspections: [], rules: [] };
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
    return out; // avoid full-table scans when nothing is queried
  }

  const [products, inspections, rules] = await Promise.all([
    Product.find(
      rx
        ? {
            ...productFilter,
            $or: [
              { productName: rx },
              { manufacturer: rx },
              { brandName: rx },
              { barcode: rx },
              { importer: rx },
              { packer: rx },
            ],
          }
        : productFilter
    )
      .limit(limit)
      .select('productName manufacturer complianceStatus complianceScore images category location updatedAt')
      .lean(),

    Inspection.find({
      ...filterInspection,
      ...(rx
        ? {
            $or: [
              { inspectionId: rx },
              { 'violations.ruleCode': rx },
              { inspectorNotes: rx },
            ],
          }
        : {}),
    })
      .limit(limit)
      .sort(rx ? {} : { createdAt: -1 })
      .select('inspectionId finalStatus scores violations createdAt productId location')
      .populate('productId', 'productName images')
      .lean(),

    ComplianceRule.find(
      rx ? { $or: [{ ruleCode: rx }, { title: rx }, { description: rx }] } : {}
    )
      .limit(6)
      .select('ruleCode title category enabled version sourceReference')
      .lean(),
  ]);

  // MRP search support (stored inside extractedDeclarations map)
  let mrpMatches = [];
  if (rx && /mrp|rs|₹|price/i.test(q)) {
    mrpMatches = await Product.find({
      ...productFilter,
      [`extractedDeclarations.MRP.value`]: rx,
    })
      .limit(limit)
      .select('productName manufacturer complianceStatus complianceScore images category')
      .lean();
  }
  const seen = new Set(products.map((p) => String(p._id)));
  mrpMatches.forEach((m) => {
    if (!seen.has(String(m._id))) products.push(m);
  });

  out.products = products;
  out.inspections = inspections;
  out.rules = rules;
  return out;
}

module.exports = { globalSearch };
