const express = require('express');
const { query, body, param } = require('express-validator');
const servicesController = require('../controllers/servicesController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/', optionalAuth, servicesController.getAllServices);

router.get('/search',
    optionalAuth,
    [
        query('q').trim().isLength({ min: 2 }),
        validate
    ],
    servicesController.searchServices
);

router.get('/categories', optionalAuth, servicesController.getCategories);

router.get('/categories/:id',
    [
        param('id').isUUID(),
        validate
    ],
    servicesController.getCategoryById
);

router.get('/:id', servicesController.getServiceById);

router.post('/', authenticate, authorize('admin'),
    [
        body('category_id').isUUID(),
        body('name').trim().isLength({ min: 2 }),
        body('slug').trim().isLength({ min: 2 }),
        body('description').trim(),
        body('base_price').isFloat({ min: 0 }),
        validate
    ],
    servicesController.createService
);

router.patch('/:id', authenticate, authorize('admin'),
    [
        param('id').isUUID(),
        validate
    ],
    servicesController.updateService
);

router.delete('/:id', authenticate, authorize('admin'),
    [
        param('id').isUUID(),
        validate
    ],
    servicesController.deleteService
);

module.exports = router;
