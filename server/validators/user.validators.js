const { body } = require('express-validator');

const createUser = [
  body('name').trim().notEmpty(),
  body('email').trim().isEmail().normalizeEmail(),
  body('role').optional().isIn(['ADMIN', 'INSPECTOR', 'ANALYST']),
  body('password').optional().isLength({ min: 8 }).withMessage('Min 8 chars'),
];

const updateUser = [
  body('role').optional().isIn(['ADMIN', 'INSPECTOR', 'ANALYST']),
  body('isActive').optional().isBoolean(),
  body('name').optional().trim().isLength({ max: 80 }),
];

module.exports = { createUser, updateUser };
