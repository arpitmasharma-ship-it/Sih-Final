const { v2: cloudinary } = require('cloudinary');
const config = require('./env');

function initCloudinary() {
  if (!config.cloudinary.enabled) return false;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  return true;
}

if (config.cloudinary.enabled) {
  initCloudinary();
}

module.exports = { cloudinary, initCloudinary };
