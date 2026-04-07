const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoint - get tax rate for a specific service type
router.get('/tax/:serviceType', settingsController.getTaxRate);

// Admin endpoints - tax
router.get('/tax', authenticate, authorize('admin'), settingsController.getTaxSettings);
router.put('/tax/:serviceType', authenticate, authorize('admin'), settingsController.updateTaxSetting);

// Admin endpoints - notification emails
router.get('/notifications/emails', authenticate, authorize('admin'), settingsController.getNotificationEmails);
router.put('/notifications/emails', authenticate, authorize('admin'), settingsController.updateNotificationEmails);

module.exports = router;
