const express = require('express');
const { body, param, query } = require('express-validator');
const bookingsController = require('../controllers/bookingsController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// ==================== PRO: QUOTATION ENDPOINTS ====================

// Get all quote requests available for pro to bid on
router.get('/pro/quote-requests',
    authenticate,
    authorize('pro'),
    bookingsController.getQuoteRequestsForPro
);

// Get single quote request details for pro
router.get('/pro/quote-requests/:id',
    authenticate,
    authorize('pro'),
    [
        param('id').isUUID(),
        validate
    ],
    bookingsController.getQuoteRequestDetail
);

// Submit quotation for a booking
router.post('/pro/quote-requests/:id/submit',
    authenticate,
    authorize('pro'),
    [
        param('id').isUUID(),
        body('quoted_price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
        body('description').optional().trim(),
        body('estimated_duration').optional().isInt({ min: 1 }),
        body('materials_included').optional().isBoolean(),
        body('warranty_info').optional().trim(),
        body('notes').optional().trim(),
        validate
    ],
    bookingsController.submitQuotation
);

// Get pro's own submitted quotations
router.get('/pro/my-quotations',
    authenticate,
    authorize('pro'),
    bookingsController.getMyQuotations
);

// ==================== ADMIN: QUOTE ASSIGNMENT MANAGEMENT ====================

// Get all pending quote requests that need pro assignment
router.get('/admin/pending-assignments',
    authenticate,
    authorize('admin'),
    bookingsController.getPendingAssignments
);

// Get available pros for a specific quote request
router.get('/admin/available-pros/:bookingId',
    authenticate,
    authorize('admin'),
    [
        param('bookingId').isUUID(),
        validate
    ],
    bookingsController.getAvailableProsForQuote
);

// Assign pros to a quote request
router.post('/admin/assign-pros',
    authenticate,
    authorize('admin'),
    [
        body('bookingId').isUUID(),
        body('proIds').isArray({ min: 1 }),
        validate
    ],
    bookingsController.assignProsToQuote
);

// Directly offer a free quote booking to a single pro (skips bidding)
router.post('/admin/direct-offer',
    authenticate,
    authorize('admin'),
    [
        body('bookingId').isUUID(),
        body('proId').isUUID(),
        validate
    ],
    bookingsController.directOfferToPro
);

// Get assignment details for a booking
router.get('/admin/assignments/:bookingId',
    authenticate,
    authorize('admin'),
    [
        param('bookingId').isUUID(),
        validate
    ],
    bookingsController.getBookingAssignments
);

// Remove a pro from a quote assignment
router.delete('/admin/assignments/:bookingId/:proId',
    authenticate,
    authorize('admin'),
    [
        param('bookingId').isUUID(),
        param('proId').isUUID(),
        validate
    ],
    bookingsController.removeProAssignment
);

// ==================== ADMIN: MULTI-QUOTATION MANAGEMENT ====================

// Get all bookings with their quotations
router.get('/admin/quotations',
    authenticate,
    authorize('admin'),
    bookingsController.getAllQuotations
);

// Select a winning quotation
router.put('/admin/quotations/:bookingId/select/:quotationId',
    authenticate,
    authorize('admin'),
    [
        param('bookingId').isUUID(),
        param('quotationId').isUUID(),
        body('admin_notes').optional().trim(),
        validate
    ],
    bookingsController.selectQuotation
);

// ==================== ADMIN: PROOFS & DISPUTES ====================

// Get all submitted proofs
router.get('/admin/proofs',
    authenticate,
    authorize('admin'),
    bookingsController.getAllProofs
);

// Get all disputed bookings
router.get('/admin/disputes',
    authenticate,
    authorize('admin'),
    bookingsController.getAllDisputes
);

// Get dispute details with messages
router.get('/admin/disputes/:bookingId',
    authenticate,
    authorize('admin'),
    [
        param('bookingId').isUUID(),
        validate
    ],
    bookingsController.getDisputeDetails
);

// ==================== ADMIN: LEGACY QUOTE REQUESTS (for backward compatibility) ====================

// Get all quote_pending bookings (Free Quote requests awaiting pricing)
router.get('/admin/quote-requests', 
    authenticate, 
    authorize('admin'),
    bookingsController.getQuoteRequests
);

// Set price for a quote request and release to pros
router.put('/admin/quote-requests/:id/set-price',
    authenticate,
    authorize('admin'),
    [
        param('id').isUUID(),
        body('total_price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
        body('admin_notes').optional().trim(),
        validate
    ],
    bookingsController.setQuotePrice
);

// Cancel/reject a quote request
router.delete('/admin/quote-requests/:id',
    authenticate,
    authorize('admin'),
    [
        param('id').isUUID(),
        body('reason').optional().trim(),
        validate
    ],
    bookingsController.cancelQuoteRequest
);

// ==================== HOMEOWNER: QUOTATION ACCEPTANCE ====================

// Get quotations for a booking (homeowner)
router.get('/:id/quotations',
    authenticate,
    [
        param('id').isUUID(),
        validate
    ],
    bookingsController.getBookingQuotations
);

// Accept a quotation (homeowner)
router.post('/:bookingId/quotations/:quotationId/accept',
    authenticate,
    [
        param('bookingId').isUUID(),
        param('quotationId').isUUID(),
        validate
    ],
    bookingsController.acceptQuotation
);

// ==================== USER BOOKINGS ====================

router.post('/', authenticate,
    [
        body('service_id').notEmpty().withMessage('service_id is required'),
        body('scheduled_date').isDate().withMessage('valid date required'),
        body('scheduled_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('valid time required'),
        body('address').trim().notEmpty().withMessage('address is required'),
        body('city').trim().notEmpty().withMessage('city is required'),
        body('state').trim().notEmpty().withMessage('state is required'),
        body('zip_code').trim().notEmpty().withMessage('zip_code is required'),
        body('latitude').optional({ values: 'falsy' }).isFloat(),
        body('longitude').optional({ values: 'falsy' }).isFloat(),
        validate
    ],
    bookingsController.createBooking
);

router.get('/', authenticate, bookingsController.getUserBookings);

router.get('/:id', authenticate,
    [
        param('id').isUUID(),
        validate
    ],
    bookingsController.getBookingById
);

router.patch('/:id/status', authenticate,
    [
        param('id').isUUID(),
        body('status').isIn(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']),
        validate
    ],
    bookingsController.updateBookingStatus
);

router.post('/:id/cancel', authenticate,
    [
        param('id').isUUID(),
        body('reason').optional().trim(),
        validate
    ],
    bookingsController.cancelBooking
);

module.exports = router;
