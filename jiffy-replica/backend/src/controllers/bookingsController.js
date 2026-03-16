const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { findNearbyPros } = require('../services/proMatchingService');
const { createNotification } = require('../services/notificationService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createBooking = async (req, res) => {
    try {
        const {
            service_id,
            scheduled_date,
            scheduled_time,
            address,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            special_instructions,
            promo_code,
            service_name_override
        } = req.body;

        logger.info('Creating booking', { service_id, user_id: req.user.id });

        const { data: service, error: serviceError } = await supabaseAdmin
            .from('services')
            .select('*')
            .eq('id', service_id)
            .single();

        if (serviceError || !service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const scheduled_datetime = new Date(`${scheduled_date}T${scheduled_time}`);

        // Check if this is a Free Quote service (pricing_type === 'custom')
        const isFreeQuote = service.pricing_type === 'custom';

        let total_price = service.base_price;
        let discount = 0;

        // For Free Quote services, set price to 0 (admin will set it later)
        if (isFreeQuote) {
            total_price = 0;
        } else if (promo_code) {
            const { data: promo } = await supabaseAdmin
                .from('promo_codes')
                .select('*')
                .eq('code', promo_code)
                .eq('is_active', true)
                .single();

            if (promo && new Date() >= new Date(promo.valid_from) && new Date() <= new Date(promo.valid_until)) {
                if (promo.discount_type === 'percentage') {
                    discount = (total_price * promo.discount_value) / 100;
                    if (promo.max_discount && discount > promo.max_discount) {
                        discount = promo.max_discount;
                    }
                } else {
                    discount = promo.discount_value;
                }
                total_price -= discount;
            }
        }

        // Calculate tax (skip for Free Quote - will be calculated when admin sets price)
        const tax = isFreeQuote ? 0 : total_price * 0.08;
        total_price += tax;

        // Set status based on service type:
        // - 'quote_pending' for Free Quote services (admin must set price first)
        // - 'pending' for regular services (goes directly to pros)
        const bookingStatus = isFreeQuote ? 'quote_pending' : 'pending';

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .insert({
                booking_number: generateBookingNumber(),
                user_id: req.user.id,
                service_id,
                service_name: service_name_override || service.name,
                service_description: service.description,
                address,
                city,
                state,
                zip_code,
                latitude,
                longitude,
                scheduled_date,
                scheduled_time,
                scheduled_datetime,
                estimated_duration: service.estimated_duration,
                base_price: service.base_price,
                discount,
                tax,
                total_price,
                special_instructions,
                status: bookingStatus,
                is_free_quote: isFreeQuote
            })
            .select()
            .single();

        if (bookingError) {
            logger.error('Create booking error', { error: bookingError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create booking'
            });
        }

        // Only notify pros for regular bookings (not Free Quote)
        // Free Quote bookings go to admin first for pricing
        if (!isFreeQuote) {
            let nearbyPros = [];
            if (latitude && longitude) {
                nearbyPros = await findNearbyPros(latitude, longitude, service.category_id);
            }
            
            for (const pro of nearbyPros.slice(0, 5)) {
                await createNotification(pro.user_id, {
                    type: 'booking',
                    title: 'New Job Available',
                    message: `New ${service.name} booking in ${city}, ${state}`,
                    link: `/pro/bookings/${booking.id}`,
                    data: { booking_id: booking.id }
                });
            }
        }

        logger.info('Booking created', { 
            bookingId: booking.id, 
            userId: req.user.id, 
            isFreeQuote,
            status: bookingStatus 
        });

        res.status(201).json({
            success: true,
            message: isFreeQuote 
                ? 'Quote request submitted! Our team will review and provide a quote shortly.'
                : 'Booking created successfully',
            data: { booking }
        });
    } catch (error) {
        logger.error('Create booking controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create booking'
        });
    }
};

const generateBookingNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `JF-${year}${month}${day}-${random}`;
};

exports.getUserBookings = async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        let query = supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, slug),
                pro_profiles!bookings_pro_id_fkey (
                    id,
                    business_name,
                    rating,
                    profiles!pro_profiles_user_id_fkey (
                        full_name,
                        avatar_url
                    )
                ),
                transactions (
                    id,
                    status,
                    amount,
                    created_at
                ),
                reviews (
                    id,
                    rating,
                    comment,
                    created_at
                )
            `)
            .eq('user_id', req.user.id);

        if (status) {
            query = query.eq('status', status);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            logger.error('Get user bookings error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bookings'
            });
        }

        res.json({
            success: true,
            data: {
                bookings: data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get user bookings controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, slug, description),
                pro_profiles (
                    id,
                    business_name,
                    rating,
                    hourly_rate,
                    profiles (
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (data.user_id !== req.user.id && req.profile.role !== 'admin') {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!proProfile || proProfile.id !== data.pro_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        res.json({
            success: true,
            data: { booking: data }
        });
    } catch (error) {
        logger.error('Get booking by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking'
        });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancellation_reason } = req.body;

        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const updates = { status };

        if (status === 'cancelled') {
            updates.cancelled_at = new Date().toISOString();
            updates.cancelled_by = req.user.id;
            updates.cancellation_reason = cancellation_reason;
        } else if (status === 'in_progress') {
            updates.started_at = new Date().toISOString();
        } else if (status === 'completed') {
            updates.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Update booking status error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update booking'
            });
        }

        const notificationUserId = booking.user_id === req.user.id ? booking.pro_id : booking.user_id;
        await createNotification(notificationUserId, {
            type: 'booking',
            title: 'Booking Status Updated',
            message: `Booking ${booking.booking_number} is now ${status}`,
            link: `/bookings/${booking.id}`,
            data: { booking_id: booking.id }
        });

        logger.info('Booking status updated', { bookingId: id, status });

        res.json({
            success: true,
            message: 'Booking updated successfully',
            data: { booking: data }
        });
    } catch (error) {
        logger.error('Update booking status controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update booking'
        });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (!['pending', 'accepted'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel booking in current status'
            });
        }

        // Release Stripe payment hold if one exists
        const { data: heldTx } = await supabaseAdmin
            .from('transactions')
            .select('id, status, stripe_payment_intent_id')
            .eq('booking_id', id)
            .eq('status', 'held')
            .maybeSingle();

        if (heldTx?.stripe_payment_intent_id) {
            try {
                await stripe.paymentIntents.cancel(heldTx.stripe_payment_intent_id);
                await supabaseAdmin
                    .from('transactions')
                    .update({ status: 'refunded' })
                    .eq('id', heldTx.id);
                logger.info('Stripe hold released on cancel', { bookingId: id, piId: heldTx.stripe_payment_intent_id });
            } catch (stripeErr) {
                logger.error('Failed to release Stripe hold on cancel (non-fatal)', { error: stripeErr.message, bookingId: id });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: req.user.id,
                cancellation_reason: reason
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Cancel booking error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel booking'
            });
        }

        if (booking.pro_id) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('user_id')
                .eq('id', booking.pro_id)
                .single();

            if (proProfile) {
                await createNotification(proProfile.user_id, {
                    type: 'booking',
                    title: 'Booking Cancelled',
                    message: `Booking ${booking.booking_number} has been cancelled`,
                    link: `/pro/bookings/${booking.id}`,
                    data: { booking_id: booking.id }
                });
            }
        }

        logger.info('Booking cancelled', { bookingId: id, userId: req.user.id });

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: { booking: data }
        });
    } catch (error) {
        logger.error('Cancel booking controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking'
        });
    }
};

// ==================== ADMIN: QUOTE REQUESTS ====================

/**
 * Admin: Get all quote_pending bookings (Free Quote requests awaiting pricing)
 * GET /api/bookings/admin/quote-requests
 */
exports.getQuoteRequests = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const { data, error, count } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, slug, category_id, image_url),
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url,
                    city,
                    state
                )
            `, { count: 'exact' })
            .eq('status', 'quote_pending')
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) {
            logger.error('Get quote requests error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch quote requests'
            });
        }

        res.json({
            success: true,
            data: {
                quote_requests: data || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count || 0
                }
            }
        });
    } catch (error) {
        logger.error('Get quote requests controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote requests'
        });
    }
};

/**
 * Admin: Set price for a quote_pending booking and release to pros
 * PUT /api/bookings/admin/quote-requests/:id/set-price
 */
exports.setQuotePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { total_price, admin_notes } = req.body;

        if (!total_price || parseFloat(total_price) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid price greater than 0 is required'
            });
        }

        // Fetch the booking
        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*, services (id, name, category_id)')
            .eq('id', id)
            .eq('status', 'quote_pending')
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Quote request not found or already processed'
            });
        }

        const price = parseFloat(total_price);
        const tax = price * 0.08;
        const finalPrice = price + tax;

        // Update the booking with the new price and change status to 'pending'
        const { data: updatedBooking, error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({
                base_price: price,
                tax: tax,
                total_price: finalPrice,
                status: 'pending',
                admin_quote_notes: admin_notes || null,
                quote_set_at: new Date().toISOString(),
                quote_set_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Set quote price error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to set quote price'
            });
        }

        // Now notify nearby pros about this job
        if (booking.latitude && booking.longitude && booking.services?.category_id) {
            const nearbyPros = await findNearbyPros(
                booking.latitude, 
                booking.longitude, 
                booking.services.category_id
            );
            
            for (const pro of nearbyPros.slice(0, 5)) {
                await createNotification(pro.user_id, {
                    type: 'booking',
                    title: 'New Job Available',
                    message: `New ${booking.service_name} booking in ${booking.city}, ${booking.state}`,
                    link: `/pro/bookings/${booking.id}`,
                    data: { booking_id: booking.id }
                });
            }
        }

        // Notify the customer that their quote is ready
        await createNotification(booking.user_id, {
            type: 'booking',
            title: 'Your Quote is Ready!',
            message: `Your quote for ${booking.service_name} has been priced at $${finalPrice.toFixed(2)}. Proceed to payment to confirm your booking.`,
            link: `/checkout/${booking.id}`,
            data: { booking_id: booking.id }
        });

        logger.info('Quote price set', { 
            bookingId: id, 
            price: finalPrice, 
            adminId: req.user.id 
        });

        res.json({
            success: true,
            message: `Quote priced at $${finalPrice.toFixed(2)} and sent to pros`,
            data: { booking: updatedBooking }
        });
    } catch (error) {
        logger.error('Set quote price controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to set quote price'
        });
    }
};

/**
 * Admin: Cancel/reject a quote request
 * DELETE /api/bookings/admin/quote-requests/:id
 */
exports.cancelQuoteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', id)
            .eq('status', 'quote_pending')
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Quote request not found'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: req.user.id,
                cancellation_reason: reason || 'Quote request declined by admin'
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Cancel quote request error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel quote request'
            });
        }

        // Notify customer
        await createNotification(booking.user_id, {
            type: 'booking',
            title: 'Quote Request Update',
            message: reason || 'Unfortunately, we are unable to provide a quote for your request at this time.',
            link: `/dashboard`,
            data: { booking_id: booking.id }
        });

        logger.info('Quote request cancelled', { bookingId: id, adminId: req.user.id });

        res.json({
            success: true,
            message: 'Quote request cancelled',
            data: { booking: data }
        });
    } catch (error) {
        logger.error('Cancel quote request controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to cancel quote request'
        });
    }
};
