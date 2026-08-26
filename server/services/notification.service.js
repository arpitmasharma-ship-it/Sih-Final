const Notification = require('../models/Notification');

async function notify({ recipient, recipients, title, message, type = 'INFO', link }) {
  const list = recipients || (recipient ? [recipient] : []);
  if (!list.length) return [];
  return Notification.insertMany(
    list.map((r) => ({ recipient: typeof r === 'object' ? r._id : r, title, message, type, link })),
    { ordered: false }
  ).catch((e) => {
    console.error('notify failed:', e.message);
    return [];
  });
}

async function notifyAdmins({ title, message, type, link }) {
  const User = require('../models/User');
  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
  return notify({ recipients: admins.map((a) => a._id), title, message, type, link });
}

async function listForUser(userId, { unreadOnly, limit = 30 } = {}) {
  const filter = { recipient: userId };
  if (unreadOnly) filter.isRead = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

async function markRead(userId, ids) {
  // Empty array or undefined means "mark all as read"
  const filter = { recipient: userId };
  if (Array.isArray(ids) && ids.length > 0) {
    filter._id = { $in: ids };
  }
  await Notification.updateMany(filter, { isRead: true });
}

module.exports = { notify, notifyAdmins, listForUser, markRead };
