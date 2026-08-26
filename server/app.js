
const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // allow server-to-server/no-origin (curl, mobile webview) plus configured origins
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!config.isTest) {
    app.use(morgan(config.isProd ? 'combined' : 'dev'));
  }

  // Local asset storage fallback
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'reports'), { recursive: true });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  // Health check
  app.get('/health', (req, res) =>
    res.json({
      status: 'ok',
      env: config.env,
      time: new Date().toISOString(),
      ocrProvider: config.ocr.provider,
      storage: config.cloudinary.enabled ? 'cloudinary' : 'local',
    })
  );

  app.get('/', (req, res) =>
    res.json({ name: 'LMCC API', version: '1.0.0', docs: '/api' })
  );

  app.use('/api', require('./routes'));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
