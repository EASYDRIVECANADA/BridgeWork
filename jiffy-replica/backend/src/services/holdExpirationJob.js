const cron = require('node-cron');
const stripe = require('../config/stripe');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.13');

// Thresholds in hours
const WARNING_THRESHOLD_HOURS = 144;    // 6 days — send warning
const AUTO_CAPTURE_THRESHOLD_HOURS = 156; // 6.5 days — auto-capture if proof exists
const CANCEL_THRESHOLD_HOURS = 156;     // 6.5 days — cancel if no proof

/**
 * Finds held transactions older than `hoursOld` hours.
 */
async function getAgingHeldTransactions(hoursOld) {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('id, booking_id, user_id, stripe_payment_intent_id, amount, metadata, created_at')
        .eq('status', 'held')
        .lt('created_at', cutoff);

    if (error) {
        logger.error('Failed to query aging held transactions', { error: error.message });
        return [];
    }
    return data || [];
}

/**
 * Auto-captures a held payment when proof has been submitted but customer hasn't confirmed.
 */
async function autoCaptureHold(transaction, booking) {
    try {
        const paymentIntent = await stripe.paymentIntents.capture(transaction.stripe_payment_intent_id);

        // Record pro payout (mirrors capturePayment controller logic)
        if (booking.pro_id) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id, user_id, stripe_account_id, commission_rate, payout_method')
                .eq('id', booking.pro_id)
                .single();

            if (proProfile) {
                const commissionRate = proProfile.commission_rate != null
                    ? parseFloat(proProfile.commission_rate)
                    : PLATFORM_COMMISSION_RATE;
                const capturedAmount = paymentIntent.amount_received;
                const platformFee = Math.round(capturedAmount * commissionRate);
                const proShare = capturedAmount - platformFee;

                if (proShare > 0 && proProfile.payout_method === 'stripe_connect' && proProfile.stripe_account_id) {
                    const transfer = await stripe.transfers.create({
                        amount: proShare,
                        currency: paymentIntent.currency,
                        destination: proProfile.stripe_account_id,
                        source_transaction: paymentIntent.latest_charge,
                        metadata: {
                            booking_id: booking.id,
                            commission_rate: commissionRate.toString(),
                            auto_captured: 'true',
                        },
                        description: `Auto-captured payout for booking ${booking.booking_number || booking.id}`,
                    });

                    await supabaseAdmin.from('pro_payouts').insert({
                        pro_profile_id: proProfile.id,
                        user_id: proProfile.user_id,
                        type: 'earning',
                        booking_id: booking.id,
                        transaction_id: transaction.id,
                        amount: proShare / 100,
                        platform_fee: platformFee / 100,
                        commission_rate: commissionRate,
                        payout_method: 'stripe_transfer',
                        payout_reference: transfer.id,
                        paid_at: new Date().toISOString(),
                        status: 'completed',
                    });
                } else if (proShare > 0) {
                    await supabaseAdmin.from('pro_payouts').insert({
                        pro_profile_id: proProfile.id,
                        user_id: proProfile.user_id,
                        type: 'earning',
                        booking_id: booking.id,
                        transaction_id: transaction.id,
                        amount: proShare / 100,
                        platform_fee: platformFee / 100,
                        commission_rate: commissionRate,
                        status: 'completed',
                    });
                }
            }
        }

        // Update transaction
        await supabaseAdmin.from('transactions').update({
            status: 'succeeded',
            stripe_charge_id: paymentIntent.latest_charge,
        }).eq('id', transaction.id);

        // Mark booking completed
        await supabaseAdmin.from('bookings').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        }).eq('id', booking.id);

        // Notify customer
        await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            type: 'payment',
            title: 'Payment Auto-Captured',
            message: 'Your held payment was automatically captured because the pro submitted proof of completed work. The payment hold was approaching its expiration.',
            link: `/my-jobs`,
        });

        logger.info('Payment auto-captured before hold expiration', {
            bookingId: booking.id,
            transactionId: transaction.id,
            paymentIntentId: transaction.stripe_payment_intent_id,
        });

        return true;
    } catch (error) {
        logger.error('Auto-capture failed', {
            transactionId: transaction.id,
            error: error.message,
        });
        return false;
    }
}

/**
 * Cancels a held payment that has no proof and is about to expire.
 */
async function cancelExpiringHold(transaction, booking) {
    try {
        await stripe.paymentIntents.cancel(transaction.stripe_payment_intent_id);

        await supabaseAdmin.from('transactions').update({
            status: 'refunded',
        }).eq('id', transaction.id);

        await supabaseAdmin.from('bookings').update({
            status: 'cancelled',
            refunded_at: new Date().toISOString(),
        }).eq('id', booking.id);

        // Notify customer
        await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            type: 'payment',
            title: 'Payment Hold Expired',
            message: 'Your payment hold has been released because the service professional did not submit proof of completion within the required timeframe. No charges were made.',
            link: `/my-jobs`,
        });

        logger.info('Expiring hold cancelled proactively', {
            bookingId: booking.id,
            transactionId: transaction.id,
        });

        return true;
    } catch (error) {
        logger.error('Cancel expiring hold failed', {
            transactionId: transaction.id,
            error: error.message,
        });
        return false;
    }
}

/**
 * Sends a warning notification for holds approaching expiration.
 */
async function sendExpirationWarning(transaction, booking) {
    try {
        // Check if warning already sent (stored in transaction metadata)
        if (transaction.metadata?.hold_expiry_warned) {
            return;
        }

        // Notify customer
        await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            type: 'payment',
            title: 'Payment Hold Expiring Soon',
            message: booking.proof_submitted_at
                ? 'Your payment hold expires soon. Please review the completed work and confirm payment to avoid automatic capture.'
                : 'Your payment hold expires soon. The service professional has not yet submitted proof of work. The hold will be released if no action is taken.',
            link: `/my-jobs`,
        });

        // Notify all admins
        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .eq('is_active', true);

        if (admins && admins.length > 0) {
            const adminNotifications = admins.map(admin => ({
                user_id: admin.id,
                type: 'admin',
                title: 'Payment Hold Expiring',
                message: `Booking ${booking.booking_number || booking.id} has a payment hold expiring within 24 hours. ${booking.proof_submitted_at ? 'Proof has been submitted — will auto-capture if customer does not act.' : 'No proof submitted — hold will be cancelled.'}`,
                link: `/admin/revenue`,
            }));

            await supabaseAdmin.from('notifications').insert(adminNotifications);
        }

        // Mark warning as sent in transaction metadata
        const existingMeta = transaction.metadata || {};
        await supabaseAdmin.from('transactions').update({
            metadata: { ...existingMeta, hold_expiry_warned: true, warned_at: new Date().toISOString() },
        }).eq('id', transaction.id);

        logger.info('Hold expiration warning sent', {
            bookingId: booking.id,
            transactionId: transaction.id,
            hasProof: !!booking.proof_submitted_at,
        });
    } catch (error) {
        logger.error('Failed to send expiration warning', {
            transactionId: transaction.id,
            error: error.message,
        });
    }
}

/**
 * Main job: checks for expiring payment holds and takes appropriate action.
 * Runs every hour.
 */
async function checkExpiringHolds() {
    logger.info('Hold expiration check started');

    try {
        // 1. Auto-capture holds >= 6.5 days old where proof exists
        const captureCandiates = await getAgingHeldTransactions(AUTO_CAPTURE_THRESHOLD_HOURS);
        for (const tx of captureCandiates) {
            const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select('id, pro_id, status, proof_submitted_at, booking_number, updated_total_price, total_price')
                .eq('id', tx.booking_id)
                .single();

            if (!booking) continue;

            if (booking.proof_submitted_at) {
                await autoCaptureHold(tx, booking);
            } else {
                await cancelExpiringHold(tx, booking);
            }
        }

        // 2. Send warnings for holds >= 6 days old (that haven't been warned yet)
        const warningCandidates = await getAgingHeldTransactions(WARNING_THRESHOLD_HOURS);
        for (const tx of warningCandidates) {
            // Skip if already processed above (>= 6.5 days)
            if (captureCandiates.some(c => c.id === tx.id)) continue;

            const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select('id, proof_submitted_at, booking_number')
                .eq('id', tx.booking_id)
                .single();

            if (!booking) continue;
            await sendExpirationWarning(tx, booking);
        }

        logger.info('Hold expiration check completed');
    } catch (error) {
        logger.error('Hold expiration check failed', { error: error.message });
    }
}

/**
 * Starts the hourly cron job for payment hold expiration.
 */
function startHoldExpirationJob() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', () => {
        checkExpiringHolds();
    });

    logger.info('Payment hold expiration cron job scheduled (hourly)');
}

module.exports = { startHoldExpirationJob, checkExpiringHolds };
