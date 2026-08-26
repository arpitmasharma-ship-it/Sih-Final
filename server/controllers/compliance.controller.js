const inspectionController = require('./inspection.controller');

// Compliance endpoints delegate to inspection controller
exports.check = inspectionController.check;
exports.getByInspection = inspectionController.getByInspection;
