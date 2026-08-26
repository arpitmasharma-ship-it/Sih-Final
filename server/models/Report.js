const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportId: { type: String, unique: true, index: true },
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
      index: true,
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    fileUrl: String,
    publicId: String,
    storageProvider: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
    checksumSha256: String,
    sizeBytes: Number,

    snapshot: {
      productName: String,
      finalStatus: String,
      complianceScore: Number,
      violationsCount: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
