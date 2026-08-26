const inspectionService = require('../services/inspection.service');
const Inspection = require('../models/Inspection');
const scanService = require('../services/scan.service');
const { ok, created, paginated } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { objectIdOrThrow } = require('../utils/db');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.check = asyncHandler(async (req, res) => {
  // Preview mode: evaluate declarations without saving anything
  const result = await scanService.previewCompliance(req.body.declarations || {}, req.body.ocrMeta || {});
  await recordAudit({
    req,
    action: ACTIONS.COMPLIANCE_EVALUATION,
    entity: 'Inspection',
    metadata: { preview: true, status: result.status },
  });
  ok(res, result);
});

exports.getByInspection = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.inspectionId, 'inspection id');
  const inspection = await inspectionService.getInspection(id);
  if (!inspection) throw ApiError.notFound('No compliance results for this inspection');
  ok(res, {
    checks: inspection.complianceChecks || [],
    violations: inspection.violations || [],
    warnings: inspection.warnings || [],
    scores: inspection.scores,
    summary: inspection.summary,
    status: inspection.finalStatus,
    engineVersion: inspection.engineVersion,
    declarations: inspection.declarations,
  });
});

exports.list = asyncHandler(async (req, res) => {
  const result = await inspectionService.listInspections(req.query);
  paginated(res, result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'inspection id');
  ok(res, await inspectionService.getInspection(id));
});

// POST /api/inspections - same as completeScan but kept for API symmetry
exports.create = asyncHandler(async (req, res) => {
  req.body.reviewOverride = req.body.finalStatus; // optional human override
  const { inspection, product } = await inspectionService.createInspection({
    user: req.user,
    payload: req.body,
  });
  await recordAudit({ req, action: ACTIONS.INSPECTION_CREATED, entity: 'Inspection', entityId: inspection._id });
  created(
    res,
    {
      inspectionId: inspection._id,
      inspectionRef: inspection.inspectionId,
      finalStatus: inspection.finalStatus,
      scores: inspection.scores,
      productId: product._id,
    },
    'Inspection saved'
  );
});

exports.review = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'inspection id');
  const { decision, remarks } = req.body;
  const inspection = await inspectionService.reviewInspection(id, {
    reviewer: req.user,
    decision,
    remarks,
  });
  await recordAudit({
    req,
    action: ACTIONS.INSPECTION_REVIEWED,
    entity: 'Inspection',
    entityId: id,
    metadata: { decision },
  });
  ok(res, { inspection }, { message: 'Review recorded' });
});

exports.updateNotes = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'inspection id');
  const inspection = await Inspection.findByIdAndUpdate(
    id,
    { inspectorNotes: req.body.inspectorNotes ?? '' },
    { new: true }
  );
  if (!inspection) throw ApiError.notFound('Inspection not found');
  await recordAudit({ req, action: ACTIONS.INSPECTION_UPDATED, entity: 'Inspection', entityId: id });
  ok(res, { inspection }, { message: 'Notes updated' });
});
