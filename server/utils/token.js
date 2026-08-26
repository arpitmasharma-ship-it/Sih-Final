const jwt = require('jsonwebtoken');
const config = require('../config/env');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function sendAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('lmcc_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('lmcc_token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
}

module.exports = { signToken, sendAuthCookie, clearAuthCookie };
