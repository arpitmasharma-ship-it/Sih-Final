const mongoose = require('mongoose');

const declarationSchema = new mongoose.Schema(
  {
    field: String,
    value: String,
    confidence: Number,
    humanVerified: { type: Boolean, default: false },
    bbox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    sourceImage: String,
    sourceImageIndex: Number,
    status: { type: String, enum: ['DETECTED', 'NOT_DETECTED', 'MANUAL'] },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: [true, 'Product name is required'], trim: true, index: true },
    brandName: { type: String, trim: true },
    category: {
      type: String,
      enum: [
        'FOOD',
        'BEVERAGE',
        'PERSONAL_CARE',
        'HOUSEHOLD',
        'PHARMA_OTC',
        'AGRI_INPUTS',
        'ELECTRONICS',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    barcode: { type: String, trim: true, index: true },

    manufacturer: String,
    packer: String,
    importer: String,

    location: {
      state: String,
      district: String,
      city: String,
    },

    images: [
      {
        url: String,
        publicId: String,
        label: String,
        provider: String,
      },
    ],

    // Latest snapshot of extracted declarations (keyed by FIELD key)
    extractedDeclarations: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

    complianceStatus: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW'],
      index: true,
    },
    complianceScore: { type: Number, min: 0, max: 100 },

    latestInspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

productSchema.index({ productName: 'text', manufacturer: 'text', brandName: 'text' });

module.exports = mongoose.model('Product', productSchema);
