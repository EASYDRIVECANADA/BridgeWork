/**
 * Create a super admin account in Supabase.
 * Run: node scripts/create-super-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ADMIN_EMAIL = 'admin@bridgework.ca';
const ADMIN_PASSWORD = 'BridgeWork@Admin2026!';
const ADMIN_NAME = 'BridgeWork';

async function main() {
    console.log('Creating super admin account...');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Name:     ${ADMIN_NAME}`);
    console.log();

    // 1. Create auth user (email_confirm: true bypasses email verification)
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
            full_name: ADMIN_NAME,
            role: 'admin'
        }
    });

    if (authErr) {
        console.error('Failed to create auth user:', authErr.message);
        process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created: ${userId}`);

    // 2. Create profile row
    const { error: profileErr } = await sb.from('profiles').upsert({
        id: userId,
        email: ADMIN_EMAIL,
        full_name: ADMIN_NAME,
        role: 'admin',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    if (profileErr) {
        console.error('Failed to create profile:', profileErr.message);
        process.exit(1);
    }

    console.log('✅ Profile row created (role: admin)');

    console.log('\n========================================');
    console.log('  SUPER ADMIN ACCOUNT CREATED');
    console.log('========================================');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  User ID:  ${userId}`);
    console.log(`  Role:     admin`);
    console.log('========================================');
    console.log('\nYou can log in at /login with these credentials.');
    console.log('Change the email/password later from the Supabase dashboard or profile settings.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
