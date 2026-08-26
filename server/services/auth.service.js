const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');
const config = require('../config/env');
const crypto = require('crypto');
const { sendMail } = require('../config/nodemailer');
const { ROLES } = require('../constants');

async function register({ name, email, password }) {
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this e-mail already exists');

  // Public registration removed — accounts are provisioned by ADMIN only.
  throw ApiError.forbidden('Public registration is disabled. Contact your administrator to create an account.');
}

async function login(email, password) {
  const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid e-mail or password');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated. Contact the administrator.');

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Invalid e-mail or password');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  return { user, token: signToken(user) };
}

async function changePassword(user, currentPassword, newPassword) {
  const full = await User.findById(user._id).select('+password');
  const okPw = await full.comparePassword(currentPassword);
  if (!okPw) throw ApiError.unauthorized('Current password is incorrect');
  full.password = newPassword;
  await full.save();
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  // Always respond generically to avoid account enumeration
  const generic = {
    message: 'If that e-mail is registered, a reset link has been sent.',
  };
  if (!user) return generic;

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const mailSent = (
    await sendMail({
      to: user.email,
      subject: 'LMCC - Password Reset',
      text: `Your password reset token: ${token}\nValid for 30 minutes.`,
    })
  ).delivered !== false;

  // Dev convenience when SMTP is not configured
  if (!mailSent && config.exposeResetTokenInDev && !config.isProd) {
    return { ...generic, devResetToken: token };
  }
  return generic;
}

async function resetPassword(token, newPassword) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
}

module.exports = { register, login, changePassword, requestPasswordReset, resetPassword };
