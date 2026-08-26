const mongoose = require('mongoose');

const ruleHistorySchema = new mongoose.Schema(
  {
    version: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    changeSummary: String,
    snapshot: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const complianceRuleSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'MANDATORY_DECLARATION',
        'NET_QUANTITY',
        'MRP',
        'MANUFACTURER_INFO',
        'PACKER_INFO',
        'IMPORTER_INFO',
        'COUNTRY_OF_ORIGIN',
        'CONSUMER_CARE',
        'DATE_DECLARATIONS',
        'UNIT_DECLARATIONS',
        'READABILITY',
        'FONT_SIZE',
        'PLACEMENT',
        'FORMATTING',
        'MISLEADING_DECLARATIONS',
        'OTHER',
      ],
      index: true,
    },
    applicableTo: {
      packageTypes: [{ type: String }],
      importedOnly: { type: Boolean, default: false },
      notes: String,
    },
    // Alternative field keys - any one satisfies presence checks
    requiredFields: [String],
    validationType: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    // Advisory rules surface warnings but NEVER flip the final compliance status
    advisory: { type: Boolean, default: false, index: true },
    enabled: { type: Boolean, default: true },

    // Legal traceability
    sourceReference: { type: String, required: true },
    sourceUrl: String,
    effectiveDate: { type: Date },
    version: { type: String, default: '1.0.0' },
    amendmentNote: String,
    disclaimer: {
      type: String,
      default:
        'Automated check. Final determination rests with the competent authority under the Legal Metrology Act, 2009.',
    },

    history: [ruleHistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ComplianceRule', complianceRuleSchema);
