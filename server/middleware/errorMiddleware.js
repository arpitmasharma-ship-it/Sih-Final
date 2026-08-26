const ApiError = require('../utils/ApiError');
const config = require('../config/env');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler - never leaks stack traces to clients in production
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for: ${field}`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  }

  if (statusCode >= 500) logger.error('[ERROR]', config.isProd ? err.message : err.stack || err);

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && config.isProd ? 'Something went wrong. Please try again.' : message,
    ...(config.isProd ? {} : err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
