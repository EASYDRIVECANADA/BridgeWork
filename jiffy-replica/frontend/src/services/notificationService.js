const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

exports.createNotification = async (userId, notification) => {
    try {
        const { type, title, message, link, data } = notification;

        const { data: result, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                link,
                data: data || {}
            })
            .select()
            .single();

        if (error) {
            logger.error('Create notification error', { error: error.message, userId });
            return null;
        }

        return result;
    } catch (error) {
        logger.error('Create notification service error', { error: error.message });
        return null;
    }
};

exports.createBulkNotifications = async (userIds, notification) => {
    try {
        const { type, title, message, link, data } = notification;

        const notifications = userIds.map(userId => ({
            user_id: userId,
            type,
            title,
            message,
            link,
            data: data || {}
        }));

        const { data: result, error } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)
            .select();

        if (error) {
            logger.error('Create bulk notifications error', { error: error.message });
            return [];
        }

        return result;
    } catch (error) {
        logger.error('Create bulk notifications service error', { error: error.message });
        return [];
    }
};

exports.markAsRead = async (notificationId, userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            logger.error('Mark notification as read error', { error: error.message });
            return null;
        }

        return data;
    } catch (error) {
        logger.error('Mark notification as read service error', { error: error.message });
        return null;
    }
};

exports.markAllAsRead = async (userId) => {
    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('Mark all notifications as read error', { error: error.message });
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Mark all notifications as read service error', { error: error.message });
        return false;
    }
};
