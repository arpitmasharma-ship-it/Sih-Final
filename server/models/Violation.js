const mongoose = require('mongoose');

// Violation schema - used as an embedded sub-document in Inspection.
// Every violation is fully explainable and traceable to a rule + evidence.
const violationSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true, index: true },
    ruleTitle: String,
    ruleDescription: String,
    category: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    field: String,

    extractedValue: String,
    expectedRequirement: String,
    reason: String,

    // Evidence
    evidenceImage: String,
    bbox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    confidence: Number,

    sourceReference: String,
    ruleVersion: String,

    explainability: {
      whatWasDetected: String,
      whatWasExpected: String,
      whyFlagged: String,
      ruleApplied: String,
      inspectorShouldVerify: String,
    },

    inspectorNotes: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'CONFIRMED', 'DISMISSED'], default: 'OPEN' },
    detectedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

module.exports = violationSchema;
