const userService = require('../services/user.service');
const { ok, created, paginated } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { objectIdOrThrow } = require('../utils/db');
const { recordAudit, ACTIONS } = require('../services/audit.service');
const notificationService = require('../services/notification.service');

exports.listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '12', 10));
  const skip = (page - 1) * limit;
  const result = await userService.listUsers({
    page,
    limit,
    skip,
    q: req.query.q,
    role: req.query.role,
    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
  });
  paginated(res, result);
});

exports.createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user);
  await recordAudit({
    req,
    action: ACTIONS.USER_CREATED,
    entity: 'User',
    entityId: user._id,
    metadata: { role: user.role },
  });
  created(res, { user }, 'User created');
});

exports.updateUser = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'user id');
  const user = await userService.updateUser(id, req.body, req.user);
  await recordAudit({
    req,
    action: Object.values(ACTIONS).includes('USER_UPDATED') ? ACTIONS.USER_UPDATED : 'USER_UPDATED',
    entity: 'User',
    entityId: id,
    metadata: { updates: Object.keys(req.body) },
  });
  if (req.body.isActive === false) {
    await recordAudit({ req, action: 'USER_DEACTIVATED', entity: 'User', entityId: id });
  }
  if (req.body.role && req.body.role !== user.role) {
    void 0;
  }
  ok(res, { user }, { message: 'User updated' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'user id');
  if (!req.body.newPassword || req.body.newPassword.length < 8) {
    throw ApiError.badRequest('newPassword must be at least 8 characters');
  }
  await userService.adminResetPassword(id, req.body.newPassword);
  await notificationService.notify({
    recipient: id,
    title: 'Password reset by administrator',
    message: 'Your password has been reset by an administrator. Contact them for the temporary password.',
    type: 'WARN',
  });
  await recordAudit({ req, action: 'PASSWORD_RESET', entity: 'User', entityId: id });
  ok(res, null, { message: 'Password reset' });
});

exports.getMe = asyncHandler(async (req, res) => {
  ok(res, { user: req.user.toSafeJSON() });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'department', 'state', 'district'];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  });
  await req.user.save();
  ok(res, { user: req.user.toSafeJSON() }, { message: 'Profile updated' });
});
