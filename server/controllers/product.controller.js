const Product = require('../models/Product');
const productService = require('../services/product.service');
const { ok, paginated, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { objectIdOrThrow } = require('../utils/db');
const { recordAudit, ACTIONS } = require('../services/audit.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  paginated(res, result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'product id');
  ok(res, await productService.getProduct(id));
});

// Manual product creation (without a scan) - metadata-only record
exports.create = asyncHandler(async (req, res) => {
  const product = await Product.create({
    productName: req.body.productName,
    brandName: req.body.brandName,
    category: req.body.category || 'OTHER',
    barcode: req.body.barcode,
    manufacturer: req.body.manufacturer,
    packer: req.body.packer,
    importer: req.body.importer,
    location: req.body.location || {},
    images: req.body.images || [],
    complianceStatus: req.body.complianceStatus || 'REQUIRES_REVIEW',
    createdBy: req.user._id,
  });
  await recordAudit({ req, action: ACTIONS.PRODUCT_UPDATED, entity: 'Product', entityId: product._id });
  created(res, { product }, 'Product created');
});

exports.update = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'product id');
  const product = await productService.updateProduct(id, req.body);
  await recordAudit({ req, action: ACTIONS.PRODUCT_UPDATED, entity: 'Product', entityId: id });
  ok(res, { product }, { message: 'Product updated' });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'product id');
  await productService.deleteProduct(id);
  await recordAudit({ req, action: ACTIONS.PRODUCT_DELETED, entity: 'Product', entityId: id });
  ok(res, null, { message: 'Product deleted' });
});
