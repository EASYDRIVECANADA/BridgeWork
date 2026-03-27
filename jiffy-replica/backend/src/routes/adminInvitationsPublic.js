const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const adminInvitationsController = require('../controllers/adminInvitationsController');
const validate = require('../middleware/validate');

// Public routes (no authentication required)

// Verify token
router.get('/verify/:token', adminInvitationsController.verifyToken);

// Accept invitation and create account
router.post('/accept',
    [
        body('token').notEmpty().withMessage('Invitation token is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/\d/).withMessage('Password must contain at least one number')
            .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
        validate
    ],
    adminInvitationsController.acceptInvitation
);

module.exports = router;
