const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const COOKIE_NAME = 'lmcc_token';

async function protect(req, res, next) {
  try {
    let token =
      req.cookies && req.cookies[COOKIE_NAME] ? req.cookies[COOKIE_NAME] : null;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) throw ApiError.unauthorized('Not authenticated. Please log in.');

    let payload;
    try {
      payload = require('jsonwebtoken').verify(
        token,
        require('../config/env').jwtSecret
      );
    } catch {
      throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account not found or deactivated.');
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not allowed to perform this action`)
      );
    }
    next();
  };

module.exports = { protect, authorize, COOKIE_NAME };
