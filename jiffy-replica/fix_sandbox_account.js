/**
 * Script to update the Sandbox connected account via Stripe API.
 * 
 * IMPORTANT: This script needs the SANDBOX secret key, not the Test Mode key.
 * 
 * To find your Sandbox API key:
 * 1. Go to Stripe Dashboard
 * 2. Make sure you're in SANDBOX (orange banner)
 * 3. Click Developers (bottom left) → API keys
 * 4. Copy the Secret key (starts with sk_test_ but it's different from Test Mode)
 * 
 * Usage: node fix_sandbox_account.js <SANDBOX_SECRET_KEY>
 */

const CONNECTED_ACCOUNT_ID = 'acct_1T5ArIHe4XRDErDB';

async function main() {
    // Load .env from backend folder
    try { require('dotenv').config({ path: './backend/.env' }); } catch(e) {}
    try { require('dotenv').config({ path: './.env' }); } catch(e) {}
    
    // Get key from command line arg or STRIPE_SANDBOX_KEY env
    const secretKey = process.argv[2] || process.env.STRIPE_SANDBOX_KEY;
    
    if (!secretKey) {
        console.error('Usage: node fix_sandbox_account.js <SANDBOX_SECRET_KEY>');
        console.error('\nTo find your Sandbox API key:');
        console.error('1. Go to Stripe Dashboard → Sandbox (orange banner)');
        console.error('2. Click "Developers" (bottom-left)');
        console.error('3. Go to "API keys" tab');
        console.error('4. Reveal and copy the Secret key');
        process.exit(1);
    }

    const stripe = require('stripe')(secretKey);

    console.log('=== Stripe Sandbox Account Fixer ===\n');

    // Step 1: Retrieve current account info
    console.log('1. Retrieving connected account...');
    try {
        const account = await stripe.accounts.retrieve(CONNECTED_ACCOUNT_ID);
        console.log(`   Account: ${account.email}`);
        console.log(`   Status: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`);
        console.log(`   Details submitted: ${account.details_submitted}`);
        console.log(`   Requirements currently_due:`, account.requirements?.currently_due || []);
        console.log(`   Requirements past_due:`, account.requirements?.past_due || []);
        console.log('');
    } catch (err) {
        console.error(`   ERROR retrieving account: ${err.message}`);
        if (err.message.includes('No such account') || err.message.includes('not found')) {
            console.error('\n   This likely means you are using Test Mode keys but the account is in Sandbox.');
            console.error('   Please use the SANDBOX secret key instead.');
        }
        process.exit(1);
    }

    // Step 2: Update account with required info
    console.log('2. Updating account with business info...');
    try {
        const updated = await stripe.accounts.update(CONNECTED_ACCOUNT_ID, {
            business_type: 'individual',
            business_profile: {
                url: 'https://bridgeworkservices.com',
                mcc: '7349', // Building cleaning and maintenance
                product_description: 'Home repair and maintenance services including plumbing, electrical, HVAC, and general handyman work.',
            },
            individual: {
                first_name: 'Test',
                last_name: 'Account',
                email: 'testaccount@example.com',
                phone: '+16135551234',
                dob: {
                    day: 1,
                    month: 1,
                    year: 1990,
                },
                address: {
                    line1: '123 Test Street',
                    city: 'Toronto',
                    state: 'ON',
                    postal_code: 'M5V 1A1',
                    country: 'CA',
                },
                id_number: '000000000', // Test SIN for Canada
            },
        });

        console.log('   ✅ Account updated successfully');
        console.log(`   charges_enabled: ${updated.charges_enabled}`);
        console.log(`   payouts_enabled: ${updated.payouts_enabled}`);
        console.log(`   details_submitted: ${updated.details_submitted}`);
        console.log(`   Remaining requirements:`, updated.requirements?.currently_due || []);
        console.log(`   Past due:`, updated.requirements?.past_due || []);
        console.log('');
    } catch (err) {
        console.error(`   ERROR updating account: ${err.message}`);
        console.log('');
    }

    // Step 3: Add external bank account (test)
    console.log('3. Adding test bank account...');
    try {
        const bankAccount = await stripe.accounts.createExternalAccount(CONNECTED_ACCOUNT_ID, {
            external_account: {
                object: 'bank_account',
                country: 'CA',
                currency: 'cad',
                routing_number: '11000-000',
                account_number: '000123456789',
            },
        });
        console.log(`   ✅ Bank account added: ${bankAccount.id}`);
        console.log('');
    } catch (err) {
        if (err.message.includes('already has')) {
            console.log('   ℹ️  Bank account already exists, skipping');
        } else {
            console.error(`   ERROR adding bank: ${err.message}`);
        }
        console.log('');
    }

    // Step 4: Check final status
    console.log('4. Final account status...');
    try {
        const final = await stripe.accounts.retrieve(CONNECTED_ACCOUNT_ID);
        console.log(`   charges_enabled: ${final.charges_enabled}`);
        console.log(`   payouts_enabled: ${final.payouts_enabled}`);
        console.log(`   details_submitted: ${final.details_submitted}`);
        console.log(`   Currently due:`, final.requirements?.currently_due || []);
        console.log(`   Past due:`, final.requirements?.past_due || []);
        console.log(`   Eventually due:`, final.requirements?.eventually_due || []);
        
        if (final.charges_enabled && final.payouts_enabled) {
            console.log('\n   🎉 Account is FULLY ENABLED! Payments and payouts are active.');
        } else if (final.requirements?.currently_due?.length > 0 || final.requirements?.past_due?.length > 0) {
            console.log('\n   ⚠️  Account still has pending requirements. See above.');
            console.log('   You may need to resolve these in the Stripe Dashboard.');
        }
    } catch (err) {
        console.error(`   ERROR: ${err.message}`);
    }

    console.log('\n=== Done ===');
}

main().catch(console.error);
