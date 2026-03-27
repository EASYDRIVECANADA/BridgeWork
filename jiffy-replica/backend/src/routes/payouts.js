const express = require('express');
const router = express.Router();
const payoutsController = require('../controllers/payoutsController');
const { authenticate, authorize } = require('../middleware/auth');

// Pro endpoints
router.get('/my-earnings', authenticate, authorize('pro'), payoutsController.getMyEarnings);
router.get('/my-withdrawals', authenticate, authorize('pro'), payoutsController.getMyWithdrawals);
router.get('/withdrawal-settings', authenticate, authorize('pro'), payoutsController.getWithdrawalSettings);
router.post('/withdrawals/request', authenticate, authorize('pro'), payoutsController.requestWithdrawal);
router.put('/payout-method', authenticate, authorize('pro'), payoutsController.updatePayoutMethod);

// Admin endpoints
router.get('/admin/pending', authenticate, authorize('admin'), payoutsController.adminGetPendingPayouts);
router.get('/admin/history', authenticate, authorize('admin'), payoutsController.adminGetPayoutHistory);
router.get('/admin/pro/:proProfileId', authenticate, authorize('admin'), payoutsController.adminGetProDetail);
router.get('/admin/withdrawals', authenticate, authorize('admin'), payoutsController.adminGetWithdrawalRequests);
router.get('/admin/settings', authenticate, authorize('admin'), payoutsController.adminGetPayoutSettings);
router.put('/admin/settings', authenticate, authorize('admin'), payoutsController.adminUpdatePayoutSettings);
router.get('/admin/calendar', authenticate, authorize('admin'), payoutsController.adminGetPayoutCalendar);
router.post('/admin/calendar', authenticate, authorize('admin'), payoutsController.adminCreatePayoutCalendarEntry);
router.patch('/admin/calendar/:calendarEntryId', authenticate, authorize('admin'), payoutsController.adminUpdatePayoutCalendarEntry);
router.delete('/admin/calendar/:calendarEntryId', authenticate, authorize('admin'), payoutsController.adminDeletePayoutCalendarEntry);
router.patch('/admin/withdrawals/:withdrawalRequestId/approve', authenticate, authorize('admin'), payoutsController.adminApproveWithdrawalRequest);
router.patch('/admin/withdrawals/:withdrawalRequestId/reject', authenticate, authorize('admin'), payoutsController.adminRejectWithdrawalRequest);
router.post('/admin/withdrawals/:withdrawalRequestId/process', authenticate, authorize('admin'), payoutsController.adminProcessWithdrawalRequest);
router.post('/admin/record-payout', authenticate, authorize('admin'), payoutsController.adminRecordPayout);

module.exports = router;
