/**
 * Setup Pro Account Script
 * 
 * Usage:
 *   node src/scripts/setupProAccount.js <email>
 * 
 * This will:
 * 1. Find the user by email in the profiles table
 * 2. Set their role to 'pro'
 * 3. Create a pro_profiles row for them
 * 
 * If no email is provided, it lists all users so you can pick one.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { supabaseAdmin } = require('../config/supabase');

async function setupPro() {
  const email = process.argv[2];

  if (!email) {
    // List all users
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error.message);
      process.exit(1);
    }

    console.log('\n📋 Existing users:\n');
    if (!users || users.length === 0) {
      console.log('  No users found. Sign up through the UI first.');
    } else {
      users.forEach((u) => {
        console.log(`  ${u.role === 'pro' ? '⭐' : '  '} ${u.email} (${u.full_name || 'No name'}) [role: ${u.role}]`);
      });
    }
    console.log('\nUsage: node src/scripts/setupProAccount.js <email>');
    process.exit(0);
  }

  // Find user by email
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', email)
    .single();

  if (profileErr || !profile) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  console.log(`\n👤 Found user: ${profile.full_name} (${profile.email}), current role: ${profile.role}`);

  // Update role to 'pro'
  if (profile.role !== 'pro') {
    const { error: roleErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', profile.id);

    if (roleErr) {
      console.error('❌ Failed to update role:', roleErr.message);
      process.exit(1);
    }
    console.log('✅ Role updated to "pro"');
  } else {
    console.log('ℹ️  Role is already "pro"');
  }

  // Check if pro_profiles already exists
  const { data: existingPro } = await supabaseAdmin
    .from('pro_profiles')
    .select('id')
    .eq('user_id', profile.id)
    .single();

  if (existingPro) {
    console.log('ℹ️  Pro profile already exists (id:', existingPro.id, ')');
  } else {
    // Create pro_profiles row
    const { data: newPro, error: proErr } = await supabaseAdmin
      .from('pro_profiles')
      .insert({
        user_id: profile.id,
        business_name: `${profile.full_name || 'Pro'}'s Services`,
        bio: 'Experienced professional ready to help with your home service needs.',
        service_categories: [
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Handyman
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', // Appliance Repair
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', // Plumbing
        ],
        service_radius: 25,
        hourly_rate: 75.00,
        is_available: true,
        is_verified: true,
        rating: 4.80,
        total_reviews: 0,
        total_jobs: 0,
        completed_jobs: 0,
        acceptance_rate: 0,
      })
      .select()
      .single();

    if (proErr) {
      console.error('❌ Failed to create pro profile:', proErr.message);
      process.exit(1);
    }
    console.log('✅ Pro profile created (id:', newPro.id, ')');
  }

  console.log('\n🎉 Pro account setup complete!');
  console.log('   Log in at /pro-login with this email to access the Pro Dashboard.');
  process.exit(0);
}

setupPro().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
