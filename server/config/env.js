const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProd = (process.env.NODE_ENV || 'development') === 'production';

if (isProd) {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`FATAL: missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  mongooseUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lmcc',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    enabled: cloudinaryEnabled,
  },
  ocr: {
    provider: (process.env.OCR_PROVIDER || (isProd ? 'tesseract' : 'demo')).toLowerCase(),
    serviceUrl: process.env.OCR_SERVICE_URL || '',
    apiKey: process.env.OCR_API_KEY || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'LMCC Platform <no-reply@lmcc.gov.in>',
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
  },
  exposeResetTokenInDev:
    !isProd && process.env.EXPOSE_RESET_TOKEN_IN_DEV === 'true',
  serverBaseUrl:
    process.env.SERVER_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`,
};
