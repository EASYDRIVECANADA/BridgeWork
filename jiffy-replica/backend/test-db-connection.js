require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    
    try {
        // Test 1: Check if profiles table exists and get count
        const { data: profiles, error: profileError, count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact' })
            .limit(5);
        
        if (profileError) {
            console.error('❌ Error fetching profiles:', profileError.message);
            console.error('   Code:', profileError.code);
            console.error('   Details:', profileError.details);
            console.error('   Hint:', profileError.hint);
            return;
        }
        
        console.log('✅ Profiles table exists');
        console.log('   Total profiles:', count);
        console.log('   Sample profiles:', profiles.length);
        
        if (profiles.length > 0) {
            console.log('\nSample profile data:');
            profiles.forEach(p => {
                console.log(`   - ${p.full_name} (${p.email}) - Role: ${p.role}`);
            });
        } else {
            console.log('\n⚠️  No profiles found in database');
            console.log('   You may need to:');
            console.log('   1. Run database migrations');
            console.log('   2. Create a test user account');
        }
        
        // Test 2: Check auth.users
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) {
            console.error('\n❌ Error fetching auth users:', usersError.message);
            return;
        }
        
        console.log('\n✅ Auth users table accessible');
        console.log('   Total auth users:', users.length);
        
        if (users.length > 0) {
            console.log('\nAuth users:');
            users.forEach(u => {
                console.log(`   - ${u.email} (ID: ${u.id.substring(0, 8)}...) - Confirmed: ${!!u.email_confirmed_at}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testConnection();
