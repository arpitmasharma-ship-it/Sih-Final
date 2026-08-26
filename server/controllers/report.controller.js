const reportService = require('../services/report.service');
const { ok, created, paginated } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.create = asyncHandler(async (req, res) => {
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
  const report = await reportService.getReport(req.params.id);
  if (report.storageProvider === 'local' && report.fileUrl?.startsWith('/uploads')) {
    const filePath = path.join(__dirname, '..', '..', report.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) throw ApiError.notFound('Report file missing on server');
    return res.download(filePath, `LMCC-${report.reportId}.pdf`);
  }
  if (/^https?:\/\//.test(report.fileUrl)) return res.redirect(report.fileUrl);
  throw ApiError.notFound('Report file unavailable');
});

exports.exportJson = asyncHandler(async (req, res) => {
  const data = await reportService.exportJson(req.params.id);
  res.setHeader('Content-Disposition', `attachment; filename="LMCC-${data.reportId}.json"`);
  ok(res, data);
});
