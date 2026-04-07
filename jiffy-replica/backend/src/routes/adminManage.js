const express = require('express');
const router = express.Router();
const adminManageController = require('../controllers/adminManageController');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth');

// All routes: must be authenticated admin AND superadmin
router.use(authenticate);
router.use(authorize('admin'));
router.use(requireSuperAdmin);

// List all admin accounts
router.get('/admins', adminManageController.listAdmins);

// Update an admin's permissions
router.patch('/admins/:id/permissions', adminManageController.updateAdminPermissions);

// Toggle an admin's active status
router.patch('/admins/:id/toggle-active', adminManageController.toggleAdminActive);

// Send password reset email to an admin (SuperAdmin only)
router.post('/admins/:id/send-password-reset', adminManageController.sendAdminPasswordReset);

// List all homeowners
router.get('/users', adminManageController.listHomeowners);

// Toggle any user's (homeowner/pro) active status
router.patch('/users/:id/toggle-active', adminManageController.toggleUserActive);

// Send password reset to any user (homeowner/pro/admin)
router.post('/users/:id/send-password-reset', adminManageController.sendUserPasswordReset);

// Update any user's email
router.patch('/users/:id/email', adminManageController.updateUserEmail);

module.exports = router;
