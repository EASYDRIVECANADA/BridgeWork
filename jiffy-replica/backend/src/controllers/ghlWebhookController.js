const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// POST /api/webhooks/ghl
// Called by Supabase DB webhook when transactions.status changes to 'succeeded'.
// Forwards customer + transaction data to GoHighLevel.
exports.handleTransactionSucceeded = async (req, res) => {
    try {
        // Validate the shared secret set in the Supabase DB webhook Authorization header
        const secret = process.env.GHL_WEBHOOK_SECRET;
        if (secret) {
            const authHeader = req.headers['authorization'];
            if (!authHeader || authHeader !== `Bearer ${secret}`) {
                logger.warn('ghlWebhook: unauthorized request — invalid or missing secret');
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
        }

        const { type, table, record, old_record } = req.body;

        // Only process UPDATE events on the transactions table where status became 'succeeded'
        if (
            table !== 'transactions' ||
            type !== 'UPDATE' ||
            record?.status !== 'succeeded' ||
            old_record?.status === 'succeeded'
        ) {
            return res.json({ success: true, message: 'Event skipped — not a succeeded transaction update' });
        }

        const bookingId = record.booking_id;
        if (!bookingId) {
            logger.warn('ghlWebhook: transaction record has no booking_id', { transactionId: record.id });
            return res.status(400).json({ success: false, message: 'No booking_id on transaction' });
        }

        // Fetch booking + customer profile
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('id, booking_number, total_price, updated_total_price, scheduled_datetime, profiles:user_id(id, full_name, email, phone, city)')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            logger.error('ghlWebhook: failed to fetch booking', { bookingId, error: bookingError?.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch booking data' });
        }

        const customer = booking.profiles;
        const amountPaid = (record.amount || booking.updated_total_price || booking.total_price || 0);

        const ghlPayload = {
            event: 'transaction.succeeded',
            transaction_id: record.id,
            transaction_status: 'succeeded',
            stripe_payment_intent_id: record.stripe_payment_intent_id || null,
            amount_paid_cad: typeof amountPaid === 'number' ? amountPaid : parseFloat(amountPaid),
            booking_id: bookingId,
            booking_number: booking.booking_number || null,
            scheduled_datetime: booking.scheduled_datetime || null,
            customer_name: customer?.full_name || null,
            customer_email: customer?.email || null,
            customer_phone: customer?.phone || null,
            customer_city: customer?.city || null,
            timestamp: new Date().toISOString(),
        };

        const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
        if (!ghlWebhookUrl) {
            logger.error('ghlWebhook: GHL_WEBHOOK_URL is not set in environment variables');
            return res.status(500).json({ success: false, message: 'GHL webhook URL not configured' });
        }

        // POST to GHL
        const ghlResponse = await fetch(ghlWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ghlPayload),
        });

        if (!ghlResponse.ok) {
            const responseText = await ghlResponse.text();
            logger.error('ghlWebhook: GHL responded with error', {
                status: ghlResponse.status,
                body: responseText,
                bookingId,
            });
            return res.status(502).json({ success: false, message: 'GHL webhook call failed', ghl_status: ghlResponse.status });
        }

        logger.info('ghlWebhook: successfully forwarded succeeded transaction to GHL', {
            transactionId: record.id,
            bookingId,
            customerEmail: customer?.email,
        });

        return res.json({ success: true, message: 'Forwarded to GHL', booking_id: bookingId });

    } catch (err) {
        logger.error('ghlWebhook: unexpected error', { error: err.message });
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
