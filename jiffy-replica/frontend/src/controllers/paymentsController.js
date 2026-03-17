const stripe = require('../config/stripe');
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// Platform commission rate (15% default)
const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.15');

exports.createPaymentIntent = async (req, res) => {
    try {
        const { booking_id } = req.body;

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, transactions(id, status)')
            .eq('id', booking_id)
            .eq('user_id', req.user.id)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Allow payment at booking time (pending) or after pro accepts (accepted)
        if (!['pending', 'accepted'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'Payment is not available for this booking status.'
            });
        }

        // Check if already paid/held
        const alreadyPaid = booking.transactions && booking.transactions.some(
            t => t.status === 'succeeded' || t.status === 'held'
        );
        if (alreadyPaid) {
            return res.status(400).json({
                success: false,
                message: 'Payment has already been made for this booking.'
            });
        }

        let customerId = req.profile.stripe_customer_id;

        // Verify existing customer is still valid on Stripe, or create a new one
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (custErr) {
                logger.warn('Stale stripe_customer_id, creating new customer', {
                    oldCustomerId: customerId,
                    userId: req.user.id,
                    error: custErr.message,
                });
                customerId = null; // force re-creation below
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: {
                    user_id: req.user.id
                }
            });
            customerId = customer.id;

            await supabaseAdmin
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', req.user.id);
        }

        // Build payment intent params with MANUAL capture (escrow hold)
        const paymentIntentParams = {
            amount: Math.round(booking.total_price * 100),
            currency: 'cad',
            customer: customerId,
            capture_method: 'manual', // ESCROW: authorize but don't charge yet
            metadata: {
                booking_id: booking.id,
                user_id: req.user.id
            },
            description: `Payment hold for ${booking.service_name}`
        };

        // If a pro is already assigned and has a Stripe Connect account, set up split
        if (booking.pro_id) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('stripe_account_id, commission_rate')
                .eq('id', booking.pro_id)
                .single();

            if (proProfile?.stripe_account_id) {
                // Use per-pro commission rate if set, otherwise fall back to platform default
                const commissionRate = proProfile.commission_rate != null
                    ? parseFloat(proProfile.commission_rate)
                    : PLATFORM_COMMISSION_RATE;
                const applicationFee = Math.round(
                    parseFloat(booking.base_price || booking.total_price) * commissionRate * 100
                );
                paymentIntentParams.application_fee_amount = applicationFee;
                paymentIntentParams.transfer_data = {
                    destination: proProfile.stripe_account_id,
                };

                logger.info('Payment split enabled', {
                    bookingId: booking.id,
                    proStripeAccount: proProfile.stripe_account_id,
                    applicationFee: applicationFee / 100,
                    commissionRate: commissionRate,
                    isCustomRate: proProfile.commission_rate != null,
                });
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        await supabaseAdmin
            .from('transactions')
            .insert({
                booking_id: booking.id,
                user_id: req.user.id,
                pro_id: booking.pro_id || null,
                stripe_payment_intent_id: paymentIntent.id,
                amount: booking.total_price,
                status: 'pending',
                description: `Payment hold for ${booking.service_name}`
            });

        logger.info('Escrow payment intent created (manual capture)', { 
            bookingId: booking.id, 
            paymentIntentId: paymentIntent.id 
        });

        res.json({
            success: true,
            data: {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id
            }
        });
    } catch (error) {
        logger.error('Create payment intent error', { 
            error: error.message, 
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
            stack: error.stack?.substring(0, 500)
        });
        res.status(500).json({
            success: false,
            message: 'Failed to create payment intent',
            debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

exports.handleWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            logger.error('Webhook signature verification failed', { error: err.message });
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'payment_intent.amount_capturable_updated':
                // Fires when manual-capture hold is confirmed on the card
                await handlePaymentHeld(event.data.object);
                break;
            case 'payment_intent.succeeded':
                // Fires when payment is actually captured (charged)
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            case 'payment_intent.canceled':
                await handlePaymentCanceled(event.data.object);
                break;
            default:
                logger.info('Unhandled event type', { type: event.type });
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('Webhook handler error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Webhook processing failed'
        });
    }
};

// Webhook: manual-capture hold confirmed on card
async function handlePaymentHeld(paymentIntent) {
    try {
        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'held' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select()
            .single();

        if (transaction) {
            // Mark booking as payment held
            await supabaseAdmin
                .from('bookings')
                .update({ payment_held_at: new Date().toISOString() })
                .eq('id', transaction.booking_id);

            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: transaction.user_id,
                    type: 'payment',
                    title: 'Payment Authorized',
                    message: 'Your payment has been authorized and is being held. It will only be charged after you confirm the job is complete.',
                    link: `/bookings/${transaction.booking_id}`
                });

            logger.info('Payment held (escrow)', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id
            });
        }
    } catch (error) {
        logger.error('Handle payment held error', { error: error.message });
    }
}

// Webhook: payment actually captured (charged)
async function handlePaymentSuccess(paymentIntent) {
    try {
        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'succeeded',
                stripe_charge_id: paymentIntent.latest_charge
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select()
            .single();

        if (transaction) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: transaction.user_id,
                    type: 'payment',
                    title: 'Payment Charged',
                    message: 'Your payment has been charged. Thank you for confirming the job!',
                    link: `/bookings/${transaction.booking_id}`
                });

            logger.info('Payment captured (succeeded)', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id
            });
        }
    } catch (error) {
        logger.error('Handle payment success error', { error: error.message });
    }
}

// Webhook: payment failed
async function handlePaymentFailure(paymentIntent) {
    try {
        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'failed' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select()
            .single();

        if (transaction) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: transaction.user_id,
                    type: 'payment',
                    title: 'Payment Failed',
                    message: 'Your payment could not be processed. Please try again.',
                    link: `/bookings/${transaction.booking_id}`
                });

            logger.warn('Payment failed', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id
            });
        }
    } catch (error) {
        logger.error('Handle payment failure error', { error: error.message });
    }
}

// Webhook: payment intent canceled (hold released / refunded)
async function handlePaymentCanceled(paymentIntent) {
    try {
        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select()
            .single();

        if (transaction) {
            await supabaseAdmin
                .from('bookings')
                .update({ refunded_at: new Date().toISOString() })
                .eq('id', transaction.booking_id);

            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: transaction.user_id,
                    type: 'payment',
                    title: 'Payment Refunded',
                    message: 'Your held payment has been released back to your card.',
                    link: `/bookings/${transaction.booking_id}`
                });

            logger.info('Payment canceled/refunded', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id
            });
        }
    } catch (error) {
        logger.error('Handle payment canceled error', { error: error.message });
    }
}

// Confirm payment hold after Stripe checkout (fallback for when webhooks don't fire in dev)
// With manual capture, the status after checkout is 'requires_capture' (funds held)
exports.confirmPayment = async (req, res) => {
    try {
        const { payment_intent_id, booking_id } = req.body;

        if (!payment_intent_id || !booking_id) {
            return res.status(400).json({
                success: false,
                message: 'payment_intent_id and booking_id are required'
            });
        }

        // Verify the payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        // With manual capture, after checkout the status is 'requires_capture' (held)
        if (paymentIntent.status === 'requires_capture') {
            // Funds are held — update transaction to 'held'
            const { data: transaction, error: txError } = await supabaseAdmin
                .from('transactions')
                .update({ status: 'held' })
                .eq('stripe_payment_intent_id', payment_intent_id)
                .eq('user_id', req.user.id)
                .select()
                .single();

            if (txError) {
                logger.error('Confirm payment - transaction update error', { error: txError.message });
            }

            // Mark booking as payment held
            await supabaseAdmin
                .from('bookings')
                .update({ payment_held_at: new Date().toISOString() })
                .eq('id', booking_id)
                .eq('user_id', req.user.id);

            logger.info('Payment hold confirmed via API (escrow)', {
                paymentIntentId: payment_intent_id,
                bookingId: booking_id,
                transactionId: transaction?.id
            });

            return res.json({
                success: true,
                data: { transaction, status: 'held' }
            });
        } else if (paymentIntent.status === 'succeeded') {
            // Already captured (shouldn't happen in normal flow but handle it)
            const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'succeeded',
                    stripe_charge_id: paymentIntent.latest_charge
                })
                .eq('stripe_payment_intent_id', payment_intent_id)
                .eq('user_id', req.user.id)
                .select()
                .single();

            return res.json({
                success: true,
                data: { transaction, status: 'confirmed' }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Payment not in expected state. Status: ${paymentIntent.status}`
            });
        }
    } catch (error) {
        logger.error('Confirm payment error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to confirm payment'
        });
    }
};

// Capture held funds — called when user confirms job is complete
exports.capturePayment = async (req, res) => {
    try {
        const { booking_id } = req.body;

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, transactions(id, status, stripe_payment_intent_id, amount)')
            .eq('id', booking_id)
            .eq('user_id', req.user.id)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Idempotency: if booking is already completed, return success
        if (booking.status === 'completed') {
            return res.json({
                success: true,
                message: 'Job is already completed.',
                data: { status: 'already_completed' }
            });
        }

        // Find the held transaction
        const heldTx = booking.transactions?.find(t => t.status === 'held');

        // If no held tx, check if it was already captured (succeeded) — idempotent retry
        if (!heldTx) {
            const succeededTx = booking.transactions?.find(t => t.status === 'succeeded');
            if (succeededTx) {
                // Stripe already captured, just ensure booking is marked completed
                await supabaseAdmin
                    .from('bookings')
                    .update({
                        status: 'completed',
                        user_confirmed_at: new Date().toISOString(),
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', booking_id);

                return res.json({
                    success: true,
                    message: 'Payment already captured. Job marked as completed.',
                    data: { status: 'captured' }
                });
            }

            return res.status(400).json({
                success: false,
                message: 'No held payment found for this booking.'
            });
        }

        // Check that proof has been submitted
        if (!booking.proof_submitted_at) {
            return res.status(400).json({
                success: false,
                message: 'Cannot release payment — the pro has not submitted proof of work yet.'
            });
        }

        // Capture the payment intent on Stripe
        const paymentIntent = await stripe.paymentIntents.capture(heldTx.stripe_payment_intent_id);

        // --- From here on, Stripe has captured. All DB updates are best-effort. ---
        // --- We must NOT return a 500 after Stripe capture succeeds. ---

        // If the PI was created WITHOUT transfer_data (homeowner paid before pro accepted),
        // create a separate Transfer to send the pro's share to their Connect account.
        let transferId = null;
        if (booking.pro_id && !paymentIntent.transfer_data) {
            try {
                const { data: proProfile } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('stripe_account_id, commission_rate')
                    .eq('id', booking.pro_id)
                    .single();

                if (proProfile?.stripe_account_id) {
                    const commissionRate = proProfile.commission_rate != null
                        ? parseFloat(proProfile.commission_rate)
                        : PLATFORM_COMMISSION_RATE;
                    const capturedAmount = paymentIntent.amount_received; // in cents
                    const platformFee = Math.round(capturedAmount * commissionRate);
                    const proShare = capturedAmount - platformFee;

                    if (proShare > 0) {
                        const transfer = await stripe.transfers.create({
                            amount: proShare,
                            currency: paymentIntent.currency,
                            destination: proProfile.stripe_account_id,
                            source_transaction: paymentIntent.latest_charge,
                            metadata: {
                                booking_id: booking.id,
                                commission_rate: commissionRate.toString(),
                                platform_fee_cents: platformFee.toString(),
                            },
                            description: `Pro payout for booking ${booking.booking_number || booking.id}`,
                        });
                        transferId = transfer.id;

                        logger.info('Pro payout transfer created', {
                            bookingId: booking.id,
                            transferId: transfer.id,
                            proShare: proShare / 100,
                            platformFee: platformFee / 100,
                            commissionRate,
                            destination: proProfile.stripe_account_id,
                        });
                    }
                }
            } catch (transferErr) {
                logger.error('capturePayment: pro transfer failed (non-fatal)', {
                    error: transferErr.message,
                    type: transferErr.type,
                    code: transferErr.code,
                    bookingId: booking.id,
                });
            }
        }

        // Update transaction to succeeded
        const txUpdateData = {
            status: 'succeeded',
            stripe_charge_id: paymentIntent.latest_charge,
        };
        if (transferId) {
            txUpdateData.metadata = { ...(heldTx.metadata || {}), transfer_id: transferId };
        }
        const { error: txUpdateErr } = await supabaseAdmin
            .from('transactions')
            .update(txUpdateData)
            .eq('id', heldTx.id);

        if (txUpdateErr) {
            logger.error('capturePayment: transaction update failed (non-fatal)', { error: txUpdateErr.message });
        }

        // Update booking
        const { error: bookingUpdateErr } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'completed',
                user_confirmed_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            })
            .eq('id', booking_id);

        if (bookingUpdateErr) {
            logger.error('capturePayment: booking update failed (non-fatal)', { error: bookingUpdateErr.message });
        }

        // Update pro stats (best-effort, don't let failures block the response)
        if (booking.pro_id) {
            try {
                const { data: currentPro } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('completed_jobs, total_jobs, user_id')
                    .eq('id', booking.pro_id)
                    .single();

                if (currentPro) {
                    await supabaseAdmin
                        .from('pro_profiles')
                        .update({
                            completed_jobs: (currentPro.completed_jobs || 0) + 1,
                            total_jobs: (currentPro.total_jobs || 0) + 1
                        })
                        .eq('id', booking.pro_id);

                    const proShareDisplay = transferId
                        ? ` Your share ($${((paymentIntent.amount_received - Math.round(paymentIntent.amount_received * PLATFORM_COMMISSION_RATE)) / 100).toFixed(2)}) has been transferred to your Stripe account.`
                        : '';
                    await supabaseAdmin
                        .from('notifications')
                        .insert({
                            user_id: currentPro.user_id,
                            type: 'payment',
                            title: 'Payment Released',
                            message: `The customer confirmed the job is complete. Payment of $${heldTx.amount} has been captured.${proShareDisplay}`,
                            link: `/pro/bookings/${booking_id}`,
                            data: { booking_id }
                        });
                }
            } catch (proErr) {
                logger.error('capturePayment: pro stats/notification update failed (non-fatal)', { error: proErr.message });
            }
        }

        logger.info('Payment captured (escrow released)', {
            bookingId: booking_id,
            paymentIntentId: heldTx.stripe_payment_intent_id,
            transferId: transferId || 'none (transfer_data was on PI)',
        });

        res.json({
            success: true,
            message: 'Payment released. Job marked as completed.',
            data: { status: 'captured' }
        });
    } catch (error) {
        logger.error('Capture payment error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to capture payment'
        });
    }
};

// Cancel held payment — refund the hold back to user
exports.cancelHeldPayment = async (req, res) => {
    try {
        const { booking_id, reason } = req.body;

        // Allow user or admin to cancel
        let bookingQuery = supabaseAdmin
            .from('bookings')
            .select('*, transactions(id, status, stripe_payment_intent_id)');

        if (req.profile.role === 'admin') {
            bookingQuery = bookingQuery.eq('id', booking_id);
        } else {
            bookingQuery = bookingQuery.eq('id', booking_id).eq('user_id', req.user.id);
        }

        const { data: booking, error: bookingError } = await bookingQuery.single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const heldTx = booking.transactions?.find(t => t.status === 'held');
        if (!heldTx) {
            return res.status(400).json({
                success: false,
                message: 'No held payment found for this booking.'
            });
        }

        // Cancel the payment intent on Stripe (releases the hold)
        await stripe.paymentIntents.cancel(heldTx.stripe_payment_intent_id);

        // Update transaction
        await supabaseAdmin
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', heldTx.id);

        // Update booking
        await supabaseAdmin
            .from('bookings')
            .update({
                refunded_at: new Date().toISOString(),
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason || 'Payment hold released'
            })
            .eq('id', booking_id);

        // Notify user
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'payment',
                title: 'Payment Refunded',
                message: reason || 'Your held payment has been released back to your card.',
                link: `/bookings/${booking_id}`
            });

        logger.info('Held payment canceled (refunded)', {
            bookingId: booking_id,
            paymentIntentId: heldTx.stripe_payment_intent_id,
            reason
        });

        res.json({
            success: true,
            message: 'Payment hold released. Funds will be returned to your card.',
            data: { status: 'refunded' }
        });
    } catch (error) {
        logger.error('Cancel held payment error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to cancel held payment'
        });
    }
};

// Dispute a booking — user claims pro didn't do the job
exports.disputeBooking = async (req, res) => {
    try {
        const { booking_id, reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a detailed reason for the dispute (at least 10 characters).'
            });
        }

        const { data: booking, error } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', booking_id)
            .eq('user_id', req.user.id)
            .in('status', ['accepted', 'in_progress'])
            .single();

        if (error || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not in a disputable state.'
            });
        }

        await supabaseAdmin
            .from('bookings')
            .update({
                status: 'disputed',
                disputed_at: new Date().toISOString(),
                dispute_reason: reason
            })
            .eq('id', booking_id);

        // Notify admins
        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        for (const admin of (admins || [])) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: admin.id,
                    type: 'system',
                    title: 'New Dispute',
                    message: `Booking ${booking.booking_number} has been disputed. Reason: ${reason}`,
                    link: `/admin/disputes/${booking_id}`,
                    data: { booking_id }
                });
        }

        // Notify pro
        if (booking.pro_id) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('user_id')
                .eq('id', booking.pro_id)
                .single();

            if (proProfile) {
                await supabaseAdmin
                    .from('notifications')
                    .insert({
                        user_id: proProfile.user_id,
                        type: 'booking',
                        title: 'Job Disputed',
                        message: `The customer has disputed booking ${booking.booking_number}. An admin will review.`,
                        link: `/pro/bookings/${booking_id}`,
                        data: { booking_id }
                    });
            }
        }

        logger.info('Booking disputed', { bookingId: booking_id, reason });

        res.json({
            success: true,
            message: 'Dispute submitted. An admin will review and resolve it.',
            data: { status: 'disputed' }
        });
    } catch (error) {
        logger.error('Dispute booking error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to submit dispute'
        });
    }
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const { data, error, count } = await supabaseAdmin
            .from('transactions')
            .select(`
                *,
                bookings (
                    booking_number,
                    service_name
                )
            `, { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error('Get transaction history error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction history'
            });
        }

        res.json({
            success: true,
            data: {
                transactions: data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get transaction history controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction history'
        });
    }
};
