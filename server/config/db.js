const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

// Fix for Node.js on Windows/certain ISPs where querySrv fails on local DNS
if (config.mongooseUri && config.mongooseUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch {}
}

async function connectDB() {
  mongoose.set('strictQuery', true);
  const isAtlas = config.mongooseUri && (config.mongooseUri.includes('.mongodb.net') || config.mongooseUri.startsWith('mongodb+srv://'));
  const options = {
    serverSelectionTimeoutMS: 10000,
  };
  if (isAtlas) {
    options.tls = true;
    options.tlsAllowInvalidCertificates = true;
  }
  await mongoose.connect(config.mongooseUri, options);
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
