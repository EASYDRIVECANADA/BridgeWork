const express = require('express');
const router = express.Router();
const adminInvitationsController = require('../controllers/adminInvitationsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Create and send invitation
router.post('/', adminInvitationsController.createInvitation);

// Get all invitations
router.get('/', adminInvitationsController.getAllInvitations);

// Verify token (public - no auth required for this one)
router.get('/verify/:token', adminInvitationsController.verifyToken);

// Cancel invitation
router.delete('/:id', adminInvitationsController.cancelInvitation);

// Resend invitation
router.post('/:id/resend', adminInvitationsController.resendInvitation);

module.exports = router;
