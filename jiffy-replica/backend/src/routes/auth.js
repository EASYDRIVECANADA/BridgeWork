const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/signup', authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/\d/).withMessage('Password must contain at least one number')
            .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
        body('full_name').trim().isLength({ min: 2 }),
        body('role').optional().isIn(['user', 'pro']),
        validate
    ],
    authController.signup
);

router.post('/login', authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
        validate
    ],
    authController.login
);

router.post('/logout', authenticate, authController.logout);

router.post('/refresh',
    [
        body('refresh_token').notEmpty(),
        validate
    ],
    authController.refreshToken
);

router.get('/me', authenticate, authController.getCurrentUser);

router.patch('/profile', authenticate,
    [
        body('full_name').optional().trim().isLength({ min: 2 }),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('city').optional().trim(),
        body('state').optional().trim(),
        body('zip_code').optional().trim(),
        validate
    ],
    authController.updateProfile
);

router.post('/change-password', authenticate,
    [
        body('current_password').notEmpty(),
        body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/\d/).withMessage('Password must contain at least one number')
            .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
        validate
    ],
    authController.changePassword
);

router.post('/forgot-password', authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        validate
    ],
    authController.forgotPassword
);

router.post('/reset-password',
    [
        body('token').notEmpty().withMessage('Reset token is required'),
        body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/\d/).withMessage('Password must contain at least one number')
            .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
        validate
    ],
    authController.resetPassword
);

router.get('/search-users', authenticate, authController.searchUsers);

router.get('/export-data', authenticate, authController.exportData);

router.delete('/me',
    authenticate,
    [body('password').notEmpty().withMessage('Password is required'), validate],
    authController.deleteAccount
);

module.exports = router;
