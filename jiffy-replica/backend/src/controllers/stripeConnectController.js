const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Platform commission rate (15%)
const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.15');

/**
 * Create a Stripe Connect account for a pro and return the onboarding link.
 * POST /api/payments/connect/onboard
 */
exports.createConnectAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found. You must be an approved pro to set up payouts.'
            });
        }

        // If they already have a Stripe account, check its status
        if (proProfile.stripe_account_id) {
            const account = await stripe.accounts.retrieve(proProfile.stripe_account_id);

            // If details already submitted, no need for another onboarding link
            if (account.details_submitted) {
                return res.json({
                    success: true,
                    data: {
                        account_id: proProfile.stripe_account_id,
                        already_exists: true,
                        details_submitted: true,
                        charges_enabled: account.charges_enabled,
                        payouts_enabled: account.payouts_enabled,
                    }
                });
            }

            // Need to finish onboarding — create account link (requires HTTPS in live mode)
            const accountLink = await stripe.accountLinks.create({
                account: proProfile.stripe_account_id,
                refresh_url: `${FRONTEND_URL}/pro-onboarding?stripe=refresh`,
                return_url: `${FRONTEND_URL}/pro-onboarding?stripe=success`,
                type: 'account_onboarding',
            });

            return res.json({
                success: true,
                data: {
                    url: accountLink.url,
                    account_id: proProfile.stripe_account_id,
                    already_exists: true,
                    details_submitted: false,
                }
            });
        }

        // Create a new Stripe Connect Express account
        const account = await stripe.accounts.create({
            type: 'express',
            email: req.user.email,
            metadata: {
                user_id: userId,
                pro_profile_id: proProfile.id,
            },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        // Save the account ID to the pro profile
        await supabaseAdmin
            .from('pro_profiles')
            .update({ stripe_account_id: account.id })
            .eq('id', proProfile.id);

        // Create an onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${FRONTEND_URL}/pro-dashboard?stripe=refresh`,
            return_url: `${FRONTEND_URL}/pro-dashboard?stripe=success`,
            type: 'account_onboarding',
        });

        logger.info('Stripe Connect account created', {
            userId,
            proProfileId: proProfile.id,
            stripeAccountId: account.id,
        });

        res.json({
            success: true,
            data: {
                url: accountLink.url,
                account_id: account.id,
                already_exists: false,
            }
        });
    } catch (error) {
        logger.error('Create Connect account error', { 
            error: error.message, 
            type: error.type,
            code: error.code,
            param: error.param,
            statusCode: error.statusCode,
            raw: error.raw?.message,
        });
        res.status(500).json({
            success: false,
            message: 'Failed to create Stripe Connect account',
            detail: error.message,
        });
    }
};

/**
 * Check the status of a pro's Stripe Connect account.
 * GET /api/payments/connect/status
 */
exports.getConnectStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('stripe_account_id')
            .eq('user_id', userId)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        if (!proProfile.stripe_account_id) {
            return res.json({
                success: true,
                data: {
                    connected: false,
                    charges_enabled: false,
                    payouts_enabled: false,
                    details_submitted: false,
                    account_id: null,
                }
            });
        }

        const account = await stripe.accounts.retrieve(proProfile.stripe_account_id);

        res.json({
            success: true,
            data: {
                connected: true,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted,
                account_id: account.id,
            }
        });
    } catch (error) {
        logger.error('Get Connect status error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get Stripe Connect status'
        });
    }
};

/**
 * Create a Stripe Connect login link for the pro to access their Stripe Express dashboard.
 * GET /api/payments/connect/dashboard
 */
exports.getConnectDashboardLink = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('stripe_account_id')
            .eq('user_id', userId)
            .single();

        if (proError || !proProfile || !proProfile.stripe_account_id) {
            return res.status(400).json({
                success: false,
                message: 'Stripe Connect account not set up yet'
            });
        }

        const loginLink = await stripe.accounts.createLoginLink(proProfile.stripe_account_id);

        res.json({
            success: true,
            data: { url: loginLink.url }
        });
    } catch (error) {
        logger.error('Get Connect dashboard link error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get Stripe dashboard link'
        });
    }
};

/**
 * Get pro earnings summary.
 * GET /api/payments/connect/earnings
 */
exports.getProEarnings = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, commission_rate')
            .eq('user_id', userId)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Get all transactions for this pro
        const { data: transactions, error: txError } = await supabaseAdmin
            .from('transactions')
            .select(`
                *,
                bookings (
                    booking_number,
                    service_name,
                    base_price,
                    total_price,
                    tax,
                    discount
                )
            `)
            .eq('pro_id', proProfile.id)
            .order('created_at', { ascending: false });

        if (txError) {
            logger.error('Get pro earnings error', { error: txError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch earnings'
            });
        }

        const succeeded = (transactions || []).filter(t => t.status === 'succeeded');
        const pending = (transactions || []).filter(t => t.status === 'pending');

        // Use per-pro commission rate if set, otherwise platform default
        const commissionRate = proProfile.commission_rate != null
            ? parseFloat(proProfile.commission_rate)
            : PLATFORM_COMMISSION_RATE;

        const totalEarnings = succeeded.reduce((sum, t) => {
            const basePrice = parseFloat(t.bookings?.base_price || t.amount || 0);
            const proShare = basePrice * (1 - commissionRate);
            return sum + proShare;
        }, 0);

        const pendingEarnings = pending.reduce((sum, t) => {
            const basePrice = parseFloat(t.bookings?.base_price || t.amount || 0);
            const proShare = basePrice * (1 - commissionRate);
            return sum + proShare;
        }, 0);

        res.json({
            success: true,
            data: {
                total_earnings: parseFloat(totalEarnings.toFixed(2)),
                pending_earnings: parseFloat(pendingEarnings.toFixed(2)),
                total_jobs_paid: succeeded.length,
                pending_jobs: pending.length,
                commission_rate: commissionRate,
                is_custom_rate: proProfile.commission_rate != null,
                transactions: (transactions || []).slice(0, 20),
            }
        });
    } catch (error) {
        logger.error('Get pro earnings controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch earnings'
        });
    }
};

/**
 * Get platform commission rate.
 * GET /api/payments/connect/commission-rate
 */
exports.getCommissionRate = async (req, res) => {
    try {
        // If the requesting user is a pro, return their specific rate
        let proRate = null;
        if (req.user) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('commission_rate')
                .eq('user_id', req.user.id)
                .single();
            if (proProfile?.commission_rate != null) {
                proRate = parseFloat(proProfile.commission_rate);
            }
        }
        const rate = proRate != null ? proRate : PLATFORM_COMMISSION_RATE;
        res.json({
            success: true,
            data: {
                rate: rate,
                percentage: `${(rate * 100).toFixed(0)}%`,
                is_custom_rate: proRate != null,
                platform_default: PLATFORM_COMMISSION_RATE,
            }
        });
    } catch (error) {
        res.json({
            success: true,
            data: {
                rate: PLATFORM_COMMISSION_RATE,
                percentage: `${(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%`,
                is_custom_rate: false,
                platform_default: PLATFORM_COMMISSION_RATE,
            }
        });
    }
};

/**
 * Admin: Get platform revenue overview.
 * GET /api/payments/admin/revenue
 */
exports.getAdminRevenue = async (req, res) => {
    try {
        // Get all transactions
        const { data: transactions, error } = await supabaseAdmin
            .from('transactions')
            .select(`
                *,
                bookings (
                    booking_number,
                    service_name,
                    base_price,
                    total_price,
                    tax,
                    discount,
                    pro_id
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Admin revenue query error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch revenue data' });
        }

        const all = transactions || [];
        const succeeded = all.filter(t => t.status === 'succeeded');
        const pending = all.filter(t => t.status === 'pending');
        const failed = all.filter(t => t.status === 'failed');

        const totalRevenue = succeeded.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const platformFees = succeeded.reduce((sum, t) => {
            const base = parseFloat(t.bookings?.base_price || t.amount || 0);
            return sum + (base * PLATFORM_COMMISSION_RATE);
        }, 0);
        const proPayouts = totalRevenue - platformFees;
        const pendingAmount = pending.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        res.json({
            success: true,
            data: {
                total_revenue: parseFloat(totalRevenue.toFixed(2)),
                platform_fees: parseFloat(platformFees.toFixed(2)),
                pro_payouts: parseFloat(proPayouts.toFixed(2)),
                pending_amount: parseFloat(pendingAmount.toFixed(2)),
                total_transactions: all.length,
                succeeded_count: succeeded.length,
                pending_count: pending.length,
                failed_count: failed.length,
                commission_rate: PLATFORM_COMMISSION_RATE,
                recent_transactions: all.slice(0, 50),
            }
        });
    } catch (error) {
        logger.error('Admin revenue controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch revenue data' });
    }
};

/**
 * Admin: Process a refund for a transaction.
 * POST /api/payments/admin/refund
 */
exports.processRefund = async (req, res) => {
    try {
        const { transaction_id, reason } = req.body;

        // Get the transaction
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('id', transaction_id)
            .single();

        if (txError || !transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (transaction.status !== 'succeeded') {
            return res.status(400).json({ success: false, message: 'Only succeeded transactions can be refunded' });
        }

        // Process refund through Stripe
        const refund = await stripe.refunds.create({
            payment_intent: transaction.stripe_payment_intent_id,
            reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
        });

        // Update transaction status
        await supabaseAdmin
            .from('transactions')
            .update({
                status: 'refunded',
                refund_id: refund.id,
                refund_reason: reason || 'Requested by admin',
            })
            .eq('id', transaction_id);

        // Update booking status
        if (transaction.booking_id) {
            await supabaseAdmin
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', transaction.booking_id);
        }

        // Notify user
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: transaction.user_id,
                type: 'payment',
                title: 'Refund Processed',
                message: `Your payment of $${parseFloat(transaction.amount).toFixed(2)} has been refunded.`,
                link: `/transactions`
            });

        logger.info('Refund processed', {
            transactionId: transaction_id,
            refundId: refund.id,
            amount: transaction.amount,
        });

        res.json({
            success: true,
            data: {
                refund_id: refund.id,
                status: refund.status,
                amount: transaction.amount,
            }
        });
    } catch (error) {
        logger.error('Process refund error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to process refund' });
    }
};
