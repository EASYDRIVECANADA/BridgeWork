require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { supabaseAdmin } = require('../config/supabase');

async function check() {
  // Check categories
  const { data: cats, error: catErr } = await supabaseAdmin
    .from('service_categories')
    .select('id, name, is_active')
    .limit(5);
  console.log('Categories:', cats?.length, catErr?.message || 'OK');
  if (cats?.length) console.log('Sample:', cats[0]);

  // Check services without filter
  const { data: all, error: allErr } = await supabaseAdmin
    .from('services')
    .select('id, name, is_active')
    .limit(5);
  console.log('\nAll services (no filter):', all?.length, allErr?.message || 'OK');
  if (all?.length) console.log('Sample:', all[0]);

  // Check services with is_active filter
  const { data: active, error: activeErr } = await supabaseAdmin
    .from('services')
    .select('id, name, is_active')
    .eq('is_active', true)
    .limit(5);
  console.log('\nActive services:', active?.length, activeErr?.message || 'OK');
  if (active?.length) console.log('Sample:', active[0]);

  process.exit(0);
}
check();
