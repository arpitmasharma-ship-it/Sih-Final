const crypto = require('crypto');
const Counter = require('../models/Counter');

async function getNextSequence(key, prefix, pad = 5) {
  const c = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${new Date().getFullYear()}-${String(c.seq).padStart(pad, '0')}`;
}

function sha256Hex(bufOrString) {
  return crypto.createHash('sha256').update(bufOrString).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { getNextSequence, sha256Hex, randomToken };
