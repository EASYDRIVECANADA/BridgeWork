const express = require('express');
const { body, param } = require('express-validator');
const reviewsController = require('../controllers/reviewsController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/', authenticate,
    [
        body('booking_id').isUUID(),
        body('rating').isInt({ min: 1, max: 5 }),
        body('comment').optional().trim(),
        validate
    ],
    reviewsController.createReview
);

router.get('/pro/:proId',
    [
        param('proId').isUUID(),
        validate
    ],
    reviewsController.getReviewsByProId
);

router.post('/:id/respond', authenticate, authorize('pro'),
    [
        param('id').isUUID(),
        body('response').trim().notEmpty(),
        validate
    ],
    reviewsController.respondToReview
);

module.exports = router;
