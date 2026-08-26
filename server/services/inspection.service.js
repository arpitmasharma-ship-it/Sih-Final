const mongoose = require('mongoose');
const Inspection = require('../models/Inspection');
const Product = require('../models/Product');
const OcrResult = require('../models/OcrResult');
const ApiError = require('../utils/ApiError');
const { getNextSequence } = require('../utils/ids');
const { getPagination } = require('../utils/pagination');
const { escapeRegex } = require('../utils/db');
const { sanitizeDeclarations } = require('./scan.service');
const { runComplianceCheck } = require('./compliance/ruleService');

async function createInspection({ user, payload }) {
  const {
    productName,
    brandName,
    category,
    barcode,
    images,
    declarations,
    humanCorrections,
    location,
    inspectorNotes,
    ocrResultIds,
  } = payload;

  if (!productName) throw ApiError.badRequest('Product name is required');
  if (!images || !images.length) throw ApiError.badRequest('At least one image is required');

  const cleanDecls = sanitizeDeclarations(declarations);

  // OCR metadata for readability checks
  const ocrDocs = ocrResultIds?.length
    ? await OcrResult.find({ _id: { $in: ocrResultIds } }).lean()
    : [];
  const meanConfidences = ocrDocs.map((o) => o.meanConfidence).filter((n) => typeof n === 'number');
  const ocrMeta = {
    meanConfidence: meanConfidences.length
      ? meanConfidences.reduce((a, b) => a + b, 0) / meanConfidences.length
      : 0.6,
    blurScore: ocrDocs[0]?.imageMeta?.blurScore,
    contrastScore: ocrDocs[0]?.imageMeta?.contrastScore,
    rawText: ocrDocs.map((o) => o.rawText).join('\n---\n'),
    primaryImageUrl: images[0]?.url,
    simulated: ocrDocs.some((o) => o.simulated),
  };

  const compliance = await runComplianceCheck(cleanDecls, ocrMeta);

  // Upsert product by name+manufacturer fingerprint when possible
  let product = barcode
    ? await Product.findOne({ barcode })
    : await Product.findOne({
        productName: new RegExp(`^${escapeRegex(productName)}$`, 'i'),
      });

  const declarationsSnapshot = {};
  Object.entries(cleanDecls).forEach(([k, v]) => (declarationsSnapshot[k] = v));

  const overallStatus =
    user.reviewOverride && ['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW'].includes(user.reviewOverride)
      ? user.reviewOverride
      : compliance.status;

  if (!product) {
    product = await Product.create({
      productName,
      brandName,
      category,
      barcode,
      manufacturer:
        cleanDecls.MANUFACTURER_NAME?.value || cleanDecls.PACKER_NAME?.value || cleanDecls.IMPORTER_NAME?.value || '',
      packer: cleanDecls.PACKER_NAME?.value || '',
      importer: cleanDecls.IMPORTER_NAME?.value || '',
      location: location || {},
      images,
      extractedDeclarations: declarationsSnapshot,
      complianceStatus: compliance.status,
      complianceScore: compliance.scores.overall,
      createdBy: user._id,
    });
  } else {
    product.images = images;
    product.extractedDeclarations = new Map(Object.entries(declarationsSnapshot));
    product.complianceStatus = compliance.status;
    product.complianceScore = compliance.scores.overall;
    product.location = location || product.location;
    if (barcode) product.barcode = product.barcode || barcode;
    await product.save();
  }

  const inspectionId = await getNextSequence('inspection', 'LMC-INS');

  const inspection = await Inspection.create({
    inspectionId,
    productId: product._id,
    inspectorId: user._id,
    location: location || {},
    images,
    ocrResultIds: ocrDocs.map((o) => o._id),
    declarations: declarationsSnapshot,
    humanCorrections: humanCorrections || [],
    complianceChecks: compliance.checks,
    violations: compliance.violations,
    warnings: compliance.warnings,
    scores: compliance.scores,
    summary: compliance.summary,
    engineVersion: compliance.engineVersion,
    inspectorNotes: inspectorNotes || '',
    finalStatus: overallStatus,
  });

  product.latestInspectionId = inspection._id;
  await product.save();

  return { inspection, product, compliance };
}

async function listInspections(query) {
  const { page, limit, skip } = getPagination(query, { limit: 12 });
  const filter = {};
  if (query.status) filter.finalStatus = query.status;
  if (query.district) filter['location.district'] = new RegExp(escapeRegex(query.district), 'i');
  if (query.inspectorId) filter.inspectorId = query.inspectorId;
  if (query.productId && mongoose.isValidObjectId(query.productId)) {
    filter.productId = new mongoose.Types.ObjectId(query.productId);
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) {
      const t = new Date(query.to);
      t.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = t;
    }
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ inspectionId: rx }];
  }

  const [items, total] = await Promise.all([
    Inspection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'productName category images')
      .populate('inspectorId', 'name')
      .lean(),
    Inspection.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

async function getInspection(id, { full = true } = {}) {
  const q = Inspection.findById(id);
  if (!full) q.select('-complianceChecks');
  const inspection = await q
    .populate('productId')
    .populate('inspectorId', 'name email district')
    .populate('reviewedBy', 'name')
    .populate('ocrResultIds', '-lines')
    .lean();
  if (!inspection) throw ApiError.notFound('Inspection not found');
  return inspection;
}

/** Human review finalization */
async function reviewInspection(id, { reviewer, decision, remarks }) {
  const inspection = await Inspection.findById(id);
  if (!inspection) throw ApiError.notFound('Inspection not found');

  const allowedDecisions = [
    'COMPLIANT',
    'NON_COMPLIANT',
    'REQUIRES_REVIEW',
    'PASS_AFTER_REVIEW',
    'VIOLATION_CONFIRMED',
  ];
  if (!allowedDecisions.includes(decision)) {
    throw ApiError.badRequest(`decision must be one of: ${allowedDecisions.join(', ')}`);
  }

  inspection.reviewed = true;
  inspection.reviewedBy = reviewer._id;
  inspection.reviewedAt = new Date();
  inspection.reviewRemarks = remarks || '';
  inspection.finalStatus = decision;

  // Dismissal / confirmation of individual violations
  inspection.violations.forEach((v) => {
    if (decision === 'PASS_AFTER_REVIEW') v.status = 'DISMISSED';
    if (decision === 'VIOLATION_CONFIRMED') v.status = 'CONFIRMED';
  });
  await inspection.save();

  // Keep the product's headline status in sync with the reviewed outcome
  const statusForProduct =
    decision === 'PASS_AFTER_REVIEW'
      ? 'COMPLIANT'
      : decision === 'VIOLATION_CONFIRMED'
      ? 'NON_COMPLIANT'
      : decision;
  await Product.findByIdAndUpdate(inspection.productId, { complianceStatus: statusForProduct });

  return inspection;
}

module.exports = { createInspection, listInspections, getInspection, reviewInspection };
