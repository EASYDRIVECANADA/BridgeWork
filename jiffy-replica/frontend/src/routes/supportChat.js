const express = require('express');
const { param, body } = require('express-validator');
const supportChatController = require('../controllers/supportChatController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// User: Get or create their support conversation
router.get('/conversation', authenticate, supportChatController.getOrCreateConversation);

// Get messages for a conversation
router.get('/:conversationId/messages', authenticate,
    [
        param('conversationId').isUUID(),
        validate
    ],
    supportChatController.getMessages
);

// Send a message in a conversation
router.post('/:conversationId/messages', authenticate,
    [
        param('conversationId').isUUID(),
        body('message').trim().notEmpty().withMessage('Message is required'),
        validate
    ],
    supportChatController.sendMessage
);

// Get unread count
router.get('/unread-count', authenticate, supportChatController.getUnreadCount);

// ADMIN: Get all support conversations
router.get('/admin/conversations', authenticate, authorize('admin'), supportChatController.getAllConversations);

// ADMIN: Close a conversation
router.patch('/admin/:conversationId/close', authenticate, authorize('admin'),
    [
        param('conversationId').isUUID(),
        validate
    ],
    supportChatController.closeConversation
);

module.exports = router;
