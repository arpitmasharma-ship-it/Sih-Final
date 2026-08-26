const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after express-validator chains; converts errors to 422 response
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(ApiError.unprocessable('Validation failed', details));
}

module.exports = validate;
