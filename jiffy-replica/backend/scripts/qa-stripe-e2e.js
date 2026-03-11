/**
 * QA End-to-End Stripe Connect Payment Flow Test
 * 
 * Tests the full flow:
 * 1. Homeowner creates booking (QA $1 test service)
 * 2. Homeowner pays (creates manual-capture hold)
 * 3. Pro accepts the job
 * 4. Pro submits proof of work
 * 5. Homeowner confirms → payment captured → Transfer to pro's Connect account
 * 
 * Uses Stripe test mode with test card token.
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Test accounts
const HOMEOWNER_ID = 'a0c91791-7a82-4a86-a07a-a7d44c9f5347'; // Jane Doe (vladirmir17@gmail.com)
const PRO_USER_ID = 'e70d9fb9-aec5-47f0-a7fc-e24f64fcf77f';  // Galiver Danaf
const PRO_PROFILE_ID = '2257139c-9489-440b-83bb-9914f033f384';
const PRO_STRIPE_ACCOUNT = 'acct_1T8ksJQdPby1Ldzf';
const QA_SERVICE_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01'; // QA Test Service ($1)
const COMMISSION_RATE = 0.10; // Galiver's custom rate

let bookingId, paymentIntentId, transactionId;

async function step(name, fn) {
    process.stdout.write(`\n[${'='.repeat(60)}]\n`);
    process.stdout.write(`STEP: ${name}\n`);
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${err.message}`);
        if (err.type) console.error(`   Type: ${err.type}, Code: ${err.code}`);
        process.exit(1);
    }
}

async function run() {
    console.log('\n🚀 STARTING END-TO-END STRIPE CONNECT QA TEST\n');
    console.log(`Stripe mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
    console.log(`Pro: Galiver Danaf (${PRO_STRIPE_ACCOUNT})`);
    console.log(`Commission: ${COMMISSION_RATE * 100}%`);

    // ─── STEP 1: Verify Stripe Connect account ───
    await step('Verify pro Stripe Connect account', async () => {
        const account = await stripe.accounts.retrieve(PRO_STRIPE_ACCOUNT);
        console.log(`   charges_enabled: ${account.charges_enabled}`);
        console.log(`   payouts_enabled: ${account.payouts_enabled}`);
        console.log(`   details_submitted: ${account.details_submitted}`);
        if (!account.charges_enabled) {
            throw new Error('Pro account does not have charges_enabled — cannot receive transfers');
        }
    });

    // ─── STEP 2: Create a booking ───
    await step('Create QA test booking', async () => {
        const { data: service } = await sb.from('services').select('*').eq('id', QA_SERVICE_ID).single();
        if (!service) throw new Error('QA test service not found');

        const totalPrice = service.base_price + (service.base_price * 0.08); // 8% tax
        const bookingNumber = `QA-${Date.now().toString().slice(-6)}`;

        const { data: booking, error } = await sb.from('bookings').insert({
            booking_number: bookingNumber,
            user_id: HOMEOWNER_ID,
            service_id: QA_SERVICE_ID,
            service_name: service.name,
            service_description: 'QA E2E Test',
            address: '123 Test St',
            city: 'Ottawa',
            state: 'ON',
            zip_code: 'K1A 0A6',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time: '10:00',
            scheduled_datetime: new Date().toISOString(),
            base_price: service.base_price,
            tax: service.base_price * 0.08,
            total_price: totalPrice,
            status: 'pending',
        }).select().single();

        if (error) throw new Error(`Booking insert failed: ${error.message}`);
        bookingId = booking.id;
        console.log(`   Booking: ${booking.booking_number} (${bookingId})`);
        console.log(`   Total: $${totalPrice.toFixed(2)} (base $${service.base_price} + tax)`);
    });

    // ─── STEP 3: Create payment intent (manual capture / escrow hold) ───
    await step('Create payment intent (escrow hold)', async () => {
        const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();

        // Ensure homeowner has a valid Stripe customer
        let customerId;
        try {
            const { data: profile } = await sb.from('profiles').select('stripe_customer_id').eq('id', HOMEOWNER_ID).single();
            if (profile?.stripe_customer_id) {
                await stripe.customers.retrieve(profile.stripe_customer_id);
                customerId = profile.stripe_customer_id;
            }
        } catch (e) {
            // Stale customer, create new
        }
        if (!customerId) {
            const customer = await stripe.customers.create({ email: 'vladirmir17@gmail.com', metadata: { user_id: HOMEOWNER_ID } });
            customerId = customer.id;
            await sb.from('profiles').update({ stripe_customer_id: customerId }).eq('id', HOMEOWNER_ID);
            console.log(`   Created new Stripe customer: ${customerId}`);
        }

        // Note: booking.pro_id is null at this point (normal flow)
        const pi = await stripe.paymentIntents.create({
            amount: Math.round(booking.total_price * 100),
            currency: 'cad',
            customer: customerId,
            capture_method: 'manual',
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            metadata: { booking_id: bookingId, user_id: HOMEOWNER_ID },
            description: `Payment hold for ${booking.service_name}`,
        });
        paymentIntentId = pi.id;

        // Record transaction
        const { data: tx, error } = await sb.from('transactions').insert({
            booking_id: bookingId,
            user_id: HOMEOWNER_ID,
            pro_id: null, // Pro not assigned yet
            stripe_payment_intent_id: pi.id,
            amount: booking.total_price,
            status: 'pending',
            description: `Payment hold for ${booking.service_name}`,
        }).select().single();
        if (error) throw new Error(`Transaction insert failed: ${error.message}`);
        transactionId = tx.id;

        console.log(`   PI: ${pi.id} (status: ${pi.status})`);
        console.log(`   Amount: $${(pi.amount / 100).toFixed(2)}`);
        console.log(`   Capture method: ${pi.capture_method}`);
        console.log(`   transfer_data: ${pi.transfer_data ? 'YES' : 'NONE (expected — pro not assigned yet)'}`);
    });

    // ─── STEP 4: Confirm payment with test card (simulate checkout) ───
    await step('Confirm payment (simulate card checkout)', async () => {
        const pi = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: 'pm_card_visa', // Stripe test card
        });
        console.log(`   PI status after confirm: ${pi.status}`);
        if (pi.status !== 'requires_capture') {
            throw new Error(`Expected 'requires_capture', got '${pi.status}'`);
        }

        // Update transaction to 'held'
        await sb.from('transactions').update({ status: 'held' }).eq('id', transactionId);
        await sb.from('bookings').update({ payment_held_at: new Date().toISOString() }).eq('id', bookingId);
        console.log(`   Funds held successfully — $${(pi.amount / 100).toFixed(2)} authorized on card`);
    });

    // ─── STEP 5: Pro accepts the job ───
    await step('Pro accepts the job', async () => {
        const { data, error } = await sb.from('bookings')
            .update({ pro_id: PRO_PROFILE_ID, status: 'accepted' })
            .eq('id', bookingId)
            .select()
            .single();
        if (error) throw new Error(`Accept job failed: ${error.message}`);

        // Also update transaction with pro_id
        await sb.from('transactions').update({ pro_id: PRO_PROFILE_ID }).eq('id', transactionId);

        console.log(`   Booking status: ${data.status}`);
        console.log(`   Pro assigned: ${PRO_PROFILE_ID}`);
    });

    // ─── STEP 6: Pro submits proof of work ───
    await step('Pro submits proof of work', async () => {
        const { error } = await sb.from('bookings').update({
            proof_submitted_at: new Date().toISOString(),
        }).eq('id', bookingId);
        if (error) throw new Error(`Proof submission failed: ${error.message}`);
        console.log(`   Proof submitted at: ${new Date().toISOString()}`);
    });

    // ─── STEP 7: Capture payment + Transfer to pro ───
    await step('Capture payment (homeowner confirms job complete)', async () => {
        // Capture the held funds
        const pi = await stripe.paymentIntents.capture(paymentIntentId);
        console.log(`   PI status after capture: ${pi.status}`);
        console.log(`   Amount captured: $${(pi.amount_received / 100).toFixed(2)}`);
        console.log(`   Latest charge: ${pi.latest_charge}`);
        console.log(`   transfer_data on PI: ${pi.transfer_data ? 'YES (auto-split)' : 'NONE (will do manual transfer)'}`);

        if (pi.status !== 'succeeded') {
            throw new Error(`Expected 'succeeded', got '${pi.status}'`);
        }
    });

    // ─── STEP 8: Create Transfer to pro (simulating what capturePayment does) ───
    await step('Create Transfer to pro Connect account', async () => {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const capturedAmount = pi.amount_received; // cents
        const platformFee = Math.round(capturedAmount * COMMISSION_RATE);
        const proShare = capturedAmount - platformFee;

        console.log(`   Captured: $${(capturedAmount / 100).toFixed(2)} CAD`);
        console.log(`   Platform fee (${COMMISSION_RATE * 100}%): $${(platformFee / 100).toFixed(2)}`);
        console.log(`   Pro share: $${(proShare / 100).toFixed(2)}`);

        const transfer = await stripe.transfers.create({
            amount: proShare,
            currency: 'cad',
            destination: PRO_STRIPE_ACCOUNT,
            source_transaction: pi.latest_charge,
            metadata: { booking_id: bookingId, commission_rate: COMMISSION_RATE.toString() },
            description: `QA test payout for booking ${bookingId}`,
        });

        console.log(`   ✅ Transfer created: ${transfer.id}`);
        console.log(`   Transfer amount: $${(transfer.amount / 100).toFixed(2)} CAD`);
        console.log(`   Destination: ${transfer.destination}`);

        // Update DB
        await sb.from('transactions').update({
            status: 'succeeded',
            stripe_charge_id: pi.latest_charge,
            metadata: { transfer_id: transfer.id },
        }).eq('id', transactionId);

        await sb.from('bookings').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            user_confirmed_at: new Date().toISOString(),
        }).eq('id', bookingId);
    });

    // ─── STEP 9: Verify final state ───
    await step('Verify final state in DB and Stripe', async () => {
        const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();
        const { data: tx } = await sb.from('transactions').select('*').eq('id', transactionId).single();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log(`   Booking status: ${booking.status} (expected: completed)`);
        console.log(`   Transaction status: ${tx.status} (expected: succeeded)`);
        console.log(`   PI status: ${pi.status} (expected: succeeded)`);
        console.log(`   Pro assigned: ${booking.pro_id === PRO_PROFILE_ID ? 'YES' : 'NO'}`);
        console.log(`   Payment held at: ${booking.payment_held_at ? 'YES' : 'NO'}`);
        console.log(`   Proof submitted: ${booking.proof_submitted_at ? 'YES' : 'NO'}`);
        console.log(`   Completed at: ${booking.completed_at ? 'YES' : 'NO'}`);

        if (booking.status !== 'completed') throw new Error('Booking not completed');
        if (tx.status !== 'succeeded') throw new Error('Transaction not succeeded');
        if (pi.status !== 'succeeded') throw new Error('PI not succeeded');
    });

    console.log('\n' + '='.repeat(62));
    console.log('🎉 ALL STEPS PASSED — STRIPE CONNECT E2E FLOW IS WORKING!');
    console.log('='.repeat(62));
    console.log(`\nBooking ID: ${bookingId}`);
    console.log(`Payment Intent: ${paymentIntentId}`);
    console.log(`Transaction: ${transactionId}`);
    console.log('\nThe full flow works:');
    console.log('  Homeowner pays → Hold → Pro accepts → Proof → Capture → Transfer to pro ✅');
    console.log('\nNote: Galiver\'s payouts_enabled=false means he can\'t withdraw to bank yet,');
    console.log('but the money IS in his Stripe Express balance. He needs to complete');
    console.log('bank info in Stripe to enable withdrawals.\n');
}

run().catch(err => {
    console.error('\n💥 UNEXPECTED ERROR:', err.message);
    process.exit(1);
});
