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

module.exports = router;
