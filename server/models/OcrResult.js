const mongoose = require('mongoose');
const { FIELDS } = require('../constants');

// One document per OCR run on a single image
const ocrLineSchema = new mongoose.Schema(
  {
    text: String,
    confidence: Number,
    bbox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  },
  { _id: false }
);

const ocrResultSchema = new mongoose.Schema(
  {
    inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', index: true },
    imageIndex: Number,
    imageUrl: String,
    provider: String,
    simulated: { type: Boolean, default: false },

    rawText: String,
    lines: [ocrLineSchema],
    fields: [
      {
        field: {
          type: String,
          enum: Object.values(FIELDS),
        },
        value: String,
        confidence: Number,
        humanVerified: { type: Boolean, default: false },
        rejected: { type: Boolean, default: false },
        status: { type: String, enum: ['DETECTED', 'NOT_DETECTED', 'MANUAL'], default: 'DETECTED' },
        bbox: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        sourceImage: String,
        sourceImageIndex: Number,
      },
    ],

    meanConfidence: Number,
    imageMeta: {
      width: Number,
      height: Number,
      preprocessed: Boolean,
      blurScore: Number,
      contrastScore: Number,
    },
    processingMs: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('OcrResult', ocrResultSchema);
