const reportService = require('../services/report.service');
const { ok, created, paginated } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.create = asyncHandler(async (req, res) => {
  if (!req.body.inspectionId) {
    throw ApiError.badRequest('`inspectionId` is required in the request body');
  }
  const { report, regenerated } = await reportService.createReport({
    inspectionId: req.body.inspectionId,
    user: req.user,
  });
  await recordAudit({
    req,
    action: ACTIONS.REPORT_GENERATED,
    entity: 'Report',
    entityId: report._id,
    metadata: { inspectionId: String(report.inspectionId), regenerated },
  });
  created(
    res,
    { report },
    regenerated ? 'PDF report generated' : 'A report already exists for this inspection'
  );
});

exports.list = asyncHandler(async (req, res) => {
  paginated(res, await reportService.listReports(req.query));
});

exports.getOne = asyncHandler(async (req, res) => {
  ok(res, await reportService.getReport(req.params.id));
});

exports.getPdf = asyncHandler(async (req, res) => {
  let report;
  let inspection;
  const Inspection = require('../models/Inspection');
  const { generateInspectionPdf } = require('../services/reports/pdf.service');

  try {
    report = await reportService.getReport(req.params.id);
  } catch (err) {
    // If not found as report ID, try creating/finding report for the inspection ID
    const createdRes = await reportService.createReport({
      inspectionId: req.params.id,
      user: req.user,
    });
    report = createdRes.report;
  }

  const inspectionId = report?.inspectionId?._id || report?.inspectionId || req.params.id;
  inspection = await Inspection.findById(inspectionId)
    .populate('productId')
    .populate('inspectorId', 'name email')
    .lean();

  if (!inspection && String(inspectionId).startsWith('LMC-INS')) {
    inspection = await Inspection.findOne({ inspectionId })
      .populate('productId')
      .populate('inspectorId', 'name email')
      .lean();
  }

  // 1. If file exists on disk, stream it
  if (report?.fileUrl?.startsWith('/uploads')) {
    const filePath = path.join(__dirname, '..', '..', report.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="LMCC-${report.reportId || 'report'}.pdf"`);
      return res.send(fileBuffer);
    }
  }

  // 2. If hosted on Cloudinary, redirect
  if (/^https?:\/\//.test(report?.fileUrl)) {
    return res.redirect(report.fileUrl);
  }

  // 3. Generate on-the-fly and stream buffer directly
  if (inspection) {
    const { buffer } = await generateInspectionPdf({
      inspection,
      product: inspection.productId,
      generatedBy: req.user,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LMCC-${report?.reportId || inspection.inspectionId}.pdf"`);
    return res.send(buffer);
  }

  throw ApiError.notFound('Inspection record not found for PDF generation');
});

exports.exportJson = asyncHandler(async (req, res) => {
  const data = await reportService.exportJson(req.params.id);
  res.setHeader('Content-Disposition', `attachment; filename="LMCC-${data.reportId}.json"`);
  ok(res, data);
});
