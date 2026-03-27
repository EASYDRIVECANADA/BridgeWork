const stripe = require('../config/stripe');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { writeAuditLog } = require('../services/auditService');
const { sendDisputeOpenedEmail, sendDisputeResolvedEmail } = require('../services/emailService');

// Platform commission rate (15% default)
const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.13');

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

        // Allow payment at booking time (pending), after pro accepts (accepted), or after proof submitted
        // proof_submitted = new flow where customer pays AFTER reviewing proof of work
        if (!['pending', 'accepted', 'proof_submitted'].includes(booking.status)) {
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
        // Use updated_total_price if additional invoice exists, otherwise use total_price
        const finalAmount = booking.updated_total_price || booking.total_price;
        const paymentIntentParams = {
            amount: Math.round(finalAmount * 100),
            currency: 'cad',
            customer: customerId,
            capture_method: 'manual', // ESCROW: authorize but don't charge yet
            metadata: {
                booking_id: booking.id,
                user_id: req.user.id,
                has_additional_invoice: booking.has_additional_invoice || false
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

        // Idempotency check — skip already-processed events (BUG-005 fix)
        const { data: existingEvent } = await supabaseAdmin
            .from('stripe_webhook_events')
            .select('id')
            .eq('id', event.id)
            .single();

        if (existingEvent) {
            logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
            return res.json({ received: true });
        }

        // Record event as processed before handling (prevent race on retries)
        await supabaseAdmin
            .from('stripe_webhook_events')
            .insert({ id: event.id, event_type: event.type });

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

// Webhook: payment intent canceled (hold released / refunded / expired)
async function handlePaymentCanceled(paymentIntent) {
    try {
        const isExpired = paymentIntent.cancellation_reason === 'automatic';

        const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select()
            .single();

        if (transaction) {
            // If Stripe auto-cancelled (7-day hold expired), also cancel the booking
            const bookingUpdate = { refunded_at: new Date().toISOString() };
            if (isExpired) {
                bookingUpdate.status = 'cancelled';
            }

            await supabaseAdmin
                .from('bookings')
                .update(bookingUpdate)
                .eq('id', transaction.booking_id);

            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: transaction.user_id,
                    type: 'payment',
                    title: isExpired ? 'Payment Hold Expired' : 'Payment Refunded',
                    message: isExpired
                        ? 'Your payment hold has expired after 7 days and was automatically released. No charges were made to your card.'
                        : 'Your held payment has been released back to your card.',
                    link: `/my-jobs`
                });

            // Notify admins about expired holds
            if (isExpired) {
                const { data: admins } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('role', 'admin')
                    .eq('is_active', true);

                if (admins && admins.length > 0) {
                    const adminNotifications = admins.map(admin => ({
                        user_id: admin.id,
                        type: 'admin',
                        title: 'Payment Hold Expired (Auto)',
                        message: `A payment hold for booking ${transaction.booking_id} expired after 7 days. The hold was automatically released by Stripe.`,
                        link: `/admin/revenue`,
                    }));
                    await supabaseAdmin.from('notifications').insert(adminNotifications);
                }
            }

            logger.info(isExpired ? 'Payment hold expired (Stripe auto-cancel)' : 'Payment canceled/refunded', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id,
                isExpired,
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

        // Pay the pro: either via Stripe Connect transfer or record in e-Transfer ledger
        let transferId = null;
        if (booking.pro_id) {
            try {
                const { data: proProfile } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('id, user_id, stripe_account_id, commission_rate, payout_method, etransfer_email')
                    .eq('id', booking.pro_id)
                    .single();

                if (proProfile) {
                    const commissionRate = proProfile.commission_rate != null
                        ? parseFloat(proProfile.commission_rate)
                        : PLATFORM_COMMISSION_RATE;
                    const capturedAmount = paymentIntent.amount_received; // in cents
                    const platformFee = Math.round(capturedAmount * commissionRate);
                    const proShare = capturedAmount - platformFee;

                    const useStripeConnect = proProfile.payout_method === 'stripe_connect'
                        && proProfile.stripe_account_id
                        && !paymentIntent.transfer_data;

                    if (proShare > 0 && useStripeConnect) {
                        // Stripe Connect: automated transfer
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

                        // Also record in ledger for tracking
                        await supabaseAdmin.from('pro_payouts').insert({
                            pro_profile_id: proProfile.id,
                            user_id: proProfile.user_id,
                            type: 'earning',
                            booking_id: booking.id,
                            transaction_id: heldTx.id,
                            amount: proShare / 100,
                            platform_fee: platformFee / 100,
                            commission_rate: commissionRate,
                            payout_method: 'stripe_transfer',
                            payout_reference: transfer.id,
                            paid_at: new Date().toISOString(),
                            status: 'completed',
                        });

                        logger.info('Pro payout via Stripe Connect', {
                            bookingId: booking.id,
                            transferId: transfer.id,
                            proShare: proShare / 100,
                            platformFee: platformFee / 100,
                            commissionRate,
                            destination: proProfile.stripe_account_id,
                        });
                    } else if (proShare > 0) {
                        // e-Transfer (or no Stripe account): record earning in ledger for admin to pay out manually
                        await supabaseAdmin.from('pro_payouts').insert({
                            pro_profile_id: proProfile.id,
                            user_id: proProfile.user_id,
                            type: 'earning',
                            booking_id: booking.id,
                            transaction_id: heldTx.id,
                            amount: proShare / 100,
                            platform_fee: platformFee / 100,
                            commission_rate: commissionRate,
                            status: 'completed',
                        });

                        logger.info('Pro earning recorded for manual payout', {
                            bookingId: booking.id,
                            proShare: proShare / 100,
                            platformFee: platformFee / 100,
                            commissionRate,
                            payoutMethod: proProfile.payout_method || 'e_transfer',
                        });
                    }
                }
            } catch (transferErr) {
                logger.error('capturePayment: pro payout/earning failed (non-fatal)', {
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

// Dispute a booking — user disputes the proof of work
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
            .in('status', ['accepted', 'in_progress', 'proof_submitted'])
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
                dispute_reason: reason,
                dispute_status: 'open'
            })
            .eq('id', booking_id);

        // Create initial dispute message from customer
        await supabaseAdmin
            .from('dispute_messages')
            .insert({
                booking_id: booking_id,
                sender_id: req.user.id,
                sender_role: 'customer',
                message: reason
            });

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
                    title: '🚨 New Dispute - Action Required',
                    message: `Booking ${booking.booking_number} has been disputed. Customer needs assistance. Reason: ${reason.substring(0, 100)}...`,
                    link: `/admin/disputes`,
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
                        message: `The customer has disputed booking ${booking.booking_number}. An admin will review and contact you if needed.`,
                        link: `/pro-dashboard/jobs`,
                        data: { booking_id }
                    });

                // Send dispute-opened email to pro
                try {
                    const { data: proUser } = await supabaseAdmin
                        .from('profiles')
                        .select('email, full_name')
                        .eq('id', proProfile.user_id)
                        .single();
                    if (proUser?.email) {
                        await sendDisputeOpenedEmail(proUser.email, proUser.full_name || 'Pro', booking, reason);
                    }
                } catch (emailErr) {
                    logger.error('Failed to send dispute opened email to pro', { error: emailErr.message });
                }
            }
        }

        // Send dispute-opened email to customer
        try {
            const { data: customerProfile } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name')
                .eq('id', req.user.id)
                .single();
            if (customerProfile?.email) {
                await sendDisputeOpenedEmail(customerProfile.email, customerProfile.full_name || 'Customer', booking, reason);
            }
        } catch (emailErr) {
            logger.error('Failed to send dispute opened email to customer', { error: emailErr.message });
        }

        logger.info('Booking disputed', { bookingId: booking_id, reason });

        res.json({
            success: true,
            message: 'Dispute submitted. An admin will contact you shortly to resolve this.',
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

// Get dispute messages for a booking (customer or admin)
exports.getDisputeMessages = async (req, res) => {
    try {
        const { booking_id } = req.params;

        // Verify access - customer owns booking or user is admin
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('user_id, status')
            .eq('id', booking_id)
            .single();

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const isAdmin = req.profile?.role === 'admin';
        const isCustomer = booking.user_id === req.user.id;

        if (!isAdmin && !isCustomer) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { data: messages, error } = await supabaseAdmin
            .from('dispute_messages')
            .select(`
                *,
                sender:profiles!dispute_messages_sender_id_fkey (
                    id, full_name, avatar_url, role
                )
            `)
            .eq('booking_id', booking_id)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('Get dispute messages error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
        }

        // Mark messages as read
        if (isCustomer) {
            await supabaseAdmin
                .from('dispute_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('booking_id', booking_id)
                .eq('sender_role', 'admin')
                .eq('is_read', false);
        } else if (isAdmin) {
            await supabaseAdmin
                .from('dispute_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('booking_id', booking_id)
                .eq('sender_role', 'customer')
                .eq('is_read', false);
        }

        res.json({ success: true, data: { messages } });
    } catch (error) {
        logger.error('Get dispute messages error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

// Send dispute message (customer or admin)
exports.sendDisputeMessage = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Verify access
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('user_id, status, booking_number')
            .eq('id', booking_id)
            .eq('status', 'disputed')
            .single();

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Disputed booking not found' });
        }

        const isAdmin = req.profile?.role === 'admin';
        const isCustomer = booking.user_id === req.user.id;

        if (!isAdmin && !isCustomer) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const senderRole = isAdmin ? 'admin' : 'customer';

        const { data: newMessage, error } = await supabaseAdmin
            .from('dispute_messages')
            .insert({
                booking_id,
                sender_id: req.user.id,
                sender_role: senderRole,
                message: message.trim()
            })
            .select()
            .single();

        if (error) {
            logger.error('Send dispute message error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to send message' });
        }

        // Notify the other party
        if (isAdmin) {
            // Notify customer
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: booking.user_id,
                    type: 'system',
                    title: 'New Message from Support',
                    message: `Admin replied to your dispute for booking ${booking.booking_number}`,
                    link: `/my-jobs?dispute=${booking_id}`,
                    data: { booking_id }
                });
        } else {
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
                        title: 'Customer Replied to Dispute',
                        message: `New message in dispute for booking ${booking.booking_number}`,
                        link: `/admin/disputes`,
                        data: { booking_id }
                    });
            }
        }

        res.json({ success: true, data: { message: newMessage } });
    } catch (error) {
        logger.error('Send dispute message error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// Admin: Resolve dispute
exports.resolveDispute = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const { resolution, action } = req.body;
        // action: 'approve' (force customer to pay), 'revision' (pro must redo), 'refund' (cancel job)

        if (!resolution || !action) {
            return res.status(400).json({ 
                success: false, 
                message: 'Resolution notes and action are required' 
            });
        }

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*, pro_profiles(user_id, business_name)')
            .eq('id', booking_id)
            .eq('status', 'disputed')
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ success: false, message: 'Disputed booking not found' });
        }

        let newStatus = 'disputed';
        let customerMessage = '';
        let proMessage = '';

        if (action === 'approve') {
            // Admin approves the proof - customer must pay
            newStatus = 'proof_submitted';
            customerMessage = `Your dispute has been reviewed. The admin has approved the proof of work. Please proceed to payment.`;
            proMessage = `The dispute for booking ${booking.booking_number} has been resolved in your favor. Customer will proceed to payment.`;
        } else if (action === 'revision') {
            // Pro must redo the work
            newStatus = 'accepted';
            customerMessage = `Your dispute has been reviewed. The pro will revise their work and submit new proof.`;
            proMessage = `The dispute for booking ${booking.booking_number} requires you to revise your work. Please complete the revisions and submit new proof.`;
        } else if (action === 'refund') {
            // Cancel the job
            newStatus = 'cancelled';
            customerMessage = `Your dispute has been resolved. The job has been cancelled.`;
            proMessage = `The dispute for booking ${booking.booking_number} has resulted in job cancellation.`;
        }

        await supabaseAdmin
            .from('bookings')
            .update({
                status: newStatus,
                dispute_status: 'resolved',
                dispute_resolved_at: new Date().toISOString(),
                dispute_resolution: resolution,
                dispute_admin_id: req.user.id,
                ...(action === 'refund' ? { cancelled_at: new Date().toISOString() } : {}),
                ...(action === 'revision' ? { proof_submitted_at: null } : {})
            })
            .eq('id', booking_id);

        // Send resolution message in chat
        await supabaseAdmin
            .from('dispute_messages')
            .insert({
                booking_id,
                sender_id: req.user.id,
                sender_role: 'admin',
                message: `🔔 DISPUTE RESOLVED: ${resolution}\n\nAction taken: ${action.toUpperCase()}`
            });

        // Notify customer
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'system',
                title: 'Dispute Resolved',
                message: customerMessage,
                link: `/my-jobs`,
                data: { booking_id }
            });

        // Notify pro
        if (booking.pro_profiles?.user_id) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: booking.pro_profiles.user_id,
                    type: 'booking',
                    title: 'Dispute Resolved',
                    message: proMessage,
                    link: `/pro-dashboard/jobs`,
                    data: { booking_id }
                });
        }

        // Send dispute-resolved emails
        try {
            const { data: customerProfile } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name')
                .eq('id', booking.user_id)
                .single();
            if (customerProfile?.email) {
                await sendDisputeResolvedEmail(customerProfile.email, customerProfile.full_name || 'Customer', booking, resolution);
            }
        } catch (emailErr) {
            logger.error('Failed to send dispute resolved email to customer', { error: emailErr.message });
        }

        if (booking.pro_profiles?.user_id) {
            try {
                const { data: proUser } = await supabaseAdmin
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', booking.pro_profiles.user_id)
                    .single();
                if (proUser?.email) {
                    await sendDisputeResolvedEmail(proUser.email, proUser.full_name || 'Pro', booking, resolution);
                }
            } catch (emailErr) {
                logger.error('Failed to send dispute resolved email to pro', { error: emailErr.message });
            }
        }

        await writeAuditLog(req.user.id, 'resolve_dispute', 'booking', booking_id, { action, resolution, new_status: newStatus });

        logger.info('Dispute resolved', { bookingId: booking_id, action, adminId: req.user.id });

        res.json({
            success: true,
            message: `Dispute resolved with action: ${action}`,
            data: { status: newStatus }
        });
    } catch (error) {
        logger.error('Resolve dispute error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
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
