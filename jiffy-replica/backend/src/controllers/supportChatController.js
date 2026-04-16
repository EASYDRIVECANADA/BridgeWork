const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// Get or create the user's support conversation
exports.getOrCreateConversation = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check for existing open conversation
        const { data: existing } = await supabaseAdmin
            .from('support_conversations')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            return res.json({ success: true, data: { conversation: existing } });
        }

        // Create new conversation
        const { data: conversation, error } = await supabaseAdmin
            .from('support_conversations')
            .insert({
                user_id: userId,
                subject: 'Help Request',
                status: 'open'
            })
            .select()
            .single();

        if (error) {
            logger.error('Create support conversation error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to create conversation' });
        }

        logger.info('Support conversation created', { conversationId: conversation.id, userId });
        res.status(201).json({ success: true, data: { conversation } });
    } catch (error) {
        logger.error('getOrCreateConversation error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get or create conversation' });
    }
};

// Get messages for a support conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.profile.role === 'admin';

        // Verify access
        if (!isAdmin) {
            const { data: conv } = await supabaseAdmin
                .from('support_conversations')
                .select('user_id')
                .eq('id', conversationId)
                .single();

            if (!conv || conv.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        const { data: messages, error } = await supabaseAdmin
            .from('support_messages')
            .select(`
                *,
                sender:profiles!sender_id (
                    id,
                    full_name,
                    avatar_url,
                    role
                )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('Get support messages error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
        }

        // Mark messages as read for this user (messages not sent by them)
        await supabaseAdmin
            .from('support_messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        res.json({ success: true, data: { messages: messages || [] } });
    } catch (error) {
        logger.error('getMessages error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

// Send a message in a support conversation
exports.sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { message } = req.body;
        const senderId = req.user.id;
        const isAdmin = req.profile.role === 'admin';

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Verify access
        const { data: conv } = await supabaseAdmin
            .from('support_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (!conv) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if (!isAdmin && conv.user_id !== senderId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // If customer is messaging a closed conversation, reopen it
        if (!isAdmin && conv.status === 'closed') {
            await supabaseAdmin
                .from('support_conversations')
                .update({ status: 'open', updated_at: new Date().toISOString() })
                .eq('id', conversationId);
        }

        // Insert message
        const { data: newMessage, error } = await supabaseAdmin
            .from('support_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                message: message.trim()
            })
            .select(`
                *,
                sender:profiles!sender_id (
                    id,
                    full_name,
                    avatar_url,
                    role
                )
            `)
            .single();

        if (error) {
            logger.error('Send support message error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to send message' });
        }

        // Update conversation updated_at
        await supabaseAdmin
            .from('support_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        // If admin is replying and conversation isn't assigned, assign it
        if (isAdmin && !conv.assigned_admin_id) {
            await supabaseAdmin
                .from('support_conversations')
                .update({ assigned_admin_id: senderId })
                .eq('id', conversationId);
        }

        // Emit via Socket.IO for real-time delivery
        const io = req.app.get('io');
        if (io) {
            io.to(`support_${conversationId}`).emit('new_support_message', newMessage);

            // Notify the other party
            const recipientId = isAdmin ? conv.user_id : null;
            if (recipientId) {
                const userSockets = req.app.get('userSockets');
                const recipientSocketId = userSockets?.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('new_support_notification', {
                        conversation_id: conversationId,
                        message: newMessage
                    });
                }
            }

            // If user is sending, notify all connected admin sockets
            if (!isAdmin) {
                io.to('admin_support_room').emit('new_support_message_for_admin', {
                    conversation_id: conversationId,
                    message: newMessage,
                    user_id: conv.user_id
                });
            }
        }

        logger.info('Support message sent', { conversationId, senderId });
        res.status(201).json({ success: true, data: { message: newMessage } });
    } catch (error) {
        logger.error('sendMessage error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// ADMIN: Get all support conversations
exports.getAllConversations = async (req, res) => {
    try {
        const { status = 'open' } = req.query;

        let query = supabaseAdmin
            .from('support_conversations')
            .select(`
                *,
                user:profiles!user_id (
                    id,
                    full_name,
                    avatar_url,
                    email,
                    role
                ),
                assigned_admin:profiles!assigned_admin_id (
                    id,
                    full_name
                )
            `)
            .order('updated_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: conversations, error } = await query;

        if (error) {
            logger.error('Get all support conversations error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
        }

        // Get last message and unread count for each conversation
        const enriched = await Promise.all(
            (conversations || []).map(async (conv) => {
                const { data: lastMsg } = await supabaseAdmin
                    .from('support_messages')
                    .select('message, sender_id, created_at, is_read')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const { count: unreadCount } = await supabaseAdmin
                    .from('support_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .eq('is_read', false)
                    .neq('sender_id', req.user.id);

                return {
                    ...conv,
                    last_message: lastMsg || null,
                    unread_count: unreadCount || 0
                };
            })
        );

        res.json({ success: true, data: { conversations: enriched } });
    } catch (error) {
        logger.error('getAllConversations error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
};

// ADMIN: Close a support conversation
exports.closeConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const { error } = await supabaseAdmin
            .from('support_conversations')
            .update({ status: 'closed', updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        if (error) {
            logger.error('Close support conversation error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to close conversation' });
        }

        res.json({ success: true, message: 'Conversation closed' });
    } catch (error) {
        logger.error('closeConversation error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to close conversation' });
    }
};

// Get unread support message count (for admin badge)
exports.getUnreadCount = async (req, res) => {
    try {
        const isAdmin = req.profile.role === 'admin';

        if (isAdmin) {
            // Count unread messages across all open conversations not sent by admins
            const { data: openConvs } = await supabaseAdmin
                .from('support_conversations')
                .select('id')
                .eq('status', 'open');

            if (!openConvs || openConvs.length === 0) {
                return res.json({ success: true, data: { unread_count: 0 } });
            }

            const convIds = openConvs.map(c => c.id);

            // Get all admin user IDs
            const { data: admins } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'admin');

            const adminIds = (admins || []).map(a => a.id);

            const { count } = await supabaseAdmin
                .from('support_messages')
                .select('id', { count: 'exact', head: true })
                .in('conversation_id', convIds)
                .eq('is_read', false)
                .not('sender_id', 'in', `(${adminIds.join(',')})`);

            return res.json({ success: true, data: { unread_count: count || 0 } });
        } else {
            // For regular users, count unread in their conversations
            const { data: convs } = await supabaseAdmin
                .from('support_conversations')
                .select('id')
                .eq('user_id', req.user.id)
                .eq('status', 'open');

            if (!convs || convs.length === 0) {
                return res.json({ success: true, data: { unread_count: 0 } });
            }

            const { count } = await supabaseAdmin
                .from('support_messages')
                .select('id', { count: 'exact', head: true })
                .in('conversation_id', convs.map(c => c.id))
                .eq('is_read', false)
                .neq('sender_id', req.user.id);

            return res.json({ success: true, data: { unread_count: count || 0 } });
        }
    } catch (error) {
        logger.error('getUnreadCount error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};
