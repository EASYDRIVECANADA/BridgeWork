const express = require('express');
const router = express.Router();
const adminInvitationsController = require('../controllers/adminInvitationsController');

// Public routes (no authentication required)

// Verify token
router.get('/verify/:token', adminInvitationsController.verifyToken);

// Accept invitation and create account
router.post('/accept', adminInvitationsController.acceptInvitation);

module.exports = router;
