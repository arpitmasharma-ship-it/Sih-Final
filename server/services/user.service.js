const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');

async function listUsers({ page, limit, skip, q, role, isActive }) {
  const filter = {};
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { district: rx }, { department: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items: items.map((u) => u.toSafeJSON()), total, page, limit };
}

async function createUser(payload, actor) {
  const exists = await User.findOne({ email: payload.email.toLowerCase() });
  if (exists) throw ApiError.conflict('E-mail already in use');

  // Prevent creating another admin — only one admin allowed
  if (payload.role === ROLES.ADMIN) {
    throw ApiError.forbidden('Cannot create additional admin accounts. One admin already exists.');
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password || 'Welcome@123',
    role: payload.role || ROLES.ANALYST,
    state: payload.state,
    district: payload.district,
  });
  return user.toSafeJSON();
}

async function updateUser(id, updates, actor) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  // Guard: don't let the last active admin be demoted/deactivated
  const demotingAdmin =
    user.role === 'ADMIN' &&
    ((updates.role && updates.role !== 'ADMIN') || updates.isActive === false);
  if (demotingAdmin) {
    const admins = await User.countDocuments({ role: 'ADMIN', isActive: true });
    if (admins <= 1) throw ApiError.badRequest('Cannot remove the last active admin');
  }

  const allowed = ['name', 'phone', 'department', 'state', 'district', 'role', 'isActive'];
  allowed.forEach((k) => {
    if (updates[k] !== undefined) user[k] = updates[k];
  });
  await user.save();
  return user.toSafeJSON();
}

async function adminResetPassword(id, newPassword) {
  const user = await User.findById(id).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  user.password = newPassword;
  await user.save();
}

module.exports = { listUsers, createUser, updateUser, adminResetPassword };
