const mongoose = require('mongoose');

/**
 * Durable asynchronous OCR job.
 *
 * Jobs are persisted in Mongo so in-flight OCR survives server restarts
 * (important on ephemeral hosts like Render's free tier where the process can
 * be recycled or hibernate while a job is still running). The client polls
 * GET /scan/ocr/:jobId against this collection.
 */
const ocrJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: { type: Number, min: 0, max: 1, default: 0 },
    imagesCount: { type: Number, default: 0 },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OcrJob', ocrJobSchema);
