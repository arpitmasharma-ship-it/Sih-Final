const validateMandatoryField = require('./validateMandatoryField');
const validateMRP = require('./validateMRP');
const validateNetQuantity = require('./validateNetQuantity');
const validateDate = require('./validateDate');
const validateManufacturer = require('./validateManufacturer');
const validateImporter = require('./validateImporter');
const validateCountryOfOrigin = require('./validateCountryOfOrigin');
const validateConsumerCare = require('./validateConsumerCare');
const validateFontSize = require('./validateFontSize');
const validateReadability = require('./validateReadability');
const validatePlacement = require('./validatePlacement');
const validateFormatting = require('./validateFormatting');
const validateMisleadingClaims = require('./validateMisleadingClaims');

// validationType -> validator function
const VALIDATORS = {
  MANDATORY_FIELD: validateMandatoryField,
  MRP: validateMRP,
  NET_QUANTITY: validateNetQuantity,
  DATE: validateDate,
  MANUFACTURER: validateManufacturer,
  IMPORTER: validateImporter,
  COUNTRY_OF_ORIGIN: validateCountryOfOrigin,
  CONSUMER_CARE: validateConsumerCare,
  FONT_SIZE: validateFontSize,
  READABILITY: validateReadability,
  PLACEMENT: validatePlacement,
  FORMATTING: validateFormatting,
  MISLEADING_CLAIMS: validateMisleadingClaims,
};

module.exports = { VALIDATORS, validateMandatoryField };
