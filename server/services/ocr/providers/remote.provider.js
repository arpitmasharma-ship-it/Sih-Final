/**
 * Remote OCR provider - calls an independent OCR microservice
 * (bundled Python/PaddleOCR service in `ocr-service/`, or any compatible endpoint:
 * Google Vision / Azure / AWS Textract adapters can be added there).
 *
 * Contract: POST {serviceUrl}/ocr/process  (multipart: image)
 * Response: { rawText, lines:[{text,confidence,bbox}], imageMeta }
 */
const axios = require('axios');
const config = require('../../../config/env');

async function recognize({ buffer, filename = 'image.png' } = {}) {
  if (!config.ocr.serviceUrl) throw new Error('OCR_SERVICE_URL is not configured');

  const form = new FormData();
  form.append('image', new Blob([buffer]), filename);

  const res = await axios.post(
    `${config.ocr.serviceUrl.replace(/\/$/, '')}/ocr/process`,
    form,
    {
      headers: config.ocr.apiKey ? { 'x-api-key': config.ocr.apiKey } : {},
      timeout: 60000,
      maxBodyLength: Infinity,
    }
  );

  const d = res.data?.data || res.data;
  return {
    provider: 'remote',
    simulated: false,
    rawText: d.rawText || '',
    lines: (d.lines || []).map((l) => ({
      text: l.text,
      confidence: l.confidence,
      bbox: l.bbox
        ? {
            x: l.bbox.x ?? l.bbox.x0 ?? 0,
            y: l.bbox.y ?? l.bbox.y0 ?? 0,
            width: l.bbox.width ?? (l.bbox.x1 !== undefined ? l.bbox.x1 - l.bbox.x0 : undefined),
            height: l.bbox.height ?? (l.bbox.y1 !== undefined ? l.bbox.y1 - l.bbox.y0 : undefined),
          }
        : null,
    })),
    imageMeta: d.imageMeta || {},
  };
}

module.exports = { recognize };
