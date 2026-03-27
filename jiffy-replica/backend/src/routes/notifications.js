const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, notificationsController.getNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);
router.patch('/read-all', authenticate, notificationsController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationsController.markAsRead);

module.exports = router;
