const express = require('express');
const { body, param } = require('express-validator');
const onboardingController = require('../controllers/onboardingController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Pro onboarding routes
router.get('/status', authenticate, authorize('pro'), onboardingController.getOnboardingStatus);

router.get('/agreement', authenticate, onboardingController.getServiceAgreement);

router.post('/step/1', authenticate, authorize('pro'),
    [
        body('business_name').trim().notEmpty().withMessage('Business name is required'),
        body('business_address').trim().notEmpty().withMessage('Business address is required'),
        body('business_unit').optional().trim(),
        body('gst_number').optional().trim(),
        body('website').optional().trim(),
        body('how_heard').optional().trim(),
        validate
    ],
    onboardingController.submitBusinessInfo
);

router.post('/step/2', authenticate, authorize('pro'),
    [
        body('accepted').isBoolean().equals('true').withMessage('You must accept the agreement'),
        validate
    ],
    onboardingController.acceptServiceAgreement
);

router.post('/step/3', authenticate, authorize('pro'),
    [
        body('service_categories').isArray({ min: 1 }).withMessage('At least one service is required'),
        body('reference_1_name').trim().notEmpty().withMessage('Reference 1 name is required'),
        body('reference_1_phone').trim().notEmpty().withMessage('Reference 1 phone is required'),
        validate
    ],
    onboardingController.submitRequirements
);

router.post('/step/4', authenticate, authorize('pro'),
    onboardingController.completeStripeStep
);

// Admin routes
router.get('/admin/applications', authenticate, authorize('admin'), onboardingController.getApplications);

router.post('/admin/approve/:proProfileId', authenticate, authorize('admin'),
    [
        param('proProfileId').isUUID(),
        body('commission_rate').optional().isFloat({ min: 0, max: 1 }),
        validate
    ],
    onboardingController.approveApplication
);

router.post('/admin/reject/:proProfileId', authenticate, authorize('admin'),
    [
        param('proProfileId').isUUID(),
        body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
        validate
    ],
    onboardingController.rejectApplication
);

module.exports = router;
