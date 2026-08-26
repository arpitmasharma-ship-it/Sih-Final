const router = require('express').Router();
const productCtrl = require('../controllers/product.controller');
const inspectionCtrl = require('../controllers/inspection.controller');
const reportCtrl = require('../controllers/report.controller');
const scanCtrl = require('../controllers/scan.controller');
const ocrCtrl = require('../controllers/ocr.standalone.controller');
const complianceCtrl = require('../controllers/compliance.controller');
const dashboardCtrl = require('../controllers/dashboard.controller');
const ruleCtrl = require('../controllers/rule.controller');
const auditCtrl = require('../controllers/audit.controller');
const notificationCtrl = require('../controllers/notification.controller');
const searchCtrl = require('../controllers/search.controller');

const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { uploadImages, uploadSingle, multerErrorHandler } = require('../middleware/uploadMiddleware');
const { apiLimiter } = require('../middleware/rateLimiters');
const scanV = require('../validators/scan.validators');
const ruleV = require('../validators/rule.validators');
const ApiError = require('../utils/ApiError');

// ---------------- Auth ----------------
router.use('/auth', require('./auth.routes'));

// Everything below requires a valid session
router.use(protect);

function objectIdParam(name = 'id') {
  return (req, res, next) => {
    const id = req.params[name];
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return next(ApiError.badRequest(`Invalid ObjectId for '${name}'`));
    }
    next();
  };
}

// ---------------- Scan / OCR / Compliance ----------------
router.use(apiLimiter);
router.post(
  '/scan/ocr',
  authorize('ADMIN', 'INSPECTOR'),
  uploadImages,
  multerErrorHandler,
  scanCtrl.scanOcr
);
router.post(
  '/scan/complete',
  authorize('ADMIN', 'INSPECTOR'),
  scanV.completeScan,
  validate,
  scanCtrl.completeScan
);
router.post(
  '/ocr/process',
  authorize('ADMIN', 'INSPECTOR', 'ANALYST'),
  uploadSingle,
  multerErrorHandler,
  ocrCtrl.process
);
router.post('/compliance/check', scanV.check, validate, complianceCtrl.check);
router.get('/compliance/:inspectionId', objectIdParam('inspectionId'), complianceCtrl.getByInspection);

// ---------------- Products ----------------
router.get('/products', productCtrl.list);
router.get('/products/:id', objectIdParam('id'), productCtrl.getOne);
router.post('/products', authorize('ADMIN', 'INSPECTOR'), productCtrl.create);
router.put('/products/:id', authorize('ADMIN', 'INSPECTOR'), objectIdParam('id'), productCtrl.update);
router.delete('/products/:id', authorize('ADMIN'), objectIdParam('id'), productCtrl.remove);

// ---------------- Inspections ----------------
router.get('/inspections', inspectionCtrl.list);
router.get('/inspections/:id', objectIdParam('id'), inspectionCtrl.getOne);
router.post('/inspections', authorize('ADMIN', 'INSPECTOR'), inspectionCtrl.create);
router.put(
  '/inspections/:id/review',
  authorize('ADMIN', 'INSPECTOR'),
  objectIdParam('id'),
  scanV.review,
  validate,
  inspectionCtrl.review
);
router.put(
  '/inspections/:id/notes',
  authorize('ADMIN', 'INSPECTOR'),
  objectIdParam('id'),
  inspectionCtrl.updateNotes
);

// ---------------- Reports ----------------
router.post('/reports', reportCtrl.create);
router.get('/reports', reportCtrl.list);
// `:id` may be an ObjectId or a human reference (LMC-RPT-XXXXXX); controller validates
router.get('/reports/:id', reportCtrl.getOne);
router.get('/reports/:id/pdf', reportCtrl.getPdf);
router.get('/reports/:id/export.json', reportCtrl.exportJson);

// ---------------- Rules (read: all; write: admin) ----------------
router.get('/rules', ruleCtrl.list);
router.post('/rules/sync', authorize('ADMIN'), ruleCtrl.sync);
router.post('/rules', authorize('ADMIN'), ruleV.createRule, validate, ruleCtrl.create);
router.put('/rules/:id', authorize('ADMIN'), ruleV.updateRule, validate, ruleCtrl.update);
router.delete('/rules/:id', authorize('ADMIN'), objectIdParam('id'), ruleCtrl.remove);

// ---------------- Dashboard / Analytics ----------------
router.get('/dashboard/summary', dashboardCtrl.summary);
router.get('/dashboard/trends', dashboardCtrl.trends);
router.get('/dashboard/violations', dashboardCtrl.violations);
router.get('/dashboard/districts', dashboardCtrl.districts);
router.get('/dashboard/inspectors', authorize('ADMIN'), dashboardCtrl.inspectors);
router.get('/dashboard/system', authorize('ADMIN'), dashboardCtrl.systemStats);

// ---------------- Users (admin) + profile ----------------
router.use('/users', require('./user.routes'));

// ---------------- Audit logs ----------------
router.get('/audit-logs/actions', authorize('ADMIN'), auditCtrl.actions);
router.get('/audit-logs', authorize('ADMIN'), auditCtrl.list);

// ---------------- Notifications ----------------
router.get('/notifications', notificationCtrl.list);
router.patch('/notifications/read', notificationCtrl.markRead);

// ---------------- Search ----------------
router.get('/search', searchCtrl.globalSearch);

module.exports = router;
