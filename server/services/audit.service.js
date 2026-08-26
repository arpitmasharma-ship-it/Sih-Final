const AuditLog = require('../models/AuditLog');

/**
 * Record an audit entry. Never throws into the request flow.
 */
async function recordAudit({ req, action, entity, entityId, metadata }) {
  try {
    await AuditLog.create({
      user: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : 'anonymous',
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      ipAddress:
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        '',
      userAgent: req.headers['user-agent'] || '',
      metadata: metadata || {},
    });
  } catch (e) {
    console.error('[AUDIT] failed to record:', e.message);
  }
}

const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PRODUCT_SCAN: 'PRODUCT_SCAN',
  OCR_PROCESS: 'OCR_PROCESS',
  OCR_CORRECTION: 'OCR_CORRECTION',
  COMPLIANCE_EVALUATION: 'COMPLIANCE_EVALUATION',
  INSPECTION_CREATED: 'INSPECTION_CREATED',
  INSPECTION_REVIEWED: 'INSPECTION_REVIEWED',
  INSPECTION_UPDATED: 'INSPECTION_UPDATED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  RULE_CREATED: 'RULE_CREATED',
  RULE_UPDATED: 'RULE_UPDATED',
  RULE_DELETED: 'RULE_DELETED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
};

module.exports = { recordAudit, ACTIONS };
