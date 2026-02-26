const express = require('express');
const { body, param, query } = require('express-validator');
const bookingsController = require('../controllers/bookingsController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

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
