const express = require('express');
const { body, param } = require('express-validator');
const guestQuotesController = require('../controllers/guestQuotesController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for public guest quote submissions (5 per 15 min per IP)
const guestQuoteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many quote requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==================== PUBLIC ====================

// Submit a guest quote request (no auth required)
router.post('/',
    guestQuoteLimiter,
    [
        body('guest_name').trim().notEmpty().withMessage('Name is required').escape(),
        body('guest_email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('guest_phone').trim().notEmpty().withMessage('Phone number is required').escape(),
        body('service_id').isUUID().withMessage('Valid service ID is required'),
        body('address').trim().notEmpty().withMessage('Address is required').escape(),
        body('city').trim().notEmpty().withMessage('City is required').escape(),
        body('state').trim().notEmpty().withMessage('Province is required').escape(),
        body('zip_code').trim().notEmpty().withMessage('Postal code is required').escape(),
        body('description').optional().trim().escape(),
        body('preferred_date').optional({ values: 'falsy' }).isDate().withMessage('Valid date required'),
        body('preferred_time').optional({ values: 'falsy' }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time required'),
        validate,
    ],
    guestQuotesController.submitGuestQuote
);

// ==================== PRO ====================

// Get assigned guest quote requests for the current pro
// MUST be defined before /:id to avoid route collision
router.get('/pro/assignments',
    authenticate,
    authorize('pro'),
    guestQuotesController.getProGuestQuoteAssignments
);

// Get single guest quote assignment detail for the current pro
router.get('/pro/assignments/:id',
    authenticate,
    authorize('pro'),
    [param('id').isUUID(), validate],
    guestQuotesController.getProGuestQuoteAssignmentDetail
);

// ==================== ADMIN ====================

// List all guest quote requests
router.get('/',
    authenticate,
    authorize('admin'),
    guestQuotesController.getGuestQuotes
);

// Get single guest quote request
router.get('/:id',
    authenticate,
    authorize('admin'),
    [param('id').isUUID(), validate],
    guestQuotesController.getGuestQuote
);

// Update guest quote request (notes, status)
router.patch('/:id',
    authenticate,
    authorize('admin'),
    [param('id').isUUID(), validate],
    guestQuotesController.updateGuestQuote
);

// Send quote to guest via email
router.post('/:id/send-quote',
    authenticate,
    authorize('admin'),
    [
        param('id').isUUID(),
        body('quoted_price').optional().isFloat({ min: 0.01 }).withMessage('Valid price is required'),
        body('message').optional().trim(),
        validate,
    ],
    guestQuotesController.sendQuoteToGuest
);

// Assign a pro to the guest quote request
router.post('/:id/assign-pro',
    authenticate,
    authorize('admin'),
    [
        param('id').isUUID(),
        body('pro_id').isUUID().withMessage('Valid pro ID is required'),
        validate,
    ],
    guestQuotesController.assignProToGuestQuote
);

// Create Stripe payment link and send to guest
router.post('/:id/send-payment-link',
    authenticate,
    authorize('admin'),
    [param('id').isUUID(), validate],
    guestQuotesController.sendPaymentLink
);

// Send invoice to guest via email
router.post('/:id/send-invoice',
    authenticate,
    authorize('admin'),
    [param('id').isUUID(), validate],
    guestQuotesController.sendInvoiceToGuest
);

// Pro submits their quotation for a guest request
router.post('/:id/pro-submit-quote',
    authenticate,
    authorize('pro'),
    [
        param('id').isUUID(),
        body('quoted_price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
        body('description').optional().trim(),
        body('estimated_duration').optional().trim(),
        body('warranty_info').optional().trim(),
        body('notes').optional().trim(),
        validate,
    ],
    guestQuotesController.proSubmitGuestQuote
);

module.exports = router;
