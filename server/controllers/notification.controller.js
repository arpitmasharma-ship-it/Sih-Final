const notificationService = require('../services/notification.service');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const items = await notificationService.listForUser(req.user._id, {
    unreadOnly: req.query.unreadOnly === 'true',
    limit: Math.min(100, parseInt(req.query.limit || '30', 10)),
  });
  const unreadCount = await require('../models/Notification').countDocuments({
    recipient: req.user._id,
    isRead: false,
  });
  ok(res, { items, unreadCount });
});

exports.markRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : undefined;
  await notificationService.markRead(req.user._id, ids);
  ok(res, null, { message: 'Marked as read' });
});
