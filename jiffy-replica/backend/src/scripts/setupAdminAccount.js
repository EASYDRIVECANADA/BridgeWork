/**
 * Setup Admin Account Script
 * 
 * Usage:
 *   node src/scripts/setupAdminAccount.js <email>
 * 
 * This will:
 * 1. Find the user by email in the profiles table
 * 2. Set their role to 'admin'
 * 
 * If no email is provided, it lists all users so you can pick one.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { supabaseAdmin } = require('../config/supabase');

async function setupAdmin() {
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
        const icon = u.role === 'admin' ? '🛡️' : u.role === 'pro' ? '⭐' : '  ';
        console.log(`  ${icon} ${u.email} (${u.full_name || 'No name'}) [role: ${u.role}]`);
      });
    }
    console.log('\nUsage: node src/scripts/setupAdminAccount.js <email>');
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

  if (profile.role === 'admin') {
    console.log('ℹ️  This user is already an admin.');
    process.exit(0);
  }

  // Update role to 'admin'
  const { error: roleErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', profile.id);

  if (roleErr) {
    console.error('❌ Failed to update role:', roleErr.message);
    process.exit(1);
  }

  console.log('✅ Role updated to "admin"');
  console.log('\n🛡️ Admin account setup complete!');
  console.log('   Log in with this email to access admin features like /admin/revenue.');
  process.exit(0);
}

setupAdmin().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
