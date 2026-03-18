const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { findNearbyPros } = require('../services/proMatchingService');
const { createNotification } = require('../services/notificationService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

// Helper function to get tax rate from platform_settings
// serviceType: 'rate', 'quote', or 'emergency'
const getTaxRate = async (serviceType = 'quote') => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'tax_rate')
            .eq('service_type', serviceType)
            .single();
        
        if (error || !data) {
            // Return default 13% if not found
            return 0.13;
        }
        return data.value / 100; // Convert percentage to decimal
    } catch (err) {
        logger.error('Error fetching tax rate', { error: err.message });
        return 0.13; // Default 13%
    }
};

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
        // Determine service type for tax: 'rate' for regular, 'quote' for free quote, 'emergency' for emergency
        const taxServiceType = isFreeQuote ? 'quote' : 'rate';
        const taxRateDecimal = isFreeQuote ? 0 : await getTaxRate(taxServiceType);
        const tax = isFreeQuote ? 0 : total_price * taxRateDecimal;
        total_price += tax;

        // Set status based on service type:
        // - 'awaiting_quotes' for Free Quote services (admin assigns pros, then pros submit quotes)
        // - 'pending' for rate-based services (pros see in job alerts and manually accept)
        const bookingStatus = isFreeQuote ? 'awaiting_quotes' : 'pending';

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

        // For Free Quote services: notify admins only (admin will assign pros)
        // For rate-based bookings: notify nearby pros (they can accept/decline)
        if (isFreeQuote) {
            // Notify admins about new quote request pending assignment
            const { data: admins } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'admin');
            
            for (const admin of (admins || [])) {
                await createNotification(admin.id, {
                    type: 'admin',
                    title: 'New Quote Request',
                    message: `New quote request for ${service.name} in ${city}, ${state}. Assign pros to this request.`,
                    link: `/admin/quote-assignments`,
                    data: { booking_id: booking.id, type: 'quote_assignment_needed' }
                });
            }
        } else {
            // Rate-based booking - notify nearby pros to accept/decline
            let nearbyPros = [];
            if (latitude && longitude) {
                nearbyPros = await findNearbyPros(latitude, longitude, service.category_id);
            }
            
            if (nearbyPros.length > 0) {
                // Send job alerts to nearby pros (up to 10)
                for (const pro of nearbyPros.slice(0, 10)) {
                    await createNotification(pro.user_id, {
                        type: 'booking',
                        title: 'New Job Available! 💼',
                        message: `${service.name} job in ${city}, ${state} - $${parseFloat(total_price).toFixed(2)}. Accept to start working.`,
                        link: `/pro-dashboard/jobs/${booking.id}`,
                        data: { booking_id: booking.id }
                    });
                }
                
                logger.info('Job alerts sent to nearby pros', { 
                    bookingId: booking.id, 
                    proCount: nearbyPros.slice(0, 10).length 
                });
            } else {
                // No nearby pros - notify admins
                const { data: admins } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('role', 'admin');
                
                for (const admin of (admins || [])) {
                    await createNotification(admin.id, {
                        type: 'admin',
                        title: 'No Nearby Pros Found',
                        message: `No pros available for ${service.name} in ${city}, ${state}. Consider expanding search radius.`,
                        link: `/admin/quote-assignments`,
                        data: { booking_id: booking.id, type: 'no_pros_found' }
                    });
                }
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
                ? 'Quote request submitted! Our team will review and assign qualified professionals shortly.'
                : 'Booking created! Nearby pros have been notified and can accept your job.',
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
        const taxRateDecimal = await getTaxRate('quote');
        const tax = price * taxRateDecimal;
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

// ==================== PRO: QUOTATION ENDPOINTS ====================

/**
 * Pro: Get all quote requests assigned to this pro by admin
 * GET /api/bookings/pro/quote-requests
 */
exports.getQuoteRequestsForPro = async (req, res) => {
    try {
        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, service_categories')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Get quote assignments for this pro (include all non-declined statuses)
        const { data: assignments, error: assignError } = await supabaseAdmin
            .from('quote_assignments')
            .select('booking_id, status')
            .eq('pro_id', proProfile.id)
            .in('status', ['invited', 'viewed', 'quoted', 'selected', 'accepted']);

        if (assignError) {
            // Table might not exist yet - return empty array
            logger.info('quote_assignments table may not exist yet', { error: assignError.message });
            return res.json({
                success: true,
                data: { 
                    bookings: [],
                    pro_id: proProfile.id
                }
            });
        }

        if (!assignments || assignments.length === 0) {
            return res.json({
                success: true,
                data: { 
                    bookings: [],
                    pro_id: proProfile.id
                }
            });
        }

        const assignedBookingIds = assignments.map(a => a.booking_id);
        const assignmentMap = assignments.reduce((acc, a) => {
            acc[a.booking_id] = a.status;
            return acc;
        }, {});

        // Get only bookings that this pro is assigned to
        // Include both 'awaiting_quotes' (available to bid) and 'accepted' (already submitted quote)
        // First get bookings without booking_quotations to avoid join ambiguity
        const { data: bookings, error: bookingsError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, category_id, image_url),
                profiles!bookings_user_id_fkey (id, full_name, avatar_url)
            `)
            .in('id', assignedBookingIds)
            .in('status', ['awaiting_quotes', 'accepted', 'in_progress', 'completed'])
            .order('created_at', { ascending: false });

        if (bookingsError) {
            logger.error('Get assigned bookings error', { error: bookingsError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch quote requests'
            });
        }

        // Fetch quotations separately to avoid join ambiguity
        let quotationsMap = {};
        if (bookings && bookings.length > 0) {
            const bookingIds = bookings.map(b => b.id);
            const { data: quotations } = await supabaseAdmin
                .from('booking_quotations')
                .select('id, booking_id, pro_id, status, quoted_price')
                .in('booking_id', bookingIds);
            
            // Group quotations by booking_id
            (quotations || []).forEach(q => {
                if (!quotationsMap[q.booking_id]) {
                    quotationsMap[q.booking_id] = [];
                }
                quotationsMap[q.booking_id].push(q);
            });
        }

        // Enrich bookings with assignment and quote status
        const enrichedBookings = (bookings || []).map(booking => {
            const bookingQuotations = quotationsMap[booking.id] || [];
            const myQuote = bookingQuotations.find(q => q.pro_id === proProfile.id);
            return {
                ...booking,
                assignment_status: assignmentMap[booking.id] || 'invited',
                has_submitted_quote: !!myQuote,
                my_quote_status: myQuote?.status || null,
                my_quoted_price: myQuote?.quoted_price || null,
                total_quotes: bookingQuotations.length
            };
        });

        res.json({
            success: true,
            data: { 
                bookings: enrichedBookings,
                pro_id: proProfile.id
            }
        });
    } catch (error) {
        logger.error('Get quote requests for pro controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote requests'
        });
    }
};

/**
 * Pro: Get single quote request details
 * GET /api/bookings/pro/quote-requests/:id
 */
exports.getQuoteRequestDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Get booking details - include all statuses for quote requests the pro is assigned to
        const { data: booking, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, category_id, image_url, description),
                profiles!bookings_user_id_fkey (id, full_name, avatar_url, phone)
            `)
            .eq('id', id)
            .in('status', ['awaiting_quotes', 'accepted', 'in_progress', 'completed'])
            .single();

        if (error || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Quote request not found or no longer available'
            });
        }

        // Check if pro already submitted a quote
        const { data: existingQuote } = await supabaseAdmin
            .from('booking_quotations')
            .select('*')
            .eq('booking_id', id)
            .eq('pro_id', proProfile.id)
            .single();

        res.json({
            success: true,
            data: { 
                booking,
                my_quotation: existingQuote || null,
                pro_id: proProfile.id
            }
        });
    } catch (error) {
        logger.error('Get quote request detail error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote request'
        });
    }
};

/**
 * Pro: Submit a quotation for a booking
 * POST /api/bookings/pro/quote-requests/:id/submit
 */
exports.submitQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            quoted_price,
            your_price,
            description, 
            estimated_duration,
            duration_unit,
            materials_included,
            materials_list,
            warranty_info,
            notes 
        } = req.body;

        // Validate price (use your_price if provided, otherwise quoted_price)
        const workPrice = your_price || quoted_price;
        if (!workPrice || parseFloat(workPrice) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid price greater than 0 is required'
            });
        }

        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Verify booking exists and is awaiting quotes
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, services (name)')
            .eq('id', id)
            .eq('status', 'awaiting_quotes')
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Quote request not found or no longer accepting quotes'
            });
        }

        // Check if pro already submitted a quote
        const { data: existingQuote } = await supabaseAdmin
            .from('booking_quotations')
            .select('id')
            .eq('booking_id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (existingQuote) {
            // Update existing quote
            // Note: Store materials_list and your_price in the notes field as JSON until DB columns are added
            const extendedNotesUpdate = materials_list || your_price || duration_unit 
                ? JSON.stringify({ 
                    original_notes: notes || '', 
                    your_price: your_price ? parseFloat(your_price) : null,
                    duration_unit: duration_unit || 'minutes',
                    materials_list: materials_list || []
                })
                : notes || null;

            const { data: updatedQuote, error: updateError } = await supabaseAdmin
                .from('booking_quotations')
                .update({
                    quoted_price: parseFloat(quoted_price),
                    description: description || null,
                    estimated_duration: estimated_duration || null,
                    materials_included: materials_included || false,
                    warranty_info: warranty_info || null,
                    notes: extendedNotesUpdate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingQuote.id)
                .select()
                .single();

            if (updateError) {
                logger.error('Update quotation error', { error: updateError.message });
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update quotation'
                });
            }

            logger.info('Quotation updated', { 
                quotationId: updatedQuote.id, 
                bookingId: id, 
                proId: proProfile.id 
            });

            return res.json({
                success: true,
                message: 'Quotation updated successfully',
                data: { quotation: updatedQuote }
            });
        }

        // Create new quotation
        // Note: Store materials_list and your_price in the notes field as JSON until DB columns are added
        const extendedNotes = materials_list || your_price || duration_unit 
            ? JSON.stringify({ 
                original_notes: notes || '', 
                your_price: your_price ? parseFloat(your_price) : null,
                duration_unit: duration_unit || 'minutes',
                materials_list: materials_list || []
            })
            : notes || null;

        // Create quotation with 'selected' status (auto-approved)
        const { data: quotation, error: quotationError } = await supabaseAdmin
            .from('booking_quotations')
            .insert({
                booking_id: id,
                pro_id: proProfile.id,
                quoted_price: parseFloat(quoted_price),
                description: description || null,
                estimated_duration: estimated_duration || null,
                materials_included: materials_included || false,
                warranty_info: warranty_info || null,
                notes: extendedNotes,
                status: 'selected',  // Auto-approve - goes directly to customer
                selected_at: new Date().toISOString()
            })
            .select()
            .single();

        if (quotationError) {
            logger.error('Submit quotation error', { error: quotationError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to submit quotation'
            });
        }

        // Calculate final price with tax
        const price = parseFloat(quoted_price);
        const taxRateDecimal = await getTaxRate('quote');
        const tax = price * taxRateDecimal;
        const finalPrice = price + tax;

        // Update booking with quotation details - job is now accepted, waiting for pro to complete work
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'accepted',  // Job accepted - pro will do work and submit proof
                selected_quotation_id: quotation.id,
                pro_id: proProfile.id,
                base_price: price,
                tax: tax,
                total_price: finalPrice,
                quote_set_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            logger.error('Update booking with quotation error', { error: updateError.message });
        }

        // Notify customer - quote accepted, pro will do the job and submit proof
        await createNotification(booking.user_id, {
            type: 'booking',
            title: 'Quote Accepted - Job Started! �',
            message: `${proProfile.business_name || 'A pro'} will complete your ${booking.service_name} (Total: $${finalPrice.toFixed(2)}). You'll pay after reviewing their proof of work.`,
            link: `/my-jobs`,
            data: { booking_id: id, quotation_id: quotation.id }
        });

        // Notify pro - they can start the job
        await createNotification(proProfile.user_id, {
            type: 'booking',
            title: 'Job Confirmed! Start Working 🎉',
            message: `Your quote of $${price.toFixed(2)} for ${booking.service_name} has been accepted. Complete the job and submit proof of work.`,
            link: `/pro-dashboard/jobs`,
            data: { booking_id: id, quotation_id: quotation.id }
        });

        // Notify admin about new quotation (for their records/copy)
        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        for (const admin of admins || []) {
            await createNotification(admin.id, {
                type: 'system',
                title: 'Quote Sent to Customer',
                message: `${proProfile.business_name || 'A pro'} submitted a quote of $${quoted_price} for ${booking.service_name}. Sent directly to customer.`,
                link: `/admin/quotations`,
                data: { booking_id: id, quotation_id: quotation.id }
            });
        }

        logger.info('Quotation submitted and auto-approved', { 
            quotationId: quotation.id, 
            bookingId: id, 
            proId: proProfile.id,
            price: quoted_price,
            finalPrice: finalPrice
        });

        res.status(201).json({
            success: true,
            message: 'Quotation submitted successfully! Customer has been notified and can proceed to payment.',
            data: { quotation }
        });
    } catch (error) {
        logger.error('Submit quotation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to submit quotation'
        });
    }
};

/**
 * Pro: Get my submitted quotations
 * GET /api/bookings/pro/my-quotations
 */
exports.getMyQuotations = async (req, res) => {
    try {
        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        const { data: quotations, error } = await supabaseAdmin
            .from('booking_quotations')
            .select(`
                *,
                bookings (
                    id,
                    booking_number,
                    service_name,
                    address,
                    city,
                    state,
                    scheduled_date,
                    scheduled_time,
                    status,
                    profiles!bookings_user_id_fkey (full_name)
                )
            `)
            .eq('pro_id', proProfile.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Get my quotations error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch quotations'
            });
        }

        res.json({
            success: true,
            data: { quotations }
        });
    } catch (error) {
        logger.error('Get my quotations controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotations'
        });
    }
};

// ==================== ADMIN: MULTI-QUOTATION MANAGEMENT ====================

/**
 * Admin: Get all bookings with their quotations
 * GET /api/bookings/admin/quotations
 */
exports.getAllQuotations = async (req, res) => {
    try {
        logger.info('getAllQuotations called');
        
        // Step 1: Get all bookings with awaiting_quotes or quote_approved status
        const { data: bookingsData, error: bookingsError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, image_url),
                profiles!bookings_user_id_fkey (id, full_name, email, phone)
            `)
            .in('status', ['awaiting_quotes', 'quote_approved'])
            .order('created_at', { ascending: false });

        if (bookingsError) {
            logger.error('Get bookings error', { error: bookingsError.message });
            return res.json({
                success: true,
                data: { bookings: [] }
            });
        }

        const bookings = bookingsData || [];
        logger.info('Found bookings', { count: bookings.length });
        
        if (bookings.length === 0) {
            return res.json({
                success: true,
                data: { bookings: [] }
            });
        }

        // Step 2: Get all quotations for these bookings
        const bookingIds = bookings.map(b => b.id);
        logger.info('Fetching quotations for booking IDs', { bookingIds });
        
        // Query booking_quotations table directly
        const { data: quotationsData, error: quotationsError } = await supabaseAdmin
            .from('booking_quotations')
            .select('*')
            .in('booking_id', bookingIds);

        logger.info('Quotations query result', { 
            success: !quotationsError,
            quotationsCount: quotationsData?.length || 0, 
            error: quotationsError?.message || null,
            quotations: quotationsData
        });

        let quotations = [];
        
        if (quotationsError) {
            logger.error('Get quotations error - table may not exist', { error: quotationsError.message });
            // Table doesn't exist, return bookings with empty quotations
        } else {
            quotations = quotationsData || [];
            
            // If we have quotations, fetch pro profiles separately
            if (quotations.length > 0) {
                const proIds = [...new Set(quotations.map(q => q.pro_id))];
                const { data: proProfiles } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('id, user_id, business_name, rating, total_jobs')
                    .in('id', proIds);
                
                // Attach pro profiles to quotations
                const proProfilesMap = (proProfiles || []).reduce((acc, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
                
                quotations = quotations.map(q => ({
                    ...q,
                    pro_profiles: proProfilesMap[q.pro_id] || null
                }));
            }
        }

        // Step 3: Merge quotations into bookings
        const bookingsWithQuotes = bookings.map(booking => ({
            ...booking,
            booking_quotations: quotations.filter(q => q.booking_id === booking.id)
        }));

        logger.info('Returning bookings with quotations', { 
            bookingsCount: bookingsWithQuotes.length,
            totalQuotations: quotations.length
        });

        res.json({
            success: true,
            data: { bookings: bookingsWithQuotes }
        });
    } catch (error) {
        logger.error('Get all quotations controller error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotations'
        });
    }
};

/**
 * Admin: Select a winning quotation
 * PUT /api/bookings/admin/quotations/:bookingId/select/:quotationId
 */
exports.selectQuotation = async (req, res) => {
    try {
        const { bookingId, quotationId } = req.params;
        const { admin_notes } = req.body;

        // Verify booking exists and is awaiting quotes
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, services (name)')
            .eq('id', bookingId)
            .eq('status', 'awaiting_quotes')
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not awaiting quotes'
            });
        }

        // Verify quotation exists
        const { data: quotation, error: quotationError } = await supabaseAdmin
            .from('booking_quotations')
            .select('*, pro_profiles (id, user_id, business_name)')
            .eq('id', quotationId)
            .eq('booking_id', bookingId)
            .single();

        if (quotationError || !quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Calculate final price with tax (using dynamic tax rate from database)
        const price = parseFloat(quotation.quoted_price);
        const taxRateDecimal = await getTaxRate('quote');
        const tax = price * taxRateDecimal;
        const finalPrice = price + tax;

        // Update the selected quotation status
        await supabaseAdmin
            .from('booking_quotations')
            .update({
                status: 'selected',
                selected_by: req.user.id,
                selected_at: new Date().toISOString(),
                admin_notes: admin_notes || null
            })
            .eq('id', quotationId);

        // Reject all other quotations for this booking
        await supabaseAdmin
            .from('booking_quotations')
            .update({
                status: 'rejected',
                rejection_reason: 'Another quotation was selected'
            })
            .eq('booking_id', bookingId)
            .neq('id', quotationId);

        // Update booking with selected quotation and price
        const { data: updatedBooking, error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'quote_approved',
                selected_quotation_id: quotationId,
                pro_id: quotation.pro_profiles.id,
                base_price: price,
                tax: tax,
                total_price: finalPrice,
                quote_set_at: new Date().toISOString(),
                quote_set_by: req.user.id
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) {
            logger.error('Select quotation update error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to select quotation'
            });
        }

        // Notify the winning pro
        await createNotification(quotation.pro_profiles.user_id, {
            type: 'booking',
            title: 'Your Quote Was Selected! 🎉',
            message: `Your quotation of $${price.toFixed(2)} for ${booking.service_name} was selected! Waiting for customer payment.`,
            link: `/pro-dashboard/jobs`,
            data: { booking_id: bookingId, quotation_id: quotationId }
        });

        // Notify rejected pros
        const { data: rejectedQuotes } = await supabaseAdmin
            .from('booking_quotations')
            .select('pro_profiles (user_id)')
            .eq('booking_id', bookingId)
            .eq('status', 'rejected');

        for (const rq of rejectedQuotes || []) {
            if (rq.pro_profiles?.user_id) {
                await createNotification(rq.pro_profiles.user_id, {
                    type: 'booking',
                    title: 'Quote Not Selected',
                    message: `Your quotation for ${booking.service_name} was not selected. Keep submitting quotes for other jobs!`,
                    link: `/pro-dashboard/quote-requests`,
                    data: { booking_id: bookingId }
                });
            }
        }

        // Notify customer that their quote is ready
        await createNotification(booking.user_id, {
            type: 'booking',
            title: 'Your Quote is Ready! 💰',
            message: `We found a great pro for your ${booking.service_name}! Total: $${finalPrice.toFixed(2)}. Review and pay to confirm.`,
            link: `/checkout/${bookingId}`,
            data: { booking_id: bookingId }
        });

        logger.info('Quotation selected', { 
            bookingId, 
            quotationId, 
            proId: quotation.pro_profiles.id,
            price: finalPrice,
            adminId: req.user.id 
        });

        res.json({
            success: true,
            message: `Quote selected! Customer notified. Total: $${finalPrice.toFixed(2)}`,
            data: { booking: updatedBooking, quotation }
        });
    } catch (error) {
        logger.error('Select quotation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to select quotation'
        });
    }
};

// ==================== ADMIN: QUOTE ASSIGNMENT MANAGEMENT ====================

/**
 * Admin: Get all pending quote requests that need pro assignment
 * GET /api/bookings/admin/pending-assignments
 */
exports.getPendingAssignments = async (req, res) => {
    try {
        // Get all bookings with status 'awaiting_quotes' that have no assignments yet
        // (Using awaiting_quotes only since pending_assignment enum doesn't exist in database)
        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, image_url, category_id),
                profiles!bookings_user_id_fkey (id, full_name, email, phone, avatar_url)
            `)
            .eq('status', 'awaiting_quotes')
            .eq('is_free_quote', true)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Get pending assignments error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch pending assignments'
            });
        }

        // Filter to only show bookings that have no assignments yet
        const bookingIds = (bookings || []).map(b => b.id);
        
        let assignedBookingIds = [];
        if (bookingIds.length > 0) {
            const { data: assignments } = await supabaseAdmin
                .from('quote_assignments')
                .select('booking_id')
                .in('booking_id', bookingIds);
            
            assignedBookingIds = (assignments || []).map(a => a.booking_id);
        }

        // Return bookings that don't have any assignments yet
        const pendingBookings = (bookings || []).filter(b => !assignedBookingIds.includes(b.id));

        res.json({
            success: true,
            data: { bookings: pendingBookings }
        });
    } catch (error) {
        logger.error('Get pending assignments controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending assignments'
        });
    }
};

/**
 * Admin: Get available pros for a quote request (filtered by service category and location)
 * GET /api/bookings/admin/available-pros/:bookingId
 */
exports.getAvailableProsForQuote = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Get booking details
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, services (id, name, category_id)')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Get ALL pros (no status filter since column doesn't exist)
        const { data: pros, error: prosError } = await supabaseAdmin
            .from('pro_profiles')
            .select(`
                id,
                user_id,
                business_name,
                service_categories,
                rating,
                total_jobs,
                is_verified,
                profiles!pro_profiles_user_id_fkey (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url
                )
            `)
            .order('rating', { ascending: false, nullsFirst: false });

        if (prosError) {
            logger.error('Get available pros error', { error: prosError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch available pros'
            });
        }

        // Show all pros - admin can choose any pro for any job
        let filteredPros = (pros || []).map(pro => ({
            ...pro,
            distance: null // Distance not available without lat/lng
        }));

        // Get existing assignments for this booking (table may not exist yet)
        let assignmentMap = {};
        try {
            const { data: existingAssignments, error: assignError } = await supabaseAdmin
                .from('quote_assignments')
                .select('pro_id, status')
                .eq('booking_id', bookingId);
            
            if (!assignError && existingAssignments) {
                assignmentMap = existingAssignments.reduce((acc, a) => {
                    acc[a.pro_id] = a.status;
                    return acc;
                }, {});
            }
        } catch (e) {
            // Table may not exist - continue without assignments
            logger.info('quote_assignments table may not exist yet');
        }

        // Add assignment status to each pro
        filteredPros = filteredPros.map(pro => ({
            ...pro,
            assignment_status: assignmentMap[pro.id] || null,
            is_assigned: !!assignmentMap[pro.id]
        }));

        res.json({
            success: true,
            data: { 
                booking,
                pros: filteredPros,
                total_pros: filteredPros.length,
                assigned_count: Object.keys(assignmentMap).length
            }
        });
    } catch (error) {
        logger.error('Get available pros controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available pros'
        });
    }
};

// Helper function to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Admin: Assign pros to a quote request
 * POST /api/bookings/admin/assign-pros
 */
exports.assignProsToQuote = async (req, res) => {
    try {
        const { bookingId, proIds } = req.body;

        if (!bookingId || !proIds || !Array.isArray(proIds) || proIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'bookingId and proIds array are required'
            });
        }

        // Verify booking exists and is awaiting_quotes (pending_assignment enum doesn't exist)
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, services (name)')
            .eq('id', bookingId)
            .eq('status', 'awaiting_quotes')
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not pending assignment'
            });
        }

        // Create quote_assignments for each pro (generate UUID since table doesn't have default)
        const assignments = proIds.map(proId => ({
            id: uuidv4(),
            booking_id: bookingId,
            pro_id: proId,
            assigned_by: req.user.id,
            status: 'invited'
        }));

        const { data: createdAssignments, error: assignError } = await supabaseAdmin
            .from('quote_assignments')
            .upsert(assignments, { onConflict: 'booking_id,pro_id' })
            .select();

        if (assignError) {
            logger.error('Assign pros error', { error: assignError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to assign pros'
            });
        }

        // Note: booking is already awaiting_quotes, no status update needed

        // Get pro user IDs for notifications
        const { data: proProfiles } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .in('id', proIds);

        // Notify assigned pros
        for (const pro of (proProfiles || [])) {
            await createNotification(pro.user_id, {
                type: 'booking',
                title: 'Quote Request Assigned',
                message: `You've been invited to submit a quote for ${booking.services?.name || booking.service_name} in ${booking.city}, ${booking.state}`,
                link: `/pro-dashboard/quote-requests/${bookingId}`,
                data: { booking_id: bookingId, type: 'quote_assignment' }
            });
        }

        logger.info('Pros assigned to quote', { 
            bookingId, 
            proIds, 
            assignedCount: createdAssignments?.length,
            adminId: req.user.id 
        });

        res.json({
            success: true,
            message: `${proIds.length} pro(s) assigned to this quote request`,
            data: { assignments: createdAssignments }
        });
    } catch (error) {
        logger.error('Assign pros controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to assign pros'
        });
    }
};

/**
 * Admin: Remove a pro from a quote assignment
 * DELETE /api/bookings/admin/assignments/:bookingId/:proId
 */
exports.removeProAssignment = async (req, res) => {
    try {
        const { bookingId, proId } = req.params;

        // Check if pro has already submitted a quote
        const { data: existingQuote } = await supabaseAdmin
            .from('booking_quotations')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('pro_id', proId)
            .single();

        if (existingQuote) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove assignment - pro has already submitted a quote'
            });
        }

        // Delete the assignment
        const { error } = await supabaseAdmin
            .from('quote_assignments')
            .delete()
            .eq('booking_id', bookingId)
            .eq('pro_id', proId);

        if (error) {
            logger.error('Remove pro assignment error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to remove assignment'
            });
        }

        res.json({
            success: true,
            message: 'Pro removed from quote request'
        });
    } catch (error) {
        logger.error('Remove pro assignment controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to remove assignment'
        });
    }
};

/**
 * Admin: Get assignment details for a booking
 * GET /api/bookings/admin/assignments/:bookingId
 */
exports.getBookingAssignments = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Get booking details
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, image_url),
                profiles!bookings_user_id_fkey (id, full_name, email, phone)
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Get all assignments for this booking
        const { data: assignments, error: assignError } = await supabaseAdmin
            .from('quote_assignments')
            .select(`
                *,
                pro_profiles (
                    id,
                    business_name,
                    rating,
                    total_jobs,
                    profiles!pro_profiles_user_id_fkey (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .eq('booking_id', bookingId);

        if (assignError) {
            logger.error('Get booking assignments error', { error: assignError.message });
        }

        // Get quotations for this booking
        const { data: quotations } = await supabaseAdmin
            .from('booking_quotations')
            .select('*')
            .eq('booking_id', bookingId);

        // Merge quotation data into assignments
        const quotationMap = (quotations || []).reduce((acc, q) => {
            acc[q.pro_id] = q;
            return acc;
        }, {});

        const enrichedAssignments = (assignments || []).map(a => ({
            ...a,
            quotation: quotationMap[a.pro_id] || null
        }));

        res.json({
            success: true,
            data: { 
                booking,
                assignments: enrichedAssignments,
                total_assigned: enrichedAssignments.length,
                total_quoted: quotations?.length || 0
            }
        });
    } catch (error) {
        logger.error('Get booking assignments controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments'
        });
    }
};

/**
 * Admin: Get all submitted proofs
 * GET /api/bookings/admin/proofs
 */
exports.getAllProofs = async (req, res) => {
    try {
        const { data: proofs, error } = await supabaseAdmin
            .from('job_proof')
            .select(`
                *,
                bookings (
                    id,
                    booking_number,
                    service_name,
                    status,
                    total_price,
                    user_id,
                    profiles!bookings_user_id_fkey (full_name, email)
                ),
                pro_profiles (
                    id,
                    business_name,
                    profiles (full_name, email)
                )
            `)
            .order('submitted_at', { ascending: false });

        if (error) {
            logger.error('Get all proofs error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch proofs' });
        }

        res.json({
            success: true,
            data: { proofs }
        });
    } catch (error) {
        logger.error('Get all proofs controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch proofs' });
    }
};

/**
 * Admin: Get all disputed bookings
 * GET /api/bookings/admin/disputes
 */
exports.getAllDisputes = async (req, res) => {
    try {
        const { data: disputes, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                profiles!bookings_user_id_fkey (id, full_name, email, avatar_url),
                pro_profiles (
                    id,
                    business_name,
                    profiles (full_name, email)
                ),
                job_proof (id, photos, notes, submitted_at)
            `)
            .eq('status', 'disputed')
            .order('disputed_at', { ascending: false });

        if (error) {
            logger.error('Get all disputes error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
        }

        // Get unread message counts for each dispute
        const disputeIds = disputes.map(d => d.id);
        const { data: unreadCounts } = await supabaseAdmin
            .from('dispute_messages')
            .select('booking_id')
            .in('booking_id', disputeIds)
            .eq('sender_role', 'customer')
            .eq('is_read', false);

        const unreadMap = (unreadCounts || []).reduce((acc, msg) => {
            acc[msg.booking_id] = (acc[msg.booking_id] || 0) + 1;
            return acc;
        }, {});

        const enrichedDisputes = disputes.map(d => ({
            ...d,
            unread_messages: unreadMap[d.id] || 0
        }));

        res.json({
            success: true,
            data: { disputes: enrichedDisputes }
        });
    } catch (error) {
        logger.error('Get all disputes controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
    }
};

/**
 * Admin: Get dispute details with messages
 * GET /api/bookings/admin/disputes/:bookingId
 */
exports.getDisputeDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                profiles!bookings_user_id_fkey (id, full_name, email, phone, avatar_url),
                pro_profiles (
                    id,
                    business_name,
                    profiles (full_name, email, phone)
                ),
                job_proof (id, photos, notes, submitted_at)
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Get dispute messages
        const { data: messages } = await supabaseAdmin
            .from('dispute_messages')
            .select(`
                *,
                sender:profiles!dispute_messages_sender_id_fkey (
                    id, full_name, avatar_url, role
                )
            `)
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true });

        // Mark customer messages as read
        await supabaseAdmin
            .from('dispute_messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('booking_id', bookingId)
            .eq('sender_role', 'customer')
            .eq('is_read', false);

        res.json({
            success: true,
            data: { 
                booking,
                messages: messages || []
            }
        });
    } catch (error) {
        logger.error('Get dispute details controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch dispute details' });
    }
};
