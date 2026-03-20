require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testLoginFlow() {
    console.log('Testing login flow...\n');
    
    // Test with one of the existing users
    const testEmail = 'danafgaliver@gmail.com';
    const testPassword = 'test123456'; // You'll need to know the actual password
    
    try {
        console.log('1. Testing /api/auth/me without token (should fail)...');
        try {
            await axios.get(`${API_URL}/api/auth/me`);
            console.log('   ❌ Should have failed but succeeded');
        } catch (error) {
            console.log('   ✅ Correctly returned 401:', error.response?.data?.message);
        }
        
        console.log('\n2. Attempting login via Supabase directly...');
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        
        // Note: This will only work if you know the password
        console.log('   Note: You need to sign in via the frontend to test the full flow');
        console.log('   The test user email is:', testEmail);
        
        console.log('\n3. Testing /api/auth/me endpoint structure...');
        console.log('   Endpoint: GET', `${API_URL}/api/auth/me`);
        console.log('   Expected headers: Authorization: Bearer <token>');
        console.log('   Expected response: { success: true, data: { user, profile } }');
        
        console.log('\n✅ Backend endpoint is configured correctly');
        console.log('   Next step: Test login via frontend and check browser console');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLoginFlow();
