const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// GET /api/notifications — list current user's notifications (newest first, paginated)
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = (page - 1) * limit;

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error('Fetch notifications error', { error: error.message, userId });
            return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }

        res.json({
            success: true,
            data: { notifications: data || [] }
        });
    } catch (error) {
        logger.error('getNotifications controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('Unread count error', { error: error.message, userId });
            return res.status(500).json({ success: false, message: 'Failed to get unread count' });
        }

        res.json({
            success: true,
            data: { unreadCount: count || 0 }
        });
    } catch (error) {
        logger.error('getUnreadCount controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};

// PATCH /api/notifications/:id/read — mark one notification as read
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            logger.error('Mark notification read error', { error: error.message, notificationId: id });
            return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
        }

        res.json({ success: true, data: { notification: data } });
    } catch (error) {
        logger.error('markAsRead controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};

// PATCH /api/notifications/read-all — mark all unread notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('Mark all read error', { error: error.message, userId });
            return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
        }

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        logger.error('markAllAsRead controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
};
