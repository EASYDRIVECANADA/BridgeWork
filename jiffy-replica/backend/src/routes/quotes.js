const express = require('express');
const { body, param } = require('express-validator');
const quotesController = require('../controllers/quotesController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// ==================== QUOTES ====================

// Create a new quote (Pro only)
router.post('/quotes', authenticate, authorize('pro', 'admin'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
        body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Item unit_price must be a positive number'),
        body('items.*.quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
        body('customer_id').optional().isUUID(),
        body('booking_id').optional().isUUID(),
        body('tax_rate').optional().isFloat({ min: 0, max: 1 }),
        body('discount_amount').optional().isFloat({ min: 0 }),
        body('valid_until').optional().isDate(),
        validate
    ],
    quotesController.createQuote
);

// Get quotes list (filtered by role)
router.get('/quotes', authenticate, quotesController.getQuotes);

// Get quote/invoice dashboard stats
router.get('/stats', authenticate, quotesController.getStats);

// Get single quote
router.get('/quotes/:id', authenticate,
    [param('id').isUUID(), validate],
    quotesController.getQuoteById
);

// Update a quote (Pro only)
router.put('/quotes/:id', authenticate, authorize('pro', 'admin'),
    [
        param('id').isUUID(),
        body('title').optional().trim().notEmpty(),
        body('items').optional().isArray({ min: 1 }),
        body('items.*.description').optional().trim().notEmpty(),
        body('items.*.unit_price').optional().isFloat({ min: 0 }),
        validate
    ],
    quotesController.updateQuote
);

// Send quote to customer
router.post('/quotes/:id/send', authenticate, authorize('pro', 'admin'),
    [param('id').isUUID(), validate],
    quotesController.sendQuote
);

// Customer responds to quote (accept/decline)
router.post('/quotes/:id/respond', authenticate,
    [
        param('id').isUUID(),
        body('action').isIn(['accept', 'decline']).withMessage('Action must be accept or decline'),
        body('decline_reason').optional().trim(),
        body('customer_notes').optional().trim(),
        validate
    ],
    quotesController.respondToQuote
);

// Convert accepted quote to invoice
router.post('/quotes/:id/convert', authenticate, authorize('pro', 'admin'),
    [
        param('id').isUUID(),
        body('due_date').optional().isDate(),
        body('notes').optional().trim(),
        validate
    ],
    quotesController.convertQuoteToInvoice
);

// Delete a quote (Pro only, draft only)
router.delete('/quotes/:id', authenticate, authorize('pro', 'admin'),
    [param('id').isUUID(), validate],
    quotesController.deleteQuote
);

// ==================== PUBLIC QUOTE PORTAL (no auth) ====================

// Get quote details by public token
router.get('/portal/:token', quotesController.getQuoteByPublicToken);

// Respond to quote (accept / decline) via public portal
router.post('/portal/:token/respond',
    [
        body('action').isIn(['accept', 'decline']).withMessage('Action must be accept or decline'),
        body('decline_reason').optional().trim(),
        body('address').optional().trim(),
        body('city').optional().trim(),
        body('zip_code').optional().trim(),
        body('preferred_date').optional().isDate().withMessage('preferred_date must be a valid date (YYYY-MM-DD)'),
        validate
    ],
    quotesController.respondToQuoteByPublicToken
);

// ==================== ADMIN: QUOTE INVOICES ====================

// Get quote bookings formatted as invoices (Admin only)
router.get('/admin/quote-invoices', authenticate, authorize('admin'),
    quotesController.getQuoteBookingsAsInvoices
);

// ==================== INVOICES ====================

// Create standalone invoice (Pro only)
router.post('/invoices', authenticate, authorize('pro', 'admin'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
        body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Item unit_price must be a positive number'),
        body('items.*.quantity').optional().isFloat({ min: 0.01 }),
        body('customer_id').optional().isUUID(),
        body('booking_id').optional().isUUID(),
        body('due_date').optional().isDate(),
        validate
    ],
    quotesController.createInvoice
);

// Get invoices list
router.get('/invoices', authenticate, quotesController.getInvoices);

// Get single invoice
router.get('/invoices/:id', authenticate,
    [param('id').isUUID(), validate],
    quotesController.getInvoiceById
);

// Send invoice to customer
router.post('/invoices/:id/send', authenticate, authorize('pro', 'admin'),
    [param('id').isUUID(), validate],
    quotesController.sendInvoice
);

// Update invoice status (payment recording)
router.patch('/invoices/:id/status', authenticate, authorize('pro', 'admin'),
    [
        param('id').isUUID(),
        body('status').optional().isIn(['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']),
        body('amount_paid').optional().isFloat({ min: 0 }),
        body('payment_method').optional().trim(),
        validate
    ],
    quotesController.updateInvoiceStatus
);

// Create Stripe payment link for an invoice (Customer only)
router.post('/invoices/:id/payment-link', authenticate, authorize('user'),
    [param('id').isUUID(), validate],
    quotesController.createInvoicePaymentLink
);

module.exports = router;
