const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const prosController = require('../controllers/prosController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Multer config for proof file uploads (images + PDFs)
const proofUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
        }
    }
});

const router = express.Router();

router.get('/nearby',
    [
        query('lat').isFloat(),
        query('lon').isFloat(),
        query('radius').optional().isInt({ min: 1, max: 100 }),
        validate
    ],
    prosController.getNearbyPros
);

router.get('/profile/me', authenticate, authorize('pro'), prosController.getMyProProfile);

// Admin routes (before /:id to avoid route conflicts)
router.get('/admin/list', authenticate, authorize('admin'), prosController.getProsList);

router.get('/:id',
    [
        param('id').isUUID(),
        validate
    ],
    prosController.getProById
);

router.post('/apply', authenticate,
    [
        body('business_name').trim().notEmpty(),
        body('experience_years').isInt({ min: 0 }),
        body('service_categories').isArray(),
        validate
    ],
    prosController.applyToBePro
);

router.get('/jobs/list', authenticate, authorize('pro'), prosController.getProJobs);

router.get('/jobs/history', authenticate, authorize('pro'), prosController.getProJobHistory);

router.post('/jobs/:id/accept', authenticate, authorize('pro'),
    [
        param('id').isUUID(),
        validate
    ],
    prosController.acceptJob
);

router.post('/jobs/:id/decline', authenticate, authorize('pro'),
    [
        param('id').isUUID(),
        body('reason').optional().trim(),
        validate
    ],
    prosController.declineJob
);

router.post('/jobs/:id/proof', authenticate, authorize('pro'),
    [
        param('id').isUUID(),
        body('photos').isArray({ min: 1 }).withMessage('At least one proof photo is required'),
        body('notes').optional().trim(),
        validate
    ],
    prosController.submitJobProof
);

router.post('/jobs/:id/proof/upload', authenticate, authorize('pro'),
    proofUpload.array('files', 10),
    prosController.uploadProofFiles
);

router.get('/jobs/:id/proof', authenticate,
    [
        param('id').isUUID(),
        validate
    ],
    prosController.getJobProof
);

router.patch('/profile', authenticate, authorize('pro'),
    prosController.updateProProfile
);

// Avatar upload - uses multer memory storage, route through backend to bypass Supabase storage RLS
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

router.post('/avatar', authenticate, avatarUpload.single('avatar'), prosController.uploadAvatar);

router.get('/statistics/me', authenticate, authorize('pro'), prosController.getProStatistics);

router.get('/availability', authenticate, authorize('pro'), prosController.getMyAvailability);

router.put('/availability',
    authenticate,
    authorize('pro'),
    [
        body('schedule').isArray({ min: 0, max: 7 }).withMessage('schedule must be an array of up to 7 days'),
        body('schedule.*.day_of_week').isInt({ min: 0, max: 6 }),
        body('schedule.*.start_time').matches(/^\d{2}:\d{2}$/).withMessage('start_time must be HH:MM'),
        body('schedule.*.end_time').matches(/^\d{2}:\d{2}$/).withMessage('end_time must be HH:MM'),
        validate,
    ],
    prosController.updateMyAvailability
);

router.patch('/:id/commission', authenticate, authorize('admin'),
    [
        param('id').isUUID(),
        validate
    ],
    prosController.setProCommission
);

module.exports = router;
