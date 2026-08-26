const authService = require('../services/auth.service');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  await recordAudit({ req, action: ACTIONS.REGISTER, entity: 'User', entityId: user._id });
  ok(res, { user: user.toSafeJSON() }, { status: 201, message: 'Registration successful' });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const { user, token } = await authService.login(email, password);
    const { sendAuthCookie } = require('../utils/token');
    sendAuthCookie(res, token);
    await recordAudit({ req, action: ACTIONS.LOGIN, entity: 'User', entityId: user._id });
    ok(res, { user: user.toSafeJSON() }, { message: 'Logged in successfully' });
  } catch (e) {
    if (e.statusCode === 401) {
      await recordAudit({
        req,
        action: ACTIONS.LOGIN_FAILED,
        entity: 'User',
        metadata: { email },
      });
    }
    throw e;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  const { clearAuthCookie } = require('../utils/token');
  clearAuthCookie(res);
  if (req.user) {
    await recordAudit({ req, action: ACTIONS.LOGOUT, entity: 'User', entityId: req.user._id });
  }
  ok(res, null, { message: 'Logged out' });
});

exports.currentUser = asyncHandler(async (req, res) => {
  ok(res, { user: req.user.toSafeJSON() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user, currentPassword, newPassword);
  await recordAudit({ req, action: ACTIONS.PASSWORD_CHANGE, entity: 'User', entityId: req.user._id });
  ok(res, null, { message: 'Password updated' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  await recordAudit({
    req,
    action: ACTIONS.PASSWORD_RESET_REQUEST,
    entity: 'User',
    metadata: { email: req.body.email },
  });
  ok(res, result, { message: result.message });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  ok(res, null, { message: 'Password has been reset. You can log in now.' });
});
