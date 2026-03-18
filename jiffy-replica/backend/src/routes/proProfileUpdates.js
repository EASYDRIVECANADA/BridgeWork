const express = require('express');
const router = express.Router();
const proProfileUpdatesController = require('../controllers/proProfileUpdatesController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// PRO ROUTES
// ============================================================================

// Submit profile update request (fields requiring approval)
router.post('/request', proProfileUpdatesController.submitProfileUpdate);

// Get my pending update request
router.get('/my-pending', proProfileUpdatesController.getMyPendingRequest);

// Get my request history
router.get('/my-history', proProfileUpdatesController.getMyRequestHistory);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all update requests (with ?status=pending|approved|rejected)
router.get('/admin/requests', authorize('admin'), proProfileUpdatesController.adminGetUpdateRequests);

// Get count of pending requests (for badge)
router.get('/admin/pending-count', authorize('admin'), proProfileUpdatesController.adminGetPendingCount);

// Approve a request
router.post('/admin/approve/:id', authorize('admin'), proProfileUpdatesController.adminApproveRequest);

// Reject a request
router.post('/admin/reject/:id', authorize('admin'), proProfileUpdatesController.adminRejectRequest);

// Admin directly update a pro's profile
router.put('/admin/pro/:proProfileId', authorize('admin'), proProfileUpdatesController.adminUpdateProProfile);

module.exports = router;
