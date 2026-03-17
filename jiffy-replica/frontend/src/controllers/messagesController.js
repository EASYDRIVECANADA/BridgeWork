const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// Get all conversations for the authenticated user (grouped by booking)
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all bookings where user is either the customer or the assigned pro
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        let bookingsQuery = supabaseAdmin
            .from('bookings')
            .select(`
                id,
                booking_number,
                service_name,
                status,
                user_id,
                pro_id,
                scheduled_date,
                scheduled_time
            `)
            .in('status', ['accepted', 'in_progress', 'completed']);

        // If user is a pro, get bookings assigned to them; otherwise get their own bookings
        if (proProfile) {
            bookingsQuery = bookingsQuery.or(`user_id.eq.${userId},pro_id.eq.${proProfile.id}`);
        } else {
            bookingsQuery = bookingsQuery.eq('user_id', userId);
        }

        const { data: bookings, error: bookingsError } = await bookingsQuery
            .order('updated_at', { ascending: false });

        if (bookingsError) {
            logger.error('Get conversations - bookings error', { error: bookingsError.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
        }

        // For each booking, get the latest message and unread count
        const conversations = await Promise.all(
            (bookings || []).map(async (booking) => {
                // Get latest message
                const { data: latestMessage } = await supabaseAdmin
                    .from('messages')
                    .select('message, sender_id, created_at, is_read')
                    .eq('booking_id', booking.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Get unread count for this user
                const { count: unreadCount } = await supabaseAdmin
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('booking_id', booking.id)
                    .eq('recipient_id', userId)
                    .eq('is_read', false);

                // Get the other party's profile
                let otherUserId;
                if (proProfile && booking.pro_id === proProfile.id) {
                    // Current user is the pro, other party is the customer
                    otherUserId = booking.user_id;
                } else {
                    // Current user is the customer, get the pro's user_id
                    if (booking.pro_id) {
                        const { data: proData } = await supabaseAdmin
                            .from('pro_profiles')
                            .select('user_id')
                            .eq('id', booking.pro_id)
                            .single();
                        otherUserId = proData?.user_id;
                    }
                }

                let otherParty = null;
                if (otherUserId) {
                    const { data: otherProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('id, full_name, avatar_url, role')
                        .eq('id', otherUserId)
                        .single();
                    otherParty = otherProfile;
                }

                return {
                    booking_id: booking.id,
                    booking_number: booking.booking_number,
                    service_name: booking.service_name,
                    booking_status: booking.status,
                    scheduled_date: booking.scheduled_date,
                    scheduled_time: booking.scheduled_time,
                    other_party: otherParty,
                    latest_message: latestMessage || null,
                    unread_count: unreadCount || 0
                };
            })
        );

        // Filter out conversations with no other party (unassigned bookings)
        const validConversations = conversations.filter(c => c.other_party);

        res.json({
            success: true,
            data: { conversations: validConversations }
        });
    } catch (error) {
        logger.error('Get conversations controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
};

// Get messages for a specific booking
exports.getMessages = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Verify user has access to this booking
        const hasAccess = await verifyBookingAccess(userId, bookingId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { data: messages, error, count } = await supabaseAdmin
            .from('messages')
            .select(`
                *,
                sender:profiles!sender_id (
                    id,
                    full_name,
                    avatar_url,
                    role
                )
            `, { count: 'exact' })
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error('Get messages error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
        }

        // Mark messages as read where this user is the recipient
        await supabaseAdmin
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('booking_id', bookingId)
            .eq('recipient_id', userId)
            .eq('is_read', false);

        res.json({
            success: true,
            data: {
                messages: messages || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get messages controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { message, attachments } = req.body;
        const senderId = req.user.id;

        // Require at least a message or attachments
        if (!message && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ success: false, message: 'Message or attachment is required' });
        }

        // Verify access
        const hasAccess = await verifyBookingAccess(senderId, bookingId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Determine recipient
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('user_id, pro_id')
            .eq('id', bookingId)
            .single();

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        let recipientId;
        // Check if sender is the pro
        const { data: senderProProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', senderId)
            .single();

        if (senderProProfile && senderProProfile.id === booking.pro_id) {
            // Sender is the pro, recipient is the customer
            recipientId = booking.user_id;
        } else {
            // Sender is the customer, recipient is the pro's user_id
            if (booking.pro_id) {
                const { data: proData } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('user_id')
                    .eq('id', booking.pro_id)
                    .single();
                recipientId = proData?.user_id;
            }
        }

        if (!recipientId) {
            return res.status(400).json({ success: false, message: 'No recipient found for this booking' });
        }

        const { data: newMessage, error } = await supabaseAdmin
            .from('messages')
            .insert({
                booking_id: bookingId,
                sender_id: senderId,
                recipient_id: recipientId,
                message: message || '📷 Image',
                attachments: attachments || []
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
            logger.error('Send message error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to send message' });
        }

        // Emit via Socket.IO for real-time delivery
        const io = req.app.get('io');
        if (io) {
            io.to(`booking_${bookingId}`).emit('new_message', newMessage);

            // Also emit to recipient's personal socket if they haven't joined the booking room
            const userSockets = req.app.get('userSockets');
            const recipientSocketId = userSockets?.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('new_message_notification', {
                    booking_id: bookingId,
                    message: newMessage
                });
            }
        }

        logger.info('Message sent', { bookingId, senderId, recipientId });

        res.status(201).json({
            success: true,
            message: 'Message sent',
            data: { message: newMessage }
        });
    } catch (error) {
        logger.error('Send message controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        const { error } = await supabaseAdmin
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('booking_id', bookingId)
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('Mark messages as read error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
        }

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        logger.error('Mark as read controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
};

// Get unread message count for the authenticated user
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const { count, error } = await supabaseAdmin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('Get unread count error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to get unread count' });
        }

        res.json({
            success: true,
            data: { unread_count: count || 0 }
        });
    } catch (error) {
        logger.error('Get unread count controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};

// Upload an image attachment for a chat message
exports.uploadAttachment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        // Verify access
        const hasAccess = await verifyBookingAccess(userId, bookingId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop().toLowerCase();
        const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (!allowedExts.includes(fileExt)) {
            return res.status(400).json({ success: false, message: 'Only image files (jpg, png, gif, webp) are allowed' });
        }

        // Generate unique filename
        const fileName = `chat/${bookingId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        // Ensure the bucket exists (create if not)
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'attachments');
        if (!bucketExists) {
            await supabaseAdmin.storage.createBucket('attachments', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024, // 5MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            });
            logger.info('Created "attachments" storage bucket');
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('attachments')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            logger.error('Upload attachment error', { error: uploadError.message });
            return res.status(500).json({ success: false, message: 'Failed to upload file' });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('attachments')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        logger.info('Attachment uploaded', { bookingId, fileName, userId });

        res.status(201).json({
            success: true,
            data: {
                url: publicUrl,
                filename: file.originalname,
                size: file.size,
                type: file.mimetype
            }
        });
    } catch (error) {
        logger.error('Upload attachment controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to upload attachment' });
    }
};

// Helper: verify user has access to a booking (is customer or assigned pro)
async function verifyBookingAccess(userId, bookingId) {
    const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('user_id, pro_id')
        .eq('id', bookingId)
        .single();

    if (!booking) return false;

    // Direct user match
    if (booking.user_id === userId) return true;

    // Check if user is the assigned pro
    if (booking.pro_id) {
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (proProfile && proProfile.id === booking.pro_id) return true;
    }

    return false;
}
