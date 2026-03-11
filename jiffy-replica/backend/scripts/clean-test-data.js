/**
 * Clean ALL test data from Supabase and prepare for live mode.
 * Run: node scripts/clean-test-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    console.log('=== CURRENT DATA INVENTORY ===\n');

    // Count all tables
    const tables = ['bookings', 'transactions', 'notifications', 'messages', 'reviews', 'support_tickets', 'quotes', 'invoices'];
    for (const tbl of tables) {
        const { count, error } = await sb.from(tbl).select('*', { count: 'exact', head: true });
        if (error && error.code === '42P01') {
            console.log(`  ${tbl}: (table doesn't exist)`);
        } else {
            console.log(`  ${tbl}: ${count} rows`);
        }
    }

    // List all profiles
    const { data: profiles } = await sb.from('profiles').select('id, email, full_name, role, stripe_customer_id');
    console.log('\n--- PROFILES ---');
    (profiles || []).forEach(p => {
        console.log(`  [${p.role}] ${p.email} | ${p.full_name} | stripe_customer: ${p.stripe_customer_id || 'none'}`);
    });

    // List all pro_profiles
    const { data: pros } = await sb.from('pro_profiles').select('id, user_id, stripe_account_id, business_name');
    console.log('\n--- PRO PROFILES ---');
    (pros || []).forEach(p => {
        console.log(`  ${p.business_name || 'unnamed'} | stripe_account: ${p.stripe_account_id || 'none'}`);
    });

    // ---- CLEANUP ----
    console.log('\n=== CLEANING TEST DATA ===\n');

    // Delete in dependency order
    const deleteTables = ['transactions', 'notifications', 'messages', 'reviews', 'support_tickets', 'bookings'];
    for (const tbl of deleteTables) {
        const { error, count } = await sb.from(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        if (error) {
            console.log(`  ${tbl}: ERROR - ${error.message}`);
        } else {
            console.log(`  ${tbl}: deleted`);
        }
    }

    // Clear test Stripe IDs from profiles (they're test-mode IDs, won't work in live)
    const { error: custErr } = await sb
        .from('profiles')
        .update({ stripe_customer_id: null })
        .not('stripe_customer_id', 'is', null);
    console.log(`  profiles.stripe_customer_id: ${custErr ? 'ERROR - ' + custErr.message : 'cleared all'}`);

    // Clear test Stripe Connect account IDs from pro_profiles
    const { error: acctErr } = await sb
        .from('pro_profiles')
        .update({ stripe_account_id: null, stripe_onboarding_complete: false })
        .not('stripe_account_id', 'is', null);
    console.log(`  pro_profiles.stripe_account_id: ${acctErr ? 'ERROR - ' + acctErr.message : 'cleared all'}`);

    console.log('\n=== POST-CLEANUP COUNTS ===\n');
    for (const tbl of deleteTables) {
        const { count } = await sb.from(tbl).select('*', { count: 'exact', head: true });
        console.log(`  ${tbl}: ${count} rows`);
    }

    console.log('\n✅ Test data cleaned. Ready for live mode.');
    console.log('   - All test stripe_customer_id values cleared (new ones will be created in live mode)');
    console.log('   - All test stripe_account_id values cleared (pros must re-onboard in live mode)');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
