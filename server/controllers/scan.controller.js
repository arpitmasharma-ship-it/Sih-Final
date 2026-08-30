const scanService = require('../services/scan.service');
const inspectionService = require('../services/inspection.service');
const notificationService = require('../services/notification.service');
const ocrService = require('../services/ocr');
const { createJob, getJob } = require('../services/ocr/ocrJob');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit, ACTIONS } = require('../services/audit.service');

/**
 * POST /api/scan/ocr  (multipart images[])
 * Enqueues uploads + preprocess + OCR + field extraction as an async job and
 * returns a jobId immediately. Poll GET /api/scan/ocr/:jobId for completion.
 */
exports.scanOcr = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('At least one image file is required under `images`');
  const labels = typeof req.body.labels === 'string' ? JSON.parse(req.body.labels) : undefined;
  const variant = req.body.variant || undefined; // provided by client, used as OCR hint

  const { jobId } = createJob(req.files, { labels, variant });

  await recordAudit({
    req,
    action: ACTIONS.OCR_PROCESS,
    entity: 'OcrResult',
    metadata: {
      images: req.files.length,
      jobId,
      async: true,
    },
  });

  ok(res, { jobId, status: 'pending' });
});

/**
 * GET /api/scan/ocr/:jobId
 * Poll for the status/result of an async OCR job.
 */
exports.scanOcrStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) throw ApiError.notFound('OCR job not found or expired');
  ok(res, {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    imagesCount: job.imagesCount,
    createdAt: job.createdAt,
    ...(job.status === 'completed' ? { data: job.result } : {}),
    ...(job.status === 'failed' ? { message: job.error, errorStack: job.errorStack } : {}),
  });
});

/**
 * POST /api/scan/complete
 * Runs compliance on the (human-corrected) declarations and persists
 * Product + Inspection. Body: productName, category?, barcode?, images[],
 * declarations{}, humanCorrections[], location{}, inspectorNotes, ocrResultIds[]
 */
exports.completeScan = asyncHandler(async (req, res) => {
  const correctionsCount = Array.isArray(req.body.humanCorrections)
    ? req.body.humanCorrections.length
    : 0;

  const { inspection, product } = await inspectionService.createInspection({
    user: req.user,
    payload: req.body,
  });

  await recordAudit({
    req,
    action: ACTIONS.PRODUCT_SCAN,
    entity: 'Product',
    entityId: product._id,
    metadata: { productName: product.productName },
  });
  await recordAudit({
    req,
    action: ACTIONS.COMPLIANCE_EVALUATION,
    entity: 'Inspection',
    entityId: inspection._id,
    metadata: { status: inspection.finalStatus, score: inspection.scores.overall },
  });
  if (correctionsCount > 0) {
    await recordAudit({
      req,
      action: ACTIONS.OCR_CORRECTION,
      entity: 'Inspection',
      entityId: inspection._id,
      metadata: { fields: req.body.humanCorrections.map((c) => c.field) },
    });
  }

  // Notify admins about critical violations
  const critical = (inspection.violations || []).filter((v) =>
    ['HIGH', 'CRITICAL'].includes(v.severity)
  );
  if (critical.length > 0) {
    await notificationService.notifyAdmins({
      title: `${critical.length} high-severity violation(s) detected`,
      message: `${product.productName} — ${inspection.inspectionId} flagged ${critical.length} HIGH/CRITICAL violation(s) by ${req.user.name}.`,
      type: 'CRITICAL',
      link: `/inspections/${inspection._id}`,
    });
  }
  await notificationService.notify({
    recipient: req.user._id,
    title: 'Inspection saved',
    message: `${inspection.inspectionId} — ${String(inspection.finalStatus).replace(/_/g, ' ')} (${inspection.scores.overall}%).`,
    type:
      inspection.finalStatus === 'COMPLIANT'
        ? 'SUCCESS'
        : inspection.finalStatus === 'NON_COMPLIANT'
        ? 'CRITICAL'
        : 'WARN',
    link: `/inspections/${inspection._id}`,
  });

  created(
    res,
    {
      inspectionId: inspection._id,
      inspectionRef: inspection.inspectionId,
      finalStatus: inspection.finalStatus,
      scores: inspection.scores,
      summary: inspection.summary,
      productId: product._id,
    },
    'Inspection saved'
  );
});

/**
 * POST /api/ocr/process (multipart single `image`)
 * Standalone OCR endpoint for integrations/tests.
 */
exports.ocrProcessSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('`image` file is required');
  const result = await ocrService.processImageBuffer(req.file.buffer, {
    imageUrl: null,
    imageIndex: 0,
    provider: req.body.provider || undefined,
    variant: req.body.variant || undefined,
    filename: req.file.originalname,
  });
  await recordAudit({ req, action: ACTIONS.OCR_PROCESS, entity: 'OcrResult', metadata: { provider: result.ocr.provider } });
  ok(res, result);
});
