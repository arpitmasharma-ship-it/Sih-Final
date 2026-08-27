const Report = require('../models/Report');
const Inspection = require('../models/Inspection');
const ApiError = require('../utils/ApiError');
const { getNextSequence } = require('../utils/ids');
const { getPagination } = require('../utils/pagination');
const { escapeRegex } = require('../utils/db');
const { generateInspectionPdf } = require('./reports/pdf.service');
const { uploadImage } = require('./cloudinary/storage.service');
const config = require('../config/env');
const fs = require('fs');

async function createReport({ inspectionId, user }) {
  if (!inspectionId) throw ApiError.badRequest('`inspectionId` is required');

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(inspectionId).trim());
  const inspection = await Inspection.findOne(
    isObjectId ? { _id: String(inspectionId).trim() } : { inspectionId: String(inspectionId).trim() }
  )
    .populate('productId')
    .populate('inspectorId', 'name email')
    .lean();
  if (!inspection) throw ApiError.notFound(`Inspection "${inspectionId}" not found`);

  const actualInspectionId = inspection._id;
  const existing = await Report.findOne({ inspectionId: actualInspectionId }).sort({ createdAt: -1 });
  if (existing) {
    if (existing.fileUrl?.startsWith('/uploads')) {
      const filePath = require('path').join(__dirname, '..', '..', existing.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        return { report: existing, regenerated: false };
      }
    } else if (existing.fileUrl?.startsWith('http')) {
      return { report: existing, regenerated: false };
    }
  }

  const reportId = await getNextSequence('report', 'LMC-RPT', 6);
  const filename = `${reportId}.pdf`;

  const { buffer, checksum } = await generateInspectionPdf({
    inspection,
    product: inspection.productId,
    generatedBy: user,
  });

  let fileUrl;
  let publicId = null;
  let provider = 'local';
  if (config.cloudinary.enabled) {
    const stored = await uploadImage(buffer, {
      folder: 'lmcc/reports',
      filename,
    });
    fileUrl = stored.url;
    publicId = stored.publicId;
    provider = stored.provider || (stored.url?.startsWith('http') ? 'cloudinary' : 'local');
  } else {
    const dir = require('path').join(__dirname, '..', '..', 'uploads', 'reports');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(require('path').join(dir, filename), buffer);
    fileUrl = `/uploads/reports/${filename}`;
    provider = 'local';
  }

  const report = await Report.create({
    reportId,
    inspectionId: actualInspectionId,
    generatedBy: user?._id || inspection.inspectorId?._id,
    fileUrl,
    publicId,
    storageProvider: provider,
    checksumSha256: checksum,
    sizeBytes: buffer.length,
    snapshot: {
      productName: inspection.productId?.productName || inspection.declarations?.PRODUCT_NAME?.value || '',
      finalStatus: inspection.finalStatus,
      complianceScore: inspection.scores?.overall ?? null,
      violationsCount: (inspection.violations || []).length,
    },
  });
  return { report, regenerated: true };
}

async function getReport(idOrReportId) {
  if (!idOrReportId) throw ApiError.notFound('Report not found');
  const cleanId = String(idOrReportId).trim();
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);

  let report = await Report.findOne(
    isObjectId ? { $or: [{ _id: cleanId }, { inspectionId: cleanId }] } : { reportId: cleanId }
  )
    .populate('inspectionId')
    .lean();

  if (!report && cleanId.startsWith('LMC-INS')) {
    const inspection = await Inspection.findOne({ inspectionId: cleanId }).lean();
    if (inspection) {
      report = await Report.findOne({ inspectionId: inspection._id }).populate('inspectionId').lean();
    }
  }

  if (!report) throw ApiError.notFound(`Report for "${cleanId}" not found`);
  return report;
}

async function listReports(query = {}) {
  const { page, limit, skip } = getPagination(query, { limit: 12 });
  const filter = {};
  if (query.status) filter['snapshot.finalStatus'] = query.status;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ reportId: rx }, { 'snapshot.productName': rx }];
  }
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('reportId inspectionId generatedBy fileUrl sizeBytes snapshot createdAt')
      .populate('inspectionId', 'inspectionId finalStatus')
      .populate('generatedBy', 'name')
      .lean(),
    Object.keys(filter).length === 0
      ? Report.estimatedDocumentCount().catch(() => Report.countDocuments(filter))
      : Report.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

/** Editable (JSON) export of the full inspection record */
async function exportJson(idOrReportId) {
  const report = await getReport(idOrReportId);
  const inspection = await Inspection.findById(report.inspectionId._id)
    .populate('productId', '-__v')
    .populate('inspectorId', 'name email')
    .populate('reviewedBy', 'name')
    .lean();
  return {
    exportType: 'LMCC_INSPECTION_EXPORT',
    version: 1,
    generatedAt: new Date().toISOString(),
    reportId: report.reportId,
    checksumSha256: report.checksumSha256,
    disclaimer:
      'This report is an automated compliance-assistance output and is subject to verification by the competent authority.',
    inspection,
  };
}

module.exports = { createReport, listReports, getReport, exportJson };
