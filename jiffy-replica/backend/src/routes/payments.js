const express = require('express');
const { body } = require('express-validator');
const paymentsController = require('../controllers/paymentsController');
const stripeConnectController = require('../controllers/stripeConnectController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/create-intent', authenticate,
    [
        body('booking_id').isUUID(),
        validate
    ],
    paymentsController.createPaymentIntent
);

router.post('/webhook', express.raw({ type: 'application/json' }), paymentsController.handleWebhook);

router.get('/transactions', authenticate, paymentsController.getTransactionHistory);

router.post('/confirm-payment', authenticate,
    [
        body('payment_intent_id').notEmpty(),
        body('booking_id').isUUID(),
        validate
    ],
    paymentsController.confirmPayment
);

router.post('/capture', authenticate,
    [
        body('booking_id').isUUID(),
        validate
    ],
    paymentsController.capturePayment
);

router.post('/cancel-hold', authenticate,
    [
        body('booking_id').isUUID(),
        body('reason').optional().trim(),
        validate
    ],
    paymentsController.cancelHeldPayment
);

router.post('/dispute', authenticate,
    [
        body('booking_id').isUUID(),
        body('reason').trim().isLength({ min: 10 }),
        validate
    ],
    paymentsController.disputeBooking
);

// Stripe Connect routes (pro payouts)
router.post('/connect/onboard', authenticate, authorize('pro'), stripeConnectController.createConnectAccount);
router.get('/connect/status', authenticate, authorize('pro'), stripeConnectController.getConnectStatus);
router.get('/connect/dashboard', authenticate, authorize('pro'), stripeConnectController.getConnectDashboardLink);
router.get('/connect/earnings', authenticate, authorize('pro'), stripeConnectController.getProEarnings);
router.get('/connect/commission-rate', authenticate, stripeConnectController.getCommissionRate);

// Admin routes
router.get('/admin/revenue', authenticate, authorize('admin'), stripeConnectController.getAdminRevenue);
router.post('/admin/refund', authenticate, authorize('admin'),
    [
        body('transaction_id').isUUID(),
        body('reason').optional().trim(),
        validate
    ],
    stripeConnectController.processRefund
);

module.exports = router;
