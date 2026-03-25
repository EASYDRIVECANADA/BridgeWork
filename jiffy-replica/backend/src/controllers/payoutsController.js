const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.13');

// ─── PRO ENDPOINTS ───

/**
 * GET /api/payouts/my-earnings
 * Pro: Get their earnings summary and payout history
 */
exports.getMyEarnings = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get pro profile
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, payout_method, etransfer_email, stripe_account_id, commission_rate')
            .eq('user_id', userId)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        // Get all payout records
        const { data: records, error: recErr } = await supabaseAdmin
            .from('pro_payouts')
            .select('*')
            .eq('pro_profile_id', proProfile.id)
            .order('created_at', { ascending: false });

        if (recErr) {
            logger.error('getMyEarnings query error', { error: recErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load earnings' });
        }

        const allRecords = records || [];

        // Calculate totals
        const earnings = allRecords.filter(r => r.type === 'earning' && r.status === 'completed');
        const payouts = allRecords.filter(r => r.type === 'payout' && r.status === 'completed');

        const totalEarned = earnings.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const totalPaidOut = payouts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const totalPlatformFees = earnings.reduce((sum, r) => sum + parseFloat(r.platform_fee || 0), 0);
        const pendingBalance = totalEarned - totalPaidOut;

        // Pending earnings (not yet completed — payment still held)
        const pendingEarnings = allRecords
            .filter(r => r.type === 'earning' && r.status === 'pending')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);

        res.json({
            success: true,
            data: {
                summary: {
                    totalEarned: Math.round(totalEarned * 100) / 100,
                    totalPaidOut: Math.round(totalPaidOut * 100) / 100,
                    pendingBalance: Math.round(pendingBalance * 100) / 100,
                    pendingEarnings: Math.round(pendingEarnings * 100) / 100,
                    totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
                },
                payoutMethod: proProfile.payout_method || 'e_transfer',
                etransferEmail: proProfile.etransfer_email,
                stripeConnected: !!proProfile.stripe_account_id,
                records: allRecords,
            }
        });
    } catch (error) {
        logger.error('getMyEarnings error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load earnings' });
    }
};

/**
 * PUT /api/payouts/payout-method
 * Pro: Update their payout method and e-transfer email
 */
exports.updatePayoutMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { payout_method, etransfer_email } = req.body;

        if (!payout_method || !['e_transfer', 'stripe_connect'].includes(payout_method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payout method. Must be e_transfer or stripe_connect.'
            });
        }

        if (payout_method === 'e_transfer' && !etransfer_email) {
            return res.status(400).json({
                success: false,
                message: 'e-Transfer email is required when using Interac e-Transfer.'
            });
        }

        // If choosing stripe_connect, verify they have a connected account
        if (payout_method === 'stripe_connect') {
            const { data: profile } = await supabaseAdmin
                .from('pro_profiles')
                .select('stripe_account_id')
                .eq('user_id', userId)
                .single();

            if (!profile?.stripe_account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'You need to set up Stripe Connect first before switching to automatic payouts.'
                });
            }
        }

        const updateData = {
            payout_method,
            updated_at: new Date().toISOString()
        };

        if (payout_method === 'e_transfer') {
            updateData.etransfer_email = etransfer_email;
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('user_id', userId)
            .select('payout_method, etransfer_email, stripe_account_id')
            .single();

        if (error) {
            logger.error('updatePayoutMethod error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to update payout method' });
        }

        logger.info('Payout method updated', { userId, payoutMethod: payout_method });
        res.json({
            success: true,
            message: `Payout method updated to ${payout_method === 'e_transfer' ? 'Interac e-Transfer' : 'Stripe Connect'}`,
            data
        });
    } catch (error) {
        logger.error('updatePayoutMethod controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update payout method' });
    }
};

// ─── ADMIN ENDPOINTS ───

/**
 * GET /api/payouts/admin/pending
 * Admin: Get all pros with pending balances that need e-Transfer payouts
 */
exports.adminGetPendingPayouts = async (req, res) => {
    try {
        // Get all pro profiles that use e-transfer
        const { data: pros, error: prosErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name, payout_method, etransfer_email, stripe_account_id, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .order('business_name', { ascending: true });

        if (prosErr) {
            logger.error('adminGetPendingPayouts pros error', { error: prosErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load pros' });
        }

        // Get all payout records grouped by pro
        const { data: allRecords, error: recErr } = await supabaseAdmin
            .from('pro_payouts')
            .select('*')
            .order('created_at', { ascending: false });

        if (recErr) {
            logger.error('adminGetPendingPayouts records error', { error: recErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load payout records' });
        }

        const records = allRecords || [];

        // Build summary per pro
        const proSummaries = (pros || []).map(pro => {
            const proRecords = records.filter(r => r.pro_profile_id === pro.id);
            const earnings = proRecords.filter(r => r.type === 'earning' && r.status === 'completed');
            const payouts = proRecords.filter(r => r.type === 'payout' && r.status === 'completed');
            const pendingEarnings = proRecords.filter(r => r.type === 'earning' && r.status === 'pending');

            const totalEarned = earnings.reduce((sum, r) => sum + parseFloat(r.amount), 0);
            const totalPaidOut = payouts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
            const pendingBalance = totalEarned - totalPaidOut;
            const pendingAmount = pendingEarnings.reduce((sum, r) => sum + parseFloat(r.amount), 0);

            return {
                proProfileId: pro.id,
                userId: pro.user_id,
                businessName: pro.business_name,
                fullName: pro.profiles?.full_name,
                email: pro.profiles?.email,
                payoutMethod: pro.payout_method || 'e_transfer',
                etransferEmail: pro.etransfer_email,
                stripeConnected: !!pro.stripe_account_id,
                totalEarned: Math.round(totalEarned * 100) / 100,
                totalPaidOut: Math.round(totalPaidOut * 100) / 100,
                pendingBalance: Math.round(pendingBalance * 100) / 100,
                pendingEarnings: Math.round(pendingAmount * 100) / 100,
                lastPayout: payouts.length > 0 ? payouts[0].paid_at : null,
                earningsCount: earnings.length,
            };
        }).filter(p => p.totalEarned > 0 || p.pendingEarnings > 0);

        res.json({
            success: true,
            data: {
                pros: proSummaries,
                totalPendingBalance: proSummaries.reduce((sum, p) => sum + p.pendingBalance, 0),
            }
        });
    } catch (error) {
        logger.error('adminGetPendingPayouts error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load pending payouts' });
    }
};

/**
 * GET /api/payouts/admin/history
 * Admin: Get all payout history
 */
exports.adminGetPayoutHistory = async (req, res) => {
    try {
        const { data: payouts, error } = await supabaseAdmin
            .from('pro_payouts')
            .select('*, pro_profiles(business_name, profiles!pro_profiles_user_id_fkey(full_name, email))')
            .eq('type', 'payout')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            logger.error('adminGetPayoutHistory error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load payout history' });
        }

        res.json({ success: true, data: { payouts: payouts || [] } });
    } catch (error) {
        logger.error('adminGetPayoutHistory controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load payout history' });
    }
};

/**
 * GET /api/payouts/admin/pro/:proProfileId
 * Admin: Get detailed earnings/payout records for a specific pro
 */
exports.adminGetProDetail = async (req, res) => {
    try {
        const { proProfileId } = req.params;

        const { data: pro, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name, payout_method, etransfer_email, stripe_account_id, commission_rate, profiles!pro_profiles_user_id_fkey(full_name, email, phone)')
            .eq('id', proProfileId)
            .single();

        if (proErr || !pro) {
            return res.status(404).json({ success: false, message: 'Pro not found' });
        }

        const { data: records, error: recErr } = await supabaseAdmin
            .from('pro_payouts')
            .select('*')
            .eq('pro_profile_id', proProfileId)
            .order('created_at', { ascending: false });

        if (recErr) {
            logger.error('adminGetProDetail records error', { error: recErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load records' });
        }

        const allRecords = records || [];
        const earnings = allRecords.filter(r => r.type === 'earning' && r.status === 'completed');
        const payouts = allRecords.filter(r => r.type === 'payout' && r.status === 'completed');

        const totalEarned = earnings.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const totalPaidOut = payouts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

        res.json({
            success: true,
            data: {
                pro,
                summary: {
                    totalEarned: Math.round(totalEarned * 100) / 100,
                    totalPaidOut: Math.round(totalPaidOut * 100) / 100,
                    pendingBalance: Math.round((totalEarned - totalPaidOut) * 100) / 100,
                },
                records: allRecords,
            }
        });
    } catch (error) {
        logger.error('adminGetProDetail error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load pro details' });
    }
};

/**
 * POST /api/payouts/admin/record-payout
 * Admin: Record that a manual payout (e-Transfer) was sent to a pro
 */
exports.adminRecordPayout = async (req, res) => {
    try {
        const { pro_profile_id, amount, payout_reference, notes } = req.body;

        if (!pro_profile_id || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Pro profile ID and a positive amount are required.'
            });
        }

        // Verify the pro exists
        const { data: pro, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, payout_method, etransfer_email, business_name')
            .eq('id', pro_profile_id)
            .single();

        if (proErr || !pro) {
            return res.status(404).json({ success: false, message: 'Pro not found' });
        }

        // Verify amount doesn't exceed pending balance
        const { data: records } = await supabaseAdmin
            .from('pro_payouts')
            .select('type, status, amount')
            .eq('pro_profile_id', pro_profile_id);

        const allRecords = records || [];
        const totalEarned = allRecords
            .filter(r => r.type === 'earning' && r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const totalPaidOut = allRecords
            .filter(r => r.type === 'payout' && r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const pendingBalance = totalEarned - totalPaidOut;

        if (parseFloat(amount) > pendingBalance + 0.01) {
            return res.status(400).json({
                success: false,
                message: `Payout amount ($${amount}) exceeds pending balance ($${pendingBalance.toFixed(2)}).`
            });
        }

        // Record the payout
        const { data: payout, error: payoutErr } = await supabaseAdmin
            .from('pro_payouts')
            .insert({
                pro_profile_id,
                user_id: pro.user_id,
                type: 'payout',
                amount: parseFloat(amount),
                payout_method: 'e_transfer',
                payout_reference: payout_reference || null,
                paid_by: req.user.id,
                paid_at: new Date().toISOString(),
                status: 'completed',
                notes: notes || null,
            })
            .select()
            .single();

        if (payoutErr) {
            logger.error('adminRecordPayout insert error', { error: payoutErr.message });
            return res.status(500).json({ success: false, message: 'Failed to record payout' });
        }

        // Notify the pro
        try {
            const { createNotification } = require('../services/notificationService');
            await createNotification(pro.user_id, {
                type: 'payment',
                title: 'Payout Sent',
                message: `A payout of $${parseFloat(amount).toFixed(2)} has been sent to your Interac e-Transfer (${pro.etransfer_email || 'your email'}).`,
                link: '/pro-dashboard?tab=earnings',
                data: { payout_id: payout.id }
            });
        } catch (notifErr) {
            logger.error('adminRecordPayout notification error (non-fatal)', { error: notifErr.message });
        }

        logger.info('Admin recorded payout', {
            proProfileId: pro_profile_id,
            amount,
            payoutReference: payout_reference,
            adminId: req.user.id,
        });

        res.json({
            success: true,
            message: `Payout of $${parseFloat(amount).toFixed(2)} recorded for ${pro.business_name}.`,
            data: { payout }
        });
    } catch (error) {
        logger.error('adminRecordPayout error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to record payout' });
    }
};
