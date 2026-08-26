const scanController = require('./scan.controller');

// Standalone OCR endpoint (single image) - reuses scan controller logic
exports.process = scanController.ocrProcessSingle;
