const express = require('express');
const { param, body } = require('express-validator');
const multer = require('multer');
const messagesController = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Multer config — store in memory buffer for Supabase Storage upload
const upload = multer({
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

// Get all conversations for the authenticated user
router.get('/conversations', authenticate, messagesController.getConversations);

// Get unread message count
router.get('/unread-count', authenticate, messagesController.getUnreadCount);

// Get messages for a specific booking
router.get('/:bookingId', authenticate,
    [
        param('bookingId').isUUID(),
        validate
    ],
    messagesController.getMessages
);

// Upload an image attachment for a booking conversation
router.post('/:bookingId/upload', authenticate,
    upload.single('file'),
    messagesController.uploadAttachment
);

// Send a message in a booking conversation
router.post('/:bookingId', authenticate,
    [
        param('bookingId').isUUID(),
        body('message').optional({ values: 'falsy' }).trim(),
        validate
    ],
    messagesController.sendMessage
);

// Mark all messages in a booking as read
router.patch('/:bookingId/read', authenticate,
    [
        param('bookingId').isUUID(),
        validate
    ],
    messagesController.markAsRead
);

module.exports = router;
