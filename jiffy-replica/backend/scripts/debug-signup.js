// Debug script to reproduce the production signup issue
// This simulates exactly what authController.signup does

require('dotenv').config();
const { supabase, supabaseAdmin } = require('../src/config/supabase');

const TEST_EMAIL = 'debugsignup_' + Date.now() + '@test.com';

async function debugSignup() {
    console.log('=== Debug Signup Flow ===');
    console.log('Email:', TEST_EMAIL);
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('Has SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_KEY);
    console.log('Has ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);
    console.log('');

    // Step 1: supabase.auth.signUp (same as production code)
    console.log('Step 1: supabase.auth.signUp...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: 'Testing123!',
        options: {
            data: {
                full_name: 'Debug Test',
                role: 'pro'
            }
        }
    });

    if (authError) {
        console.log('AUTH ERROR:', authError.message);
        return;
    }

    const userId = authData.user?.id;
    console.log('Auth user created:', userId);
    console.log('Auth user email:', authData.user?.email);
    console.log('');

    // Step 2: Insert profile (same as production code)
    console.log('Step 2: Insert profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: userId,
            email: TEST_EMAIL,
            full_name: 'Debug Test',
            role: 'pro',
            phone: '1234567890',
            address: undefined,
            city: undefined,
            state: undefined,
            zip_code: undefined
        })
        .select()
        .single();

    if (profileError) {
        console.log('PROFILE INSERT ERROR:', JSON.stringify({
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint
        }, null, 2));
        
        // Cleanup
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('Auth user cleaned up');
        return;
    }

    console.log('Profile created:', profile.id);
    console.log('');

    // Step 3: Insert pro_profiles (same as production code)
    console.log('Step 3: Insert pro_profiles...');
    const { data: proProfile, error: proError } = await supabaseAdmin
        .from('pro_profiles')
        .insert({
            user_id: userId,
            business_name: 'Debug Test',
            is_available: true,
        })
        .select()
        .single();

    if (proError) {
        console.log('PRO PROFILE INSERT ERROR:', JSON.stringify({
            message: proError.message,
            code: proError.code,
            details: proError.details,
            hint: proError.hint
        }, null, 2));
    } else {
        console.log('Pro profile created:', proProfile.id);
    }

    // Cleanup
    console.log('\nCleaning up...');
    await supabaseAdmin.from('pro_profiles').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('All cleaned up');
    console.log('\n=== SUCCESS: All steps passed locally ===');
}

debugSignup().catch(e => console.error('FATAL:', e.message));
