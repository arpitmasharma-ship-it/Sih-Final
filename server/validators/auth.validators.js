const { body } = require('express-validator');

const register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid e-mail required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const login = [
  body('email').trim().isEmail().withMessage('Valid e-mail required').normalizeEmail(),
  body('password').notEmpty(),
];

const changePassword = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const resetRequest = [body('email').trim().isEmail().normalizeEmail()];
const resetConfirm = [
  body('token').trim().notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Min 8 characters'),
];

module.exports = { register, login, changePassword, resetRequest, resetConfirm };
