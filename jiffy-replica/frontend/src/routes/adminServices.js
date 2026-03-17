const express = require('express');
const router = express.Router();
const adminServicesController = require('../controllers/adminServicesController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// Get all categories (including inactive)
router.get('/categories', adminServicesController.getAllCategories);

// Create category
router.post('/categories', adminServicesController.createCategory);

// Update category
router.put('/categories/:id', adminServicesController.updateCategory);

// Delete category (soft delete)
router.delete('/categories/:id', adminServicesController.deleteCategory);

// ============================================================================
// SERVICE ROUTES
// ============================================================================

// Get all services (including inactive)
router.get('/services', adminServicesController.getAllServicesAdmin);

// Create service
router.post('/services', adminServicesController.createService);

// Update service
router.put('/services/:id', adminServicesController.updateService);

// Delete service (soft delete)
router.delete('/services/:id', adminServicesController.deleteService);

// ============================================================================
// IMAGE UPLOAD ROUTE
// ============================================================================

// Upload image for service or category
router.post('/upload-image', 
    adminServicesController.uploadMiddleware,
    adminServicesController.uploadImage
);

module.exports = router;
