const { body } = require('express-validator');

const RULE_CATEGORIES = [
  'MANDATORY_DECLARATION', 'NET_QUANTITY', 'MRP', 'MANUFACTURER_INFO', 'PACKER_INFO',
  'IMPORTER_INFO', 'COUNTRY_OF_ORIGIN', 'CONSUMER_CARE', 'DATE_DECLARATIONS',
  'UNIT_DECLARATIONS', 'READABILITY', 'FONT_SIZE', 'PLACEMENT', 'FORMATTING',
  'MISLEADING_DECLARATIONS', 'OTHER',
];
const VALIDATION_TYPES = [
  'MANDATORY_FIELD', 'MRP', 'NET_QUANTITY', 'DATE', 'MANUFACTURER', 'IMPORTER',
  'COUNTRY_OF_ORIGIN', 'CONSUMER_CARE', 'FONT_SIZE', 'READABILITY', 'PLACEMENT',
  'FORMATTING', 'MISLEADING_CLAIMS',
];

const createRule = [
  body('ruleCode').trim().matches(/^[A-Z0-9-]{4,40}$/).withMessage('ruleCode format: uppercase/dashes e.g. LM-PC-MRP-001'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('category').isIn(RULE_CATEGORIES).withMessage('invalid category'),
  body('validationType').isIn(VALIDATION_TYPES).withMessage('invalid validationType'),
  body('severity').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('requiredFields').optional().isArray(),
  body('sourceReference').trim().notEmpty().withMessage('Legal source reference is mandatory'),
  body('version').trim().notEmpty().withMessage('version is required'),
];

// On update every field is optional; unknown keys are ignored by the service
const updateRule = [];

module.exports = { createRule, updateRule, RULE_CATEGORIES, VALIDATION_TYPES };
