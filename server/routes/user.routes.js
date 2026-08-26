const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const v = require('../validators/user.validators');

router.use(protect);

// Self profile
router.get('/me', ctrl.getMe);
router.put('/me', ctrl.updateMe);

// Admin management
router.get('/', authorize('ADMIN'), ctrl.listUsers);
router.post('/', authorize('ADMIN'), v.createUser, validate, ctrl.createUser);
router.put('/:id', authorize('ADMIN'), v.updateUser, validate, ctrl.updateUser);
router.put('/:id/reset-password', authorize('ADMIN'), ctrl.resetPassword);

module.exports = router;
