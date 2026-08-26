const Inspection = require('../models/Inspection');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { getPagination } = require('../utils/pagination');
const { escapeRegex } = require('../utils/db');

async function listProducts(query) {
  const { page, limit, skip } = getPagination(query, { limit: 12 });
  const filter = {};
  if (query.status) filter.complianceStatus = query.status;
  if (query.category) filter.category = query.category;
  if (query.district) filter['location.district'] = new RegExp(escapeRegex(query.district), 'i');
  if (query.state) filter['location.state'] = new RegExp(escapeRegex(query.state), 'i');
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [
      { productName: rx },
      { manufacturer: rx },
      { brandName: rx },
      { barcode: rx },
      { importer: rx },
      { packer: rx },
    ];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name')
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

async function getProduct(id) {
  const product = await Product.findById(id).populate('createdBy', 'name email').lean();
  if (!product) throw ApiError.notFound('Product not found');
  const inspections = await Inspection.find({ productId: id })
    .sort({ createdAt: -1 })
    .select('-complianceChecks')
    .populate('inspectorId', 'name')
    .lean();
  return { ...product, inspections };
}

async function updateProduct(id, updates) {
  const allowed = ['productName', 'brandName', 'category', 'barcode', 'manufacturer', 'packer', 'importer', 'location'];
  const update = {};
  allowed.forEach((k) => {
    if (updates[k] !== undefined) update[k] = updates[k];
  });
  const product = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw ApiError.notFound('Product not found');
  await Inspection.deleteMany({ productId: id });
  return true;
}

module.exports = { listProducts, getProduct, updateProduct, deleteProduct };
