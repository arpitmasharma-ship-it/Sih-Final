const mongoose = require('mongoose');
const violationSchema = require('./Violation');

const complianceCheckSchema = new mongoose.Schema(
  {
    ruleCode: String,
    ruleTitle: String,
    category: String,
    validationType: String,
    status: { type: String, enum: ['PASS', 'FAIL', 'WARNING', 'NOT_APPLICABLE'] },
    severity: String,
    field: String,
    message: String,
    confidence: Number,
    manualVerificationRequired: Boolean,
    sourceReference: String,
    ruleVersion: String,
    explainability: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const inspectionSchema = new mongoose.Schema(
  {
    inspectionId: { type: String, unique: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    location: {
      state: String,
      district: String,
      city: String,
      addressLabel: String,
    },

    images: [
      {
        url: String,
        publicId: String,
        label: String,
        provider: String,
      },
    ],

    ocrResultIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OcrResult' }],

    // Corrected/human-verified declarations used for evaluation
    declarations: { type: mongoose.Schema.Types.Mixed, default: {} },

    humanCorrections: [
      {
        field: String,
        previousValue: String,
        newValue: String,
        correctedAt: { type: Date, default: Date.now },
      },
    ],

    complianceChecks: [complianceCheckSchema],
    violations: [violationSchema],
    warnings: [
      {
        ruleCode: String,
        field: String,
        message: String,
        severity: String,
      },
    ],
    scores: {
      overall: { type: Number, min: 0, max: 100 },
      mandatoryDeclarations: Number,
      readability: Number,
      dataCompleteness: Number,
    },
    summary: {
      totalChecks: Number,
      passed: Number,
      failed: Number,
      warnings: Number,
      notApplicable: Number,
      requiresManualVerification: Boolean,
    },

    engineVersion: String,

    inspectorNotes: { type: String, default: '' },
    finalStatus: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW', 'PASS_AFTER_REVIEW', 'VIOLATION_CONFIRMED'],
      index: true,
    },

    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewRemarks: String,
  },
  { timestamps: true }
);

inspectionSchema.index({ createdAt: -1 });
inspectionSchema.index({ 'location.district': 1 });
inspectionSchema.index({ finalStatus: 1 });

module.exports = mongoose.model('Inspection', inspectionSchema);
