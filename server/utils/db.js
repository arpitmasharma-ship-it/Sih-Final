const mongoose = require('mongoose');
const ApiError = require('./ApiError');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Validates and returns ObjectId or throws 400
function objectIdOrThrow(id, label = 'id') {
  if (!isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`);
  return id;
}

function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { isValidObjectId, objectIdOrThrow, escapeRegex };
