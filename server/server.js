// Disable SSL verification in dev (needed for Tesseract model download on some networks)
if ((process.env.NODE_ENV || 'development') !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const connectDB = require('./config/db');
const config = require('./config/env');
const logger = require('./utils/logger');
const { initCloudinary } = require('./config/cloudinary');

async function main() {
  await connectDB();

  if (initCloudinary()) {
    logger.info('Cloudinary configured - image uploads will use cloud storage.');
  } else {
    logger.warn('Cloudinary NOT configured - falling back to local disk storage (server/uploads).');
  }
  logger.info(`OCR provider: ${config.ocr.provider}`);

  const app = require('./app')();
  const server = app.listen(config.port, () => {
    logger.info(`API ready on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = () => {
    logger.info('Shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  logger.error('Fatal startup error:', e.message);
  process.exit(1);
});
