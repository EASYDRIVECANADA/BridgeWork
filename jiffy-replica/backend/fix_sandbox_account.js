require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SANDBOX_KEY);

const ACCOUNT_ID = 'acct_1T5AriHe4XRDErDB';

async function main() {
    console.log('=== Stripe Sandbox - Fix Remaining Requirements ===\n');

    // Step 1: Fix relationship.title
    console.log('1. Setting individual.relationship.title...');
    try {
        const updated = await stripe.accounts.update(ACCOUNT_ID, {
            individual: {
                relationship: {
                    title: 'Owner',
                },
            },
        });
        console.log('   Done! charges_enabled:', updated.charges_enabled, 'payouts_enabled:', updated.payouts_enabled);
        console.log('   currently_due:', updated.requirements?.currently_due || []);
        console.log('   past_due:', updated.requirements?.past_due || []);
    } catch (e) {
        console.error('   Error:', e.message);
    }

    // Step 2: Check what's left
    console.log('\n2. Current status...');
    try {
        const acct = await stripe.accounts.retrieve(ACCOUNT_ID);
        console.log('   charges_enabled:', acct.charges_enabled);
        console.log('   payouts_enabled:', acct.payouts_enabled);
        console.log('   details_submitted:', acct.details_submitted);
        console.log('   currently_due:', acct.requirements?.currently_due || []);
        console.log('   past_due:', acct.requirements?.past_due || []);
        console.log('   eventually_due:', acct.requirements?.eventually_due || []);
        console.log('   disabled_reason:', acct.requirements?.disabled_reason || 'none');

        if (acct.charges_enabled && acct.payouts_enabled) {
            console.log('\n   FULLY ENABLED!');
        } else {
            console.log('\n   Still has pending requirements.');
            
            // If us_tax_identification_form is the only thing left, 
            // that requires dashboard action - let's check
            const due = acct.requirements?.currently_due || [];
            if (due.length === 1 && due[0] === 'us_tax_identification_form') {
                console.log('   The only remaining item is the tax form.');
                console.log('   This must be completed in the Stripe Dashboard:');
                console.log('   Sandbox > Connected accounts > click the account > complete tax form');
            }
        }
    } catch (e) {
        console.error('   Error:', e.message);
    }

    console.log('\n=== Done ===');
}

main().catch(console.error);
