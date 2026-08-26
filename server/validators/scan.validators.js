const { body } = require('express-validator');

const completeScan = [
  body('productName').trim().notEmpty().withMessage('productName is required'),
  body('images').isArray({ min: 1 }).withMessage('At least one image is required'),
  body('images.*.url').optional().isString(),
  body('declarations').optional().isObject(),
  body('humanCorrections')
    .optional()
    .customSanitizer((v) => (Array.isArray(v) ? v : [])),
  body('location.state').optional().trim(),
  body('location.district').optional().trim(),
  body('location.city').optional().trim(),
];

const review = [
  body('decision')
    .isIn(['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW', 'PASS_AFTER_REVIEW', 'VIOLATION_CONFIRMED'])
    .withMessage('Invalid review decision'),
  body('remarks').optional().trim().isLength({ max: 2000 }),
];

const check = [body('declarations').optional().isObject(), body('ocrMeta').optional().isObject()];

module.exports = { completeScan, review, check };
