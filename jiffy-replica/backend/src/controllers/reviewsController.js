const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

exports.createReview = async (req, res) => {
    try {
        const { booking_id, rating, comment, images } = req.body;

        // Validate rating range
        const parsedRating = parseInt(rating, 10);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a whole number between 1 and 5'
            });
        }

        // Validate comment length
        if (comment && comment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Review comment cannot exceed 1000 characters'
            });
        }

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, pro_profiles(id)')
            .eq('id', booking_id)
            .eq('user_id', req.user.id)
            .eq('status', 'completed')
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not completed'
            });
        }

        const { data: existingReview } = await supabaseAdmin
            .from('reviews')
            .select('id')
            .eq('booking_id', booking_id)
            .single();

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Review already exists for this booking'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                booking_id,
                user_id: req.user.id,
                pro_id: booking.pro_profiles.id,
                rating: parsedRating,
                comment: comment || null,
                images: images || []
            })
            .select()
            .single();

        if (error) {
            logger.error('Create review error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create review'
            });
        }

        logger.info('Review created', { reviewId: data.id, bookingId: booking_id });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: { review: data }
        });
    } catch (error) {
        logger.error('Create review controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create review'
        });
    }
};

exports.getReviewsByProId = async (req, res) => {
    try {
        const { proId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const { data, error, count } = await supabaseAdmin
            .from('reviews')
            .select(`
                *,
                profiles (
                    full_name,
                    avatar_url
                ),
                bookings (
                    service_name,
                    completed_at
                )
            `, { count: 'exact' })
            .eq('pro_id', proId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error('Get reviews by pro error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch reviews'
            });
        }

        res.json({
            success: true,
            data: {
                reviews: data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get reviews by pro controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews'
        });
    }
};

exports.respondToReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({
                response,
                response_date: new Date().toISOString()
            })
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .select()
            .single();

        if (error) {
            logger.error('Respond to review error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to respond to review'
            });
        }

        logger.info('Review response added', { reviewId: id });

        res.json({
            success: true,
            message: 'Response added successfully',
            data: { review: data }
        });
    } catch (error) {
        logger.error('Respond to review controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to respond to review'
        });
    }
};
