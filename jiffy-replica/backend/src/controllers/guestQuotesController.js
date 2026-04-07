const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { getTaxRate } = require('../utils/taxRate');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
    sendGuestQuoteConfirmationEmail,
    sendAdminNewGuestQuoteEmail,
    sendGuestQuoteEmail,
    sendGuestPaymentLinkEmail,
    sendGuestInvoiceEmail,
    sendProGuestQuoteAssignmentEmail,
    sendAdminProGuestQuoteSubmittedEmail,
} = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

// ==================== PUBLIC: Submit guest quote request ====================

exports.submitGuestQuote = async (req, res) => {
    try {
        const { guest_name, guest_email, guest_phone, service_id, address, city, state, zip_code, description, preferred_date, preferred_time } = req.body;

        // Validate required fields
        if (!guest_name || !guest_email || !guest_phone || !service_id || !address || !city || !state || !zip_code) {
            return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guest_email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        // Fetch service to get name
        const { data: service, error: serviceError } = await supabaseAdmin
            .from('services')
            .select('id, name')
            .eq('id', service_id)
            .single();

        if (serviceError || !service) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        // Generate request number: BW-GQ-XXXXXX
        const requestNumber = `BW-GQ-${crypto.randomInt(100000, 999999)}`;

        // Insert guest quote request
        const { data: guestRequest, error: insertError } = await supabaseAdmin
            .from('guest_quote_requests')
            .insert({
                request_number: requestNumber,
                guest_name,
                guest_email: guest_email.toLowerCase().trim(),
                guest_phone,
                service_id: service.id,
                service_name: service.name,
                address,
                city,
                state,
                zip_code,
                description: description || null,
                preferred_date: preferred_date || null,
                preferred_time: preferred_time || null,
                status: 'pending',
            })
            .select()
            .single();

        if (insertError) {
            logger.error('Failed to create guest quote request', { error: insertError.message });
            return res.status(500).json({ success: false, message: 'Failed to submit quote request.' });
        }

        // Send confirmation email to guest
        try {
            await sendGuestQuoteConfirmationEmail(guest_email, guest_name, guestRequest);
        } catch (emailErr) {
            logger.warn('Failed to send guest confirmation email', { error: emailErr.message });
        }

        // Notify all admins
        try {
            const { data: admins } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('role', 'admin');

            // In-app notifications
            for (const admin of (admins || [])) {
                await createNotification(admin.id, {
                    type: 'admin',
                    title: 'New Guest Quote Request',
                    message: `${guest_name} requested a quote for ${service.name} in ${city}, ${state}.`,
                    link: '/admin/guest-quotes',
                    data: { guest_request_id: guestRequest.id, type: 'guest_quote_request' },
                });
            }

            // Email admins
            const adminEmails = (admins || []).map(a => a.email).filter(Boolean);
            if (adminEmails.length > 0) {
                await sendAdminNewGuestQuoteEmail(adminEmails, guestRequest);
            }
        } catch (notifyErr) {
            logger.warn('Failed to notify admins about guest quote', { error: notifyErr.message });
        }

        logger.info('Guest quote request created', { request_id: guestRequest.id, service: service.name, guest_email });

        res.status(201).json({
            success: true,
            message: 'Your quote request has been submitted! We will contact you shortly.',
            data: { request_number: requestNumber },
        });
    } catch (error) {
        logger.error('Error submitting guest quote', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
};

// ==================== ADMIN: List all guest quote requests ====================

exports.getGuestQuotes = async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabaseAdmin
            .from('guest_quote_requests')
            .select('*, pro_profiles:assigned_pro_id (id, user_id, business_name)')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('Failed to fetch guest quote requests', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load guest quote requests.' });
        }

        res.json({ success: true, data: { requests: data || [] } });
    } catch (error) {
        logger.error('Error fetching guest quotes', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ==================== ADMIN: Get single guest quote request ====================

exports.getGuestQuote = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Guest quote request not found.' });
        }

        res.json({ success: true, data: { request: data } });
    } catch (error) {
        logger.error('Error fetching guest quote', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ==================== ADMIN: Update guest quote request (notes, status) ====================

exports.updateGuestQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_notes, status } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
        if (status) updateData.status = status;

        const { data, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update guest quote', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to update request.' });
        }

        res.json({ success: true, message: 'Request updated.', data: { request: data } });
    } catch (error) {
        logger.error('Error updating guest quote', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ==================== ADMIN: Send quote to guest via email ====================

exports.sendQuoteToGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { quoted_price, message } = req.body;

        // Fetch the current request
        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !current) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        // Use admin-provided price, or fall back to pro's submitted price
        const finalPrice = quoted_price || current.pro_quoted_price;
        if (!finalPrice || finalPrice <= 0) {
            return res.status(400).json({ success: false, message: 'A valid quoted price is required. Assign a pro and wait for their quotation first, or enter a price manually.' });
        }

        // Calculate tax (13% HST)
        const taxRate = await getTaxRate('quote');
        const taxAmount = Math.round(parseFloat(finalPrice) * taxRate * 100) / 100;

        // Update request with price
        const { data: request, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .update({
                quoted_price: parseFloat(finalPrice),
                tax_amount: taxAmount,
                status: 'quoted',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error || !request) {
            return res.status(500).json({ success: false, message: 'Failed to update request.' });
        }

        // Send quote email to guest
        await sendGuestQuoteEmail(request.guest_email, request.guest_name, request, message || '');

        logger.info('Quote sent to guest', { request_id: id, quoted_price: finalPrice, guest_email: request.guest_email });

        res.json({ success: true, message: 'Quote sent to the guest.', data: { request } });
    } catch (error) {
        logger.error('Error sending quote to guest', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send quote.' });
    }
};

// ==================== ADMIN: Create payment link and send to guest ====================

exports.sendPaymentLink = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: request, error: fetchError } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        if (!request.quoted_price || request.quoted_price <= 0) {
            return res.status(400).json({ success: false, message: 'A quote must be sent before creating a payment link.' });
        }

        const totalAmount = Math.round((request.quoted_price + (request.tax_amount || 0)) * 100); // cents

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: request.guest_email,
            line_items: [
                {
                    price_data: {
                        currency: 'cad',
                        product_data: {
                            name: `${request.service_name} — Quote #${request.request_number}`,
                            description: `Service at ${request.address}, ${request.city}, ${request.state} ${request.zip_code}`,
                        },
                        unit_amount: totalAmount,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                guest_quote_request_id: request.id,
                request_number: request.request_number,
                type: 'guest_quote',
            },
            success_url: `${process.env.FRONTEND_URL}/guest-payment-success?request=${request.request_number}`,
            cancel_url: `${process.env.FRONTEND_URL}/services`,
        });

        // Update request with Stripe info
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('guest_quote_requests')
            .update({
                stripe_session_id: session.id,
                stripe_payment_url: session.url,
                status: 'payment_sent',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Failed to update guest request with payment info', { error: updateError.message });
        }

        // Send payment link email to guest
        await sendGuestPaymentLinkEmail(request.guest_email, request.guest_name, updated || request, session.url);

        logger.info('Payment link sent to guest', { request_id: id, session_id: session.id });

        res.json({
            success: true,
            message: 'Payment link sent to the guest.',
            data: { request: updated || request, payment_url: session.url },
        });
    } catch (error) {
        logger.error('Error creating payment link', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to create payment link.' });
    }
};

// ==================== ADMIN: Send invoice email to guest ====================

exports.sendInvoiceToGuest = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: request, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        if (request.status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Invoice can only be sent after payment is received.' });
        }

        // Send invoice email
        await sendGuestInvoiceEmail(request.guest_email, request.guest_name, request);

        // Update invoice_sent_at
        await supabaseAdmin
            .from('guest_quote_requests')
            .update({ invoice_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id);

        logger.info('Invoice sent to guest', { request_id: id, guest_email: request.guest_email });

        res.json({ success: true, message: 'Invoice sent to the guest.' });
    } catch (error) {
        logger.error('Error sending invoice to guest', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send invoice.' });
    }
};

// ==================== ADMIN: Assign pro to guest quote request ====================

exports.assignProToGuestQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { pro_id } = req.body;

        if (!pro_id) {
            return res.status(400).json({ success: false, message: 'pro_id is required.' });
        }

        // Verify request exists and is pending
        const { data: request, error: fetchErr } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        if (!['pending', 'pro_assigned', 'pro_quoted', 'cancelled'].includes(request.status)) {
            return res.status(400).json({ success: false, message: 'This request cannot be assigned in its current status.' });
        }

        // Verify pro exists and is approved
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .eq('id', pro_id)
            .eq('admin_approved', true)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Approved pro not found.' });
        }

        // Update request with assigned pro
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('guest_quote_requests')
            .update({
                assigned_pro_id: pro_id,
                assigned_by: req.user.id,
                assigned_at: new Date().toISOString(),
                status: 'pro_assigned',
                // Clear any previous pro quote if re-assigning
                pro_quoted_price: null,
                pro_quote_description: null,
                pro_estimated_duration: null,
                pro_warranty_info: null,
                pro_notes: null,
                pro_quote_submitted_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) {
            logger.error('Failed to assign pro to guest quote', { error: updateErr.message });
            return res.status(500).json({ success: false, message: 'Failed to assign pro.' });
        }

        // Notify pro (in-app)
        await createNotification(proProfile.user_id, {
            type: 'booking',
            title: 'Guest Quote Assignment',
            message: `You've been assigned to provide a quote for ${request.service_name} — ${request.guest_name} in ${request.city}, ${request.state}.`,
            link: '/pro-dashboard?tab=quotes',
            data: { guest_request_id: request.id, type: 'guest_quote_assignment' },
        });

        // Email pro about the assignment
        try {
            const { data: proUser } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name')
                .eq('id', proProfile.user_id)
                .single();
            if (proUser?.email) {
                await sendProGuestQuoteAssignmentEmail(proUser.email, proUser.full_name || proProfile.business_name || 'Pro', request);
            }
        } catch (emailErr) {
            logger.error('Failed to send pro guest quote assignment email', { error: emailErr.message });
        }

        logger.info('Pro assigned to guest quote', { request_id: id, pro_id, admin_id: req.user.id });

        res.json({ success: true, message: `Pro "${proProfile.business_name}" assigned to this quote request.`, data: { request: updated } });
    } catch (error) {
        logger.error('Error assigning pro to guest quote', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to assign pro.' });
    }
};

// ==================== PRO: Get assigned guest quote requests ====================

exports.getProGuestQuoteAssignments = async (req, res) => {
    try {
        // Get pro profile
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(403).json({ success: false, message: 'Pro profile not found.' });
        }

        const { data: assignments, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('assigned_pro_id', proProfile.id)
            .in('status', ['pro_assigned', 'pro_quoted', 'quoted', 'payment_sent', 'paid', 'completed'])
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Failed to fetch pro guest quote assignments', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load assignments.' });
        }

        res.json({ success: true, data: { assignments: assignments || [] } });
    } catch (error) {
        logger.error('Error fetching pro guest quote assignments', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ==================== PRO: Get single guest quote assignment detail ====================

exports.getProGuestQuoteAssignmentDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(403).json({ success: false, message: 'Pro profile not found.' });
        }

        const { data: assignment, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .eq('assigned_pro_id', proProfile.id)
            .single();

        if (error || !assignment) {
            return res.status(404).json({ success: false, message: 'Guest quote assignment not found.' });
        }

        const canSubmitQuote = assignment.status === 'pro_assigned';
        const canEditQuote = assignment.status === 'pro_quoted';

        res.json({
            success: true,
            data: {
                assignment,
                can_submit_quote: canSubmitQuote,
                can_edit_quote: canEditQuote,
            },
        });
    } catch (error) {
        logger.error('Error fetching pro guest quote assignment detail', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ==================== PRO: Submit quotation for guest quote request ====================

exports.proSubmitGuestQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { quoted_price, description, estimated_duration, warranty_info, notes } = req.body;

        if (!quoted_price || parseFloat(quoted_price) <= 0) {
            return res.status(400).json({ success: false, message: 'A valid price greater than 0 is required.' });
        }

        // Get pro profile
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(403).json({ success: false, message: 'Pro profile not found.' });
        }

        // Verify this request is assigned to this pro
        const { data: request, error: fetchErr } = await supabaseAdmin
            .from('guest_quote_requests')
            .select('*')
            .eq('id', id)
            .eq('assigned_pro_id', proProfile.id)
            .single();

        if (fetchErr || !request) {
            return res.status(404).json({ success: false, message: 'This quote request is not assigned to you.' });
        }

        if (!['pro_assigned', 'pro_quoted'].includes(request.status)) {
            return res.status(400).json({ success: false, message: 'This request is no longer accepting quotes.' });
        }

        // Update with pro's quotation
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('guest_quote_requests')
            .update({
                pro_quoted_price: parseFloat(quoted_price),
                pro_quote_description: description || null,
                pro_estimated_duration: estimated_duration || null,
                pro_warranty_info: warranty_info || null,
                pro_notes: notes || null,
                pro_quote_submitted_at: new Date().toISOString(),
                status: 'pro_quoted',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) {
            logger.error('Failed to submit pro guest quote', { error: updateErr.message });
            return res.status(500).json({ success: false, message: 'Failed to submit quotation.' });
        }

        // Notify admins that pro submitted their quote
        try {
            const { data: admins } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('role', 'admin');

            for (const admin of (admins || [])) {
                await createNotification(admin.id, {
                    type: 'admin',
                    title: 'Pro Submitted Guest Quote',
                    message: `${proProfile.business_name || 'A pro'} submitted a quote of $${parseFloat(quoted_price).toFixed(2)} for ${request.service_name} (${request.request_number}).`,
                    link: '/admin/guest-quotes',
                    data: { guest_request_id: request.id, type: 'guest_quote_pro_submitted' },
                });
            }

            const adminEmails = (admins || []).map(a => a.email).filter(Boolean);
            if (adminEmails.length > 0) {
                await sendAdminProGuestQuoteSubmittedEmail(adminEmails, request, proProfile.business_name || 'Pro', parseFloat(quoted_price));
            }
        } catch (notifyErr) {
            logger.warn('Failed to notify admins about pro guest quote', { error: notifyErr.message });
        }

        // Notify pro (confirmation)
        await createNotification(proProfile.user_id, {
            type: 'booking',
            title: 'Quote Submitted',
            message: `Your quote of $${parseFloat(quoted_price).toFixed(2)} for ${request.service_name} has been submitted. Admin will review and send to the customer.`,
            link: '/pro-dashboard?tab=quotes',
            data: { guest_request_id: request.id, type: 'guest_quote_submitted' },
        });

        logger.info('Pro submitted guest quote', { request_id: id, pro_id: proProfile.id, quoted_price });

        res.json({ success: true, message: 'Quotation submitted successfully. Admin will review and forward to the customer.', data: { request: updated } });
    } catch (error) {
        logger.error('Error submitting pro guest quote', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to submit quotation.' });
    }
};

// ==================== WEBHOOK HELPER: Handle guest quote payment ====================

exports.handleGuestQuotePayment = async (session) => {
    try {
        const guestRequestId = session.metadata?.guest_quote_request_id;
        if (!guestRequestId) return;

        const { data: request, error } = await supabaseAdmin
            .from('guest_quote_requests')
            .update({
                status: 'paid',
                stripe_payment_intent_id: session.payment_intent,
                updated_at: new Date().toISOString(),
            })
            .eq('id', guestRequestId)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update guest quote after payment', { error: error.message, session_id: session.id });
            return;
        }

        // Notify admins that payment was received
        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        for (const admin of (admins || [])) {
            await createNotification(admin.id, {
                type: 'admin',
                title: 'Guest Quote Payment Received',
                message: `${request.guest_name} paid $${request.quoted_price} for ${request.service_name} (${request.request_number}).`,
                link: '/admin/guest-quotes',
                data: { guest_request_id: request.id, type: 'guest_quote_paid' },
            });
        }

        logger.info('Guest quote payment processed', { request_id: guestRequestId, amount: session.amount_total });
    } catch (error) {
        logger.error('Error handling guest quote payment webhook', { error: error.message });
    }
};
