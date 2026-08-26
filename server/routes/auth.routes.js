const router = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
const validate = require('../middleware/validateMiddleware');
const v = require('../validators/auth.validators');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, v.register, validate, authCtrl.register);
router.post('/login', authLimiter, v.login, validate, authCtrl.login);
router.post('/logout', authCtrl.logout);
router.post(
  '/forgot-password',
  authLimiter,
  v.resetRequest,
  validate,
  authCtrl.forgotPassword
);
router.post('/reset-password', authLimiter, v.resetConfirm, validate, authCtrl.resetPassword);

// Authenticated routes
router.use(protect);
router.get('/current-user', authCtrl.currentUser);
router.put('/change-password', v.changePassword, validate, authCtrl.changePassword);

module.exports = router;
