const express = require('express');
const router = express.Router();
const payoutsController = require('../controllers/payoutsController');
const { authenticate, authorize } = require('../middleware/auth');

// Pro endpoints
router.get('/my-earnings', authenticate, authorize('pro'), payoutsController.getMyEarnings);
router.put('/payout-method', authenticate, authorize('pro'), payoutsController.updatePayoutMethod);

// Admin endpoints
router.get('/admin/pending', authenticate, authorize('admin'), payoutsController.adminGetPendingPayouts);
router.get('/admin/history', authenticate, authorize('admin'), payoutsController.adminGetPayoutHistory);
router.get('/admin/pro/:proProfileId', authenticate, authorize('admin'), payoutsController.adminGetProDetail);
router.post('/admin/record-payout', authenticate, authorize('admin'), payoutsController.adminRecordPayout);

module.exports = router;
