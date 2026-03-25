const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const InvoiceController = require('../controllers/invoiceController');

// Pro creates invoice for a booking
router.post('/bookings/:bookingId/invoice', authenticate, authorize('pro'), InvoiceController.createInvoice);
// Fetch invoice for a booking (pro or user)
router.get('/bookings/:bookingId/invoice', authenticate, InvoiceController.getInvoice);

module.exports = router;
