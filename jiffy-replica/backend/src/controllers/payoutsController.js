const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { sendProPayoutNotificationEmail } = require('../services/emailService');
const { createNotification, createBulkNotifications } = require('../services/notificationService');

const DEFAULT_MINIMUM_WITHDRAWAL = 50;

function roundAmount(value) {
    return Math.round((parseFloat(value) || 0) * 100) / 100;
}

function formatCurrency(amount) {
    return `$${roundAmount(amount).toFixed(2)}`;
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

async function getPayoutSettingsRecord() {
    const { data, error } = await supabaseAdmin
        .from('payout_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        logger.error('getPayoutSettingsRecord error', { error: error.message });
        return {
            id: null,
            minimum_withdrawal_amount: DEFAULT_MINIMUM_WITHDRAWAL,
        };
    }

    return data?.[0] || {
        id: null,
        minimum_withdrawal_amount: DEFAULT_MINIMUM_WITHDRAWAL,
    };
}

async function getActiveCalendarEntries() {
    const { data, error } = await supabaseAdmin
        .from('payout_calendar')
        .select('*')
        .eq('is_active', true)
        .order('entry_date', { ascending: true });

    if (error) {
        logger.error('getActiveCalendarEntries error', { error: error.message });
        return [];
    }

    return data || [];
}

function getNextPayoutDate(calendarEntries) {
    const today = getTodayDateString();
    const holidayDates = new Set(
        (calendarEntries || [])
            .filter((entry) => entry.entry_type === 'holiday')
            .map((entry) => entry.entry_date)
    );

    const nextPayout = (calendarEntries || []).find(
        (entry) => entry.entry_type === 'payout' && entry.entry_date >= today && !holidayDates.has(entry.entry_date)
    );

    return nextPayout?.entry_date || null;
}

async function getLedgerRecords(proProfileId) {
    const { data, error } = await supabaseAdmin
        .from('pro_payouts')
        .select('*')
        .eq('pro_profile_id', proProfileId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
}

function buildLedgerSummary(records) {
    const allRecords = records || [];
    const earnings = allRecords.filter((record) => record.type === 'earning' && record.status === 'completed');
    const payouts = allRecords.filter((record) => record.type === 'payout' && record.status === 'completed');
    const pendingEarnings = allRecords.filter((record) => record.type === 'earning' && record.status === 'pending');

    const totalEarned = earnings.reduce((sum, record) => sum + parseFloat(record.amount), 0);
    const totalPaidOut = payouts.reduce((sum, record) => sum + parseFloat(record.amount), 0);
    const totalPlatformFees = earnings.reduce((sum, record) => sum + parseFloat(record.platform_fee || 0), 0);
    const pendingBalance = totalEarned - totalPaidOut;
    const pendingEarningsTotal = pendingEarnings.reduce((sum, record) => sum + parseFloat(record.amount), 0);

    return {
        totalEarned: roundAmount(totalEarned),
        totalPaidOut: roundAmount(totalPaidOut),
        pendingBalance: roundAmount(pendingBalance),
        pendingEarnings: roundAmount(pendingEarningsTotal),
        totalPlatformFees: roundAmount(totalPlatformFees),
    };
}

async function getOutstandingWithdrawalAmount(proProfileId) {
    const { data, error } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('amount')
        .eq('pro_profile_id', proProfileId)
        .in('status', ['pending', 'approved']);

    if (error) {
        logger.error('getOutstandingWithdrawalAmount error', { error: error.message, proProfileId });
        return 0;
    }

    return roundAmount((data || []).reduce((sum, record) => sum + parseFloat(record.amount), 0));
}

async function getAvailableWithdrawalData(proProfileId) {
    const records = await getLedgerRecords(proProfileId);
    const summary = buildLedgerSummary(records);
    const pendingRequested = await getOutstandingWithdrawalAmount(proProfileId);

    return {
        records,
        summary,
        pendingRequested,
        availableToWithdraw: roundAmount(Math.max(summary.pendingBalance - pendingRequested, 0)),
    };
}

async function createManualPayoutRecord({
    pro,
    amount,
    payoutReference,
    notes,
    securityQuestion,
    securityAnswer,
    adminId,
}) {
    const { data, error } = await supabaseAdmin
        .from('pro_payouts')
        .insert({
            pro_profile_id: pro.id,
            user_id: pro.user_id,
            type: 'payout',
            amount: roundAmount(amount),
            payout_method: 'e_transfer',
            payout_reference: payoutReference || null,
            paid_by: adminId,
            paid_at: new Date().toISOString(),
            status: 'completed',
            notes: notes || null,
            security_question: securityQuestion || null,
            security_answer: securityAnswer || null,
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

async function notifyPayoutProcessed({ pro, amount, payoutId, securityQuestion, securityAnswer, sendEmail }) {
    const proEmail = pro.profiles?.email;
    const proName = pro.profiles?.full_name || pro.business_name;

    if (sendEmail !== false && proEmail && securityQuestion && securityAnswer) {
        try {
            await sendProPayoutNotificationEmail(
                proEmail,
                proName,
                amount,
                pro.etransfer_email || proEmail,
                securityQuestion,
                securityAnswer
            );
            logger.info('Payout notification email sent to pro', { proEmail, amount });
        } catch (emailErr) {
            logger.error('Payout notification email error (non-fatal)', { error: emailErr.message });
        }
    }

    try {
        await createNotification(pro.user_id, {
            type: 'payment',
            title: 'Payout Sent',
            message: `A payout of ${formatCurrency(amount)} has been sent to your Interac e-Transfer (${pro.etransfer_email || 'your email'}).`,
            link: '/pro-dashboard?tab=earnings',
            data: { payout_id: payoutId }
        });
    } catch (notifErr) {
        logger.error('Payout processed notification error (non-fatal)', { error: notifErr.message });
    }
}

// PRO ENDPOINTS

exports.getMyEarnings = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, payout_method, etransfer_email, stripe_account_id, commission_rate')
            .eq('user_id', userId)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        const { records, summary, pendingRequested, availableToWithdraw } = await getAvailableWithdrawalData(proProfile.id);

        res.json({
            success: true,
            data: {
                summary,
                payoutMethod: proProfile.payout_method || 'e_transfer',
                etransferEmail: proProfile.etransfer_email,
                stripeConnected: !!proProfile.stripe_account_id,
                commissionRate: proProfile.commission_rate,
                records,
                withdrawalSummary: {
                    pendingRequested,
                    availableToWithdraw,
                }
            }
        });
    } catch (error) {
        logger.error('getMyEarnings error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load earnings' });
    }
};

exports.getMyWithdrawals = async (req, res) => {
    try {
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        const { data, error } = await supabaseAdmin
            .from('withdrawal_requests')
            .select('*')
            .eq('pro_profile_id', proProfile.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('getMyWithdrawals error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load withdrawals' });
        }

        res.json({ success: true, data: { withdrawals: data || [] } });
    } catch (error) {
        logger.error('getMyWithdrawals controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load withdrawals' });
    }
};

exports.getWithdrawalSettings = async (req, res) => {
    try {
        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, payout_method, etransfer_email, stripe_account_id')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        const settings = await getPayoutSettingsRecord();
        const calendarEntries = await getActiveCalendarEntries();
        const { summary, pendingRequested, availableToWithdraw } = await getAvailableWithdrawalData(proProfile.id);

        res.json({
            success: true,
            data: {
                minimumWithdrawalAmount: roundAmount(settings.minimum_withdrawal_amount),
                nextPayoutDate: getNextPayoutDate(calendarEntries),
                upcomingCalendar: calendarEntries.slice(0, 8),
                payoutMethod: proProfile.payout_method || 'e_transfer',
                etransferEmail: proProfile.etransfer_email,
                stripeConnected: !!proProfile.stripe_account_id,
                pendingBalance: summary.pendingBalance,
                pendingRequested,
                availableToWithdraw,
            }
        });
    } catch (error) {
        logger.error('getWithdrawalSettings error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load withdrawal settings' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, notes } = req.body;
        const requestedAmount = roundAmount(amount);

        if (!requestedAmount || requestedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Enter a valid withdrawal amount.' });
        }

        const { data: proProfile, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, payout_method, etransfer_email, stripe_account_id, business_name, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .eq('user_id', req.user.id)
            .single();

        if (proErr || !proProfile) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        if ((proProfile.payout_method || 'e_transfer') !== 'e_transfer') {
            return res.status(400).json({
                success: false,
                message: 'Manual withdrawal requests are only available for pros using Interac e-Transfer payouts.'
            });
        }

        if (!proProfile.etransfer_email) {
            return res.status(400).json({
                success: false,
                message: 'Add your e-Transfer email in Settings before requesting a withdrawal.'
            });
        }

        const settings = await getPayoutSettingsRecord();
        const minimumWithdrawalAmount = roundAmount(settings.minimum_withdrawal_amount);
        if (requestedAmount < minimumWithdrawalAmount) {
            return res.status(400).json({
                success: false,
                message: `The minimum withdrawal amount is ${formatCurrency(minimumWithdrawalAmount)}.`
            });
        }

        const calendarEntries = await getActiveCalendarEntries();
        const nextPayoutDate = getNextPayoutDate(calendarEntries);
        const { availableToWithdraw } = await getAvailableWithdrawalData(proProfile.id);

        if (requestedAmount > availableToWithdraw + 0.01) {
            return res.status(400).json({
                success: false,
                message: `You can only request up to ${formatCurrency(availableToWithdraw)} right now.`
            });
        }

        const { data: withdrawalRequest, error } = await supabaseAdmin
            .from('withdrawal_requests')
            .insert({
                pro_profile_id: proProfile.id,
                user_id: req.user.id,
                amount: requestedAmount,
                payout_method: proProfile.payout_method || 'e_transfer',
                notes: notes?.trim() || null,
                scheduled_for_date: nextPayoutDate,
            })
            .select()
            .single();

        if (error) {
            logger.error('requestWithdrawal insert error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to submit withdrawal request' });
        }

        try {
            await createNotification(req.user.id, {
                type: 'payment',
                title: 'Withdrawal Request Submitted',
                message: `Your withdrawal request for ${formatCurrency(requestedAmount)} was submitted successfully.`,
                link: '/pro-dashboard?tab=earnings',
                data: { withdrawal_request_id: withdrawalRequest.id }
            });

            const { data: admins } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .eq('is_active', true);

            await createBulkNotifications((admins || []).map((admin) => admin.id), {
                type: 'payment',
                title: 'New Withdrawal Request',
                message: `${proProfile.business_name || proProfile.profiles?.full_name || 'A pro'} requested ${formatCurrency(requestedAmount)} for withdrawal.`,
                link: '/admin/payouts',
                data: { withdrawal_request_id: withdrawalRequest.id }
            });
        } catch (notificationError) {
            logger.error('requestWithdrawal notification error (non-fatal)', { error: notificationError.message });
        }

        logger.info('Withdrawal request submitted', {
            withdrawalRequestId: withdrawalRequest.id,
            proProfileId: proProfile.id,
            amount: requestedAmount,
        });

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted successfully.',
            data: {
                withdrawalRequest,
                nextPayoutDate,
            }
        });
    } catch (error) {
        logger.error('requestWithdrawal controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to submit withdrawal request' });
    }
};

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

// ADMIN ENDPOINTS

exports.adminGetPendingPayouts = async (req, res) => {
    try {
        const { data: pros, error: prosErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name, payout_method, etransfer_email, stripe_account_id, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .order('business_name', { ascending: true });

        if (prosErr) {
            logger.error('adminGetPendingPayouts pros error', { error: prosErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load pros' });
        }

        const { data: allRecords, error: recErr } = await supabaseAdmin
            .from('pro_payouts')
            .select('*')
            .order('created_at', { ascending: false });

        if (recErr) {
            logger.error('adminGetPendingPayouts records error', { error: recErr.message });
            return res.status(500).json({ success: false, message: 'Failed to load payout records' });
        }

        const records = allRecords || [];

        const proSummaries = (pros || []).map((pro) => {
            const proRecords = records.filter((record) => record.pro_profile_id === pro.id);
            const earnings = proRecords.filter((record) => record.type === 'earning' && record.status === 'completed');
            const payouts = proRecords.filter((record) => record.type === 'payout' && record.status === 'completed');
            const pendingEarnings = proRecords.filter((record) => record.type === 'earning' && record.status === 'pending');

            const totalEarned = earnings.reduce((sum, record) => sum + parseFloat(record.amount), 0);
            const totalPaidOut = payouts.reduce((sum, record) => sum + parseFloat(record.amount), 0);
            const pendingBalance = totalEarned - totalPaidOut;
            const pendingAmount = pendingEarnings.reduce((sum, record) => sum + parseFloat(record.amount), 0);

            return {
                proProfileId: pro.id,
                userId: pro.user_id,
                businessName: pro.business_name,
                fullName: pro.profiles?.full_name,
                email: pro.profiles?.email,
                payoutMethod: pro.payout_method || 'e_transfer',
                etransferEmail: pro.etransfer_email,
                stripeConnected: !!pro.stripe_account_id,
                totalEarned: roundAmount(totalEarned),
                totalPaidOut: roundAmount(totalPaidOut),
                pendingBalance: roundAmount(pendingBalance),
                pendingEarnings: roundAmount(pendingAmount),
                lastPayout: payouts.length > 0 ? payouts[0].paid_at : null,
                earningsCount: earnings.length,
            };
        }).filter((pro) => pro.totalEarned > 0 || pro.pendingEarnings > 0);

        res.json({
            success: true,
            data: {
                pros: proSummaries,
                totalPendingBalance: roundAmount(proSummaries.reduce((sum, pro) => sum + pro.pendingBalance, 0)),
            }
        });
    } catch (error) {
        logger.error('adminGetPendingPayouts error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load pending payouts' });
    }
};

exports.adminGetWithdrawalRequests = async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabaseAdmin
            .from('withdrawal_requests')
            .select(`
                *,
                pro_profiles!withdrawal_requests_pro_profile_id_fkey (
                    id,
                    business_name,
                    etransfer_email,
                    payout_method,
                    profiles!pro_profiles_user_id_fkey (full_name, email)
                )
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('adminGetWithdrawalRequests error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load withdrawal requests' });
        }

        const withdrawals = data || [];
        res.json({
            success: true,
            data: {
                withdrawals,
                counts: {
                    pending: withdrawals.filter((item) => item.status === 'pending').length,
                    approved: withdrawals.filter((item) => item.status === 'approved').length,
                    rejected: withdrawals.filter((item) => item.status === 'rejected').length,
                    processed: withdrawals.filter((item) => item.status === 'processed').length,
                }
            }
        });
    } catch (error) {
        logger.error('adminGetWithdrawalRequests controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load withdrawal requests' });
    }
};

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

exports.adminGetPayoutSettings = async (req, res) => {
    try {
        const settings = await getPayoutSettingsRecord();
        const calendarEntries = await getActiveCalendarEntries();

        res.json({
            success: true,
            data: {
                settings: {
                    id: settings.id,
                    minimumWithdrawalAmount: roundAmount(settings.minimum_withdrawal_amount),
                },
                nextPayoutDate: getNextPayoutDate(calendarEntries),
            }
        });
    } catch (error) {
        logger.error('adminGetPayoutSettings controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load payout settings' });
    }
};

exports.adminUpdatePayoutSettings = async (req, res) => {
    try {
        const minimumWithdrawalAmount = roundAmount(req.body.minimum_withdrawal_amount);

        if (minimumWithdrawalAmount < 0) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal amount must be 0 or greater.' });
        }

        const existing = await getPayoutSettingsRecord();
        let result;

        if (existing.id) {
            const { data, error } = await supabaseAdmin
                .from('payout_settings')
                .update({
                    minimum_withdrawal_amount: minimumWithdrawalAmount,
                    updated_by: req.user.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                logger.error('adminUpdatePayoutSettings update error', { error: error.message });
                return res.status(500).json({ success: false, message: 'Failed to update payout settings' });
            }
            result = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('payout_settings')
                .insert({
                    minimum_withdrawal_amount: minimumWithdrawalAmount,
                    created_by: req.user.id,
                    updated_by: req.user.id,
                })
                .select()
                .single();

            if (error) {
                logger.error('adminUpdatePayoutSettings insert error', { error: error.message });
                return res.status(500).json({ success: false, message: 'Failed to update payout settings' });
            }
            result = data;
        }

        res.json({
            success: true,
            message: 'Quota requirement updated successfully.',
            data: {
                settings: {
                    id: result.id,
                    minimumWithdrawalAmount: roundAmount(result.minimum_withdrawal_amount),
                }
            }
        });
    } catch (error) {
        logger.error('adminUpdatePayoutSettings controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update payout settings' });
    }
};

exports.adminGetPayoutCalendar = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('payout_calendar')
            .select('*')
            .order('entry_date', { ascending: true });

        if (error) {
            logger.error('adminGetPayoutCalendar error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to load payout calendar' });
        }

        res.json({
            success: true,
            data: {
                entries: data || [],
                nextPayoutDate: getNextPayoutDate((data || []).filter((entry) => entry.is_active))
            }
        });
    } catch (error) {
        logger.error('adminGetPayoutCalendar controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load payout calendar' });
    }
};

exports.adminCreatePayoutCalendarEntry = async (req, res) => {
    try {
        const { entry_date, entry_type, title, notes } = req.body;

        if (!entry_date || !entry_type || !['payout', 'holiday', 'event'].includes(entry_type)) {
            return res.status(400).json({ success: false, message: 'Valid date and entry type are required.' });
        }

        const entryTitle = (title || '').trim() || (entry_type === 'payout' ? 'Payout Day' : entry_type === 'holiday' ? 'Holiday' : 'Event');
        const { data, error } = await supabaseAdmin
            .from('payout_calendar')
            .insert({
                entry_date,
                entry_type,
                title: entryTitle,
                notes: notes?.trim() || null,
                created_by: req.user.id,
                updated_by: req.user.id,
            })
            .select()
            .single();

        if (error) {
            logger.error('adminCreatePayoutCalendarEntry error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to create calendar entry' });
        }

        res.status(201).json({
            success: true,
            message: 'Calendar entry created successfully.',
            data: { entry: data }
        });
    } catch (error) {
        logger.error('adminCreatePayoutCalendarEntry controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to create calendar entry' });
    }
};

exports.adminUpdatePayoutCalendarEntry = async (req, res) => {
    try {
        const { calendarEntryId } = req.params;
        const { entry_date, entry_type, title, notes, is_active } = req.body;

        if (entry_type && !['payout', 'holiday', 'event'].includes(entry_type)) {
            return res.status(400).json({ success: false, message: 'Invalid calendar entry type.' });
        }

        const updateData = {
            updated_by: req.user.id,
            updated_at: new Date().toISOString(),
        };

        if (entry_date) updateData.entry_date = entry_date;
        if (entry_type) updateData.entry_type = entry_type;
        if (title !== undefined) updateData.title = (title || '').trim() || 'Untitled';
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        if (is_active !== undefined) updateData.is_active = !!is_active;

        const { data, error } = await supabaseAdmin
            .from('payout_calendar')
            .update(updateData)
            .eq('id', calendarEntryId)
            .select()
            .single();

        if (error) {
            logger.error('adminUpdatePayoutCalendarEntry error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to update calendar entry' });
        }

        res.json({
            success: true,
            message: 'Calendar entry updated successfully.',
            data: { entry: data }
        });
    } catch (error) {
        logger.error('adminUpdatePayoutCalendarEntry controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update calendar entry' });
    }
};

exports.adminDeletePayoutCalendarEntry = async (req, res) => {
    try {
        const { calendarEntryId } = req.params;

        const { error } = await supabaseAdmin
            .from('payout_calendar')
            .delete()
            .eq('id', calendarEntryId);

        if (error) {
            logger.error('adminDeletePayoutCalendarEntry error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to delete calendar entry' });
        }

        res.json({ success: true, message: 'Calendar entry deleted successfully.' });
    } catch (error) {
        logger.error('adminDeletePayoutCalendarEntry controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to delete calendar entry' });
    }
};

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

        const records = await getLedgerRecords(proProfileId);
        const summary = buildLedgerSummary(records);

        res.json({
            success: true,
            data: {
                pro,
                summary: {
                    totalEarned: summary.totalEarned,
                    totalPaidOut: summary.totalPaidOut,
                    pendingBalance: summary.pendingBalance,
                },
                records,
            }
        });
    } catch (error) {
        logger.error('adminGetProDetail error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to load pro details' });
    }
};

exports.adminApproveWithdrawalRequest = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminNotes = req.body?.admin_notes?.trim() || null;

        const { data: withdrawalRequest, error: requestError } = await supabaseAdmin
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawalRequestId)
            .single();

        if (requestError || !withdrawalRequest) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        if (withdrawalRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending requests can be approved.' });
        }

        const { data, error } = await supabaseAdmin
            .from('withdrawal_requests')
            .update({
                status: 'approved',
                admin_notes: adminNotes,
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', withdrawalRequestId)
            .select()
            .single();

        if (error) {
            logger.error('adminApproveWithdrawalRequest error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to approve withdrawal request' });
        }

        try {
            await createNotification(withdrawalRequest.user_id, {
                type: 'payment',
                title: 'Withdrawal Approved',
                message: `Your withdrawal request for ${formatCurrency(withdrawalRequest.amount)} was approved.`,
                link: '/pro-dashboard?tab=earnings',
                data: { withdrawal_request_id: withdrawalRequestId }
            });
        } catch (notificationError) {
            logger.error('adminApproveWithdrawalRequest notification error (non-fatal)', { error: notificationError.message });
        }

        res.json({ success: true, message: 'Withdrawal request approved.', data: { withdrawalRequest: data } });
    } catch (error) {
        logger.error('adminApproveWithdrawalRequest controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to approve withdrawal request' });
    }
};

exports.adminRejectWithdrawalRequest = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminNotes = req.body?.admin_notes?.trim();

        if (!adminNotes) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
        }

        const { data: withdrawalRequest, error: requestError } = await supabaseAdmin
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawalRequestId)
            .single();

        if (requestError || !withdrawalRequest) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        if (!['pending', 'approved'].includes(withdrawalRequest.status)) {
            return res.status(400).json({ success: false, message: 'This withdrawal request can no longer be rejected.' });
        }

        const { data, error } = await supabaseAdmin
            .from('withdrawal_requests')
            .update({
                status: 'rejected',
                admin_notes: adminNotes,
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', withdrawalRequestId)
            .select()
            .single();

        if (error) {
            logger.error('adminRejectWithdrawalRequest error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to reject withdrawal request' });
        }

        try {
            await createNotification(withdrawalRequest.user_id, {
                type: 'payment',
                title: 'Withdrawal Rejected',
                message: `Your withdrawal request for ${formatCurrency(withdrawalRequest.amount)} was rejected.`,
                link: '/pro-dashboard?tab=earnings',
                data: { withdrawal_request_id: withdrawalRequestId, reason: adminNotes }
            });
        } catch (notificationError) {
            logger.error('adminRejectWithdrawalRequest notification error (non-fatal)', { error: notificationError.message });
        }

        res.json({ success: true, message: 'Withdrawal request rejected.', data: { withdrawalRequest: data } });
    } catch (error) {
        logger.error('adminRejectWithdrawalRequest controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to reject withdrawal request' });
    }
};

exports.adminProcessWithdrawalRequest = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const { payout_reference, notes, security_question, security_answer, send_email } = req.body;

        const { data: withdrawalRequest, error: requestError } = await supabaseAdmin
            .from('withdrawal_requests')
            .select(`
                *,
                pro_profiles!withdrawal_requests_pro_profile_id_fkey (
                    id,
                    user_id,
                    business_name,
                    payout_method,
                    etransfer_email,
                    profiles!pro_profiles_user_id_fkey (full_name, email)
                )
            `)
            .eq('id', withdrawalRequestId)
            .single();

        if (requestError || !withdrawalRequest) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        if (withdrawalRequest.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Only approved withdrawal requests can be processed.' });
        }

        const pro = withdrawalRequest.pro_profiles;
        const { summary } = await getAvailableWithdrawalData(pro.id);
        if (parseFloat(withdrawalRequest.amount) > summary.pendingBalance + 0.01) {
            return res.status(400).json({
                success: false,
                message: `This withdrawal exceeds the current pending balance of ${formatCurrency(summary.pendingBalance)}.`
            });
        }

        const payout = await createManualPayoutRecord({
            pro,
            amount: withdrawalRequest.amount,
            payoutReference: payout_reference,
            notes,
            securityQuestion: security_question,
            securityAnswer: security_answer,
            adminId: req.user.id,
        });

        const { data: updatedRequest, error: updateError } = await supabaseAdmin
            .from('withdrawal_requests')
            .update({
                status: 'processed',
                admin_notes: notes?.trim() || withdrawalRequest.admin_notes || null,
                payout_reference: payout_reference || null,
                processed_at: new Date().toISOString(),
                reviewed_by: req.user.id,
                reviewed_at: withdrawalRequest.reviewed_at || new Date().toISOString(),
            })
            .eq('id', withdrawalRequestId)
            .select()
            .single();

        if (updateError) {
            logger.error('adminProcessWithdrawalRequest update error', { error: updateError.message });
            return res.status(500).json({ success: false, message: 'Payout was recorded but the withdrawal request could not be updated.' });
        }

        await notifyPayoutProcessed({
            pro,
            amount: withdrawalRequest.amount,
            payoutId: payout.id,
            securityQuestion: security_question,
            securityAnswer: security_answer,
            sendEmail: send_email,
        });

        logger.info('Withdrawal request processed', {
            withdrawalRequestId,
            payoutId: payout.id,
            adminId: req.user.id,
        });

        res.json({
            success: true,
            message: `Withdrawal request for ${formatCurrency(withdrawalRequest.amount)} processed successfully.`,
            data: {
                payout,
                withdrawalRequest: updatedRequest,
            }
        });
    } catch (error) {
        logger.error('adminProcessWithdrawalRequest controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to process withdrawal request' });
    }
};

exports.adminRecordPayout = async (req, res) => {
    try {
        const { pro_profile_id, amount, payout_reference, notes, security_question, security_answer, send_email } = req.body;

        if (!pro_profile_id || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Pro profile ID and a positive amount are required.'
            });
        }

        const { data: pro, error: proErr } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, payout_method, etransfer_email, business_name, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .eq('id', pro_profile_id)
            .single();

        if (proErr || !pro) {
            return res.status(404).json({ success: false, message: 'Pro not found' });
        }

        const { summary } = await getAvailableWithdrawalData(pro_profile_id);
        if (parseFloat(amount) > summary.pendingBalance + 0.01) {
            return res.status(400).json({
                success: false,
                message: `Payout amount (${formatCurrency(amount)}) exceeds pending balance (${formatCurrency(summary.pendingBalance)}).`
            });
        }

        const payout = await createManualPayoutRecord({
            pro,
            amount,
            payoutReference: payout_reference,
            notes,
            securityQuestion: security_question,
            securityAnswer: security_answer,
            adminId: req.user.id,
        });

        await notifyPayoutProcessed({
            pro,
            amount,
            payoutId: payout.id,
            securityQuestion: security_question,
            securityAnswer: security_answer,
            sendEmail: send_email,
        });

        logger.info('Admin recorded payout', {
            proProfileId: pro_profile_id,
            amount,
            payoutReference: payout_reference,
            adminId: req.user.id,
        });

        res.json({
            success: true,
            message: `Payout of ${formatCurrency(amount)} recorded for ${pro.business_name}.`,
            data: { payout }
        });
    } catch (error) {
        logger.error('adminRecordPayout error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to record payout' });
    }
};
