/**
 * Seed script: Inserts service_categories and services into Supabase.
 * Run once:  node src/scripts/seedServices.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { supabaseAdmin } = require('../config/supabase');

const categories = [
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Handyman', slug: 'handyman', description: 'General repairs and maintenance around your home', display_order: 1 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Appliance Repair', slug: 'appliance-repair', description: 'Fix and maintain your home appliances', display_order: 2 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Plumbing', slug: 'plumbing', description: 'Plumbing repairs and installations', display_order: 3 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Electrical', slug: 'electrical', description: 'Electrical repairs and installations', display_order: 4 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'HVAC', slug: 'hvac', description: 'Heating and cooling services', display_order: 5 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Lawn Care', slug: 'lawn-care', description: 'Lawn maintenance and landscaping', display_order: 6 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Painting', slug: 'painting', description: 'Interior and exterior painting services', display_order: 7 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Carpentry', slug: 'carpentry', description: 'Custom woodwork and repairs', display_order: 8 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Cleaning', slug: 'cleaning', description: 'Professional cleaning services', display_order: 9 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Moving', slug: 'moving', description: 'Moving and hauling services', display_order: 10 },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'Gas Services', slug: 'gas-services', description: 'Gas appliance installation and repair', display_order: 11 },
];

const services = [
  // Handyman
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Furniture Assembly', slug: 'furniture-assembly', description: 'Professional furniture assembly service for all types of furniture including IKEA, Wayfair, Amazon furniture and more.', short_description: 'Get your furniture assembled quickly', base_price: 75.00, pricing_type: 'fixed', estimated_duration: 90, tags: ['furniture', 'assembly', 'ikea'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'TV Mounting', slug: 'tv-mounting', description: 'Professional TV mounting service with proper wall anchoring and cable management.', short_description: 'Mount your TV safely on the wall', base_price: 100.00, pricing_type: 'fixed', estimated_duration: 60, tags: ['tv', 'mounting', 'wall'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Picture Hanging', slug: 'picture-hanging', description: 'Hang pictures, mirrors, and artwork securely on any wall type.', short_description: 'Hang pictures and artwork professionally', base_price: 50.00, pricing_type: 'fixed', estimated_duration: 45, tags: ['pictures', 'hanging', 'artwork'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Door Repair', slug: 'door-repair', description: 'Fix squeaky doors, adjust hinges, replace locks and handles.', short_description: 'Repair and maintain your doors', base_price: 85.00, pricing_type: 'fixed', estimated_duration: 75, tags: ['door', 'repair', 'locks'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Drywall Repair', slug: 'drywall-repair', description: 'Patch holes, fix cracks, and repair damaged drywall.', short_description: 'Fix holes and cracks in walls', base_price: 95.00, pricing_type: 'fixed', estimated_duration: 120, tags: ['drywall', 'repair', 'walls'] },

  // Appliance Repair
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Dishwasher Repair', slug: 'dishwasher-repair', description: 'Diagnose and repair dishwasher issues including leaks, drainage problems, and control issues.', short_description: 'Fix your dishwasher problems', base_price: 120.00, pricing_type: 'hourly', estimated_duration: 90, tags: ['dishwasher', 'appliance', 'repair'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Refrigerator Repair', slug: 'refrigerator-repair', description: 'Repair cooling issues, ice maker problems, and general refrigerator malfunctions.', short_description: 'Get your fridge working again', base_price: 150.00, pricing_type: 'hourly', estimated_duration: 120, tags: ['refrigerator', 'appliance', 'repair'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Washer/Dryer Repair', slug: 'washer-dryer-repair', description: 'Fix washing machine and dryer issues including leaks, noise, and performance problems.', short_description: 'Repair your laundry appliances', base_price: 130.00, pricing_type: 'hourly', estimated_duration: 90, tags: ['washer', 'dryer', 'laundry'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Oven/Stove Repair', slug: 'oven-stove-repair', description: 'Repair oven and stove issues including heating elements, igniters, and controls.', short_description: 'Fix your oven or stove', base_price: 140.00, pricing_type: 'hourly', estimated_duration: 90, tags: ['oven', 'stove', 'appliance'] },

  // Plumbing
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Drain Cleaning', slug: 'drain-cleaning', description: 'Clear clogged drains and pipes in kitchen, bathroom, or basement.', short_description: 'Unclog your drains quickly', base_price: 110.00, pricing_type: 'fixed', estimated_duration: 60, tags: ['drain', 'plumbing', 'unclog'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Faucet Repair', slug: 'faucet-repair', description: 'Fix leaky faucets, replace cartridges, and repair fixtures.', short_description: 'Fix leaky faucets and fixtures', base_price: 90.00, pricing_type: 'fixed', estimated_duration: 75, tags: ['faucet', 'plumbing', 'leak'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Toilet Repair', slug: 'toilet-repair', description: 'Repair running toilets, fix leaks, and replace parts.', short_description: 'Fix your toilet problems', base_price: 100.00, pricing_type: 'fixed', estimated_duration: 60, tags: ['toilet', 'plumbing', 'repair'] },

  // Electrical
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Outlet/Switch Repair', slug: 'outlet-switch-repair', description: 'Repair or replace electrical outlets, switches, and dimmers.', short_description: 'Fix outlets and switches', base_price: 95.00, pricing_type: 'fixed', estimated_duration: 60, tags: ['outlet', 'switch', 'electrical'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Light Fixture Install', slug: 'light-fixture-install', description: 'Install ceiling lights, chandeliers, and wall sconces.', short_description: 'Install new light fixtures', base_price: 110.00, pricing_type: 'fixed', estimated_duration: 75, tags: ['light', 'fixture', 'install'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Ceiling Fan Install', slug: 'ceiling-fan-install', description: 'Install or replace ceiling fans with proper wiring and balancing.', short_description: 'Install a ceiling fan', base_price: 130.00, pricing_type: 'fixed', estimated_duration: 90, tags: ['ceiling', 'fan', 'install'] },

  // HVAC
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'AC Tune-Up', slug: 'ac-tune-up', description: 'Annual AC maintenance including filter replacement, coil cleaning, and system check.', short_description: 'Keep your AC running efficiently', base_price: 120.00, pricing_type: 'fixed', estimated_duration: 90, tags: ['ac', 'hvac', 'maintenance'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Furnace Repair', slug: 'furnace-repair', description: 'Diagnose and repair furnace issues to keep your home warm.', short_description: 'Fix your furnace', base_price: 150.00, pricing_type: 'hourly', estimated_duration: 120, tags: ['furnace', 'hvac', 'heating'] },

  // Lawn Care
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Lawn Mowing', slug: 'lawn-mowing', description: 'Professional lawn mowing service with edging and cleanup.', short_description: 'Keep your lawn looking great', base_price: 60.00, pricing_type: 'fixed', estimated_duration: 60, tags: ['lawn', 'mowing', 'maintenance'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Yard Cleanup', slug: 'yard-cleanup', description: 'Remove leaves, branches, and debris from your yard.', short_description: 'Clean up your yard', base_price: 80.00, pricing_type: 'hourly', estimated_duration: 120, tags: ['yard', 'cleanup', 'leaves'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Hedge Trimming', slug: 'hedge-trimming', description: 'Trim and shape hedges, bushes, and shrubs.', short_description: 'Trim your hedges professionally', base_price: 70.00, pricing_type: 'fixed', estimated_duration: 90, tags: ['hedge', 'trimming', 'landscaping'] },

  // Painting
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a71', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Interior Painting', slug: 'interior-painting', description: 'Professional interior painting for rooms, walls, and ceilings.', short_description: 'Paint your rooms professionally', base_price: 200.00, pricing_type: 'hourly', estimated_duration: 240, tags: ['interior', 'painting', 'walls'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a72', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Exterior Painting', slug: 'exterior-painting', description: 'Professional exterior painting for siding, trim, and decks.', short_description: 'Paint your home exterior', base_price: 300.00, pricing_type: 'hourly', estimated_duration: 480, tags: ['exterior', 'painting', 'siding'] },

  // Cleaning
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a91', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Deep Cleaning', slug: 'deep-cleaning', description: 'Thorough deep cleaning of your entire home including kitchen, bathrooms, and living areas.', short_description: 'Deep clean your home', base_price: 180.00, pricing_type: 'fixed', estimated_duration: 240, tags: ['deep', 'cleaning', 'home'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a92', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Move-In/Move-Out Cleaning', slug: 'move-cleaning', description: 'Complete cleaning for moving in or out of a home.', short_description: 'Clean for your move', base_price: 220.00, pricing_type: 'fixed', estimated_duration: 300, tags: ['move', 'cleaning', 'home'] },

  // Gas Services (matches the page shown in screenshot - "BBQ Cleaning & Repair")
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'BBQ Cleaning & Repair', slug: 'bbq-cleaning-repair', description: 'Professional BBQ cleaning and repair service. Technicians are mobile or centrally arrived at trades and medics of appliances. For gas stovetop/ovens, please request in the Gas Services category.', short_description: 'Clean and repair your BBQ', base_price: 180.00, pricing_type: 'fixed', estimated_duration: 120, tags: ['bbq', 'cleaning', 'repair', 'gas'] },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'Gas Line Inspection', slug: 'gas-line-inspection', description: 'Professional gas line inspection and leak detection.', short_description: 'Inspect your gas lines', base_price: 150.00, pricing_type: 'fixed', estimated_duration: 90, tags: ['gas', 'inspection', 'safety'] },
];

const promoCodes = [
  { code: 'WELCOME10', description: 'Welcome discount for new users', discount_type: 'percentage', discount_value: 10.00, min_booking_amount: 50.00, max_discount: 20.00, usage_limit: 1000, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
  { code: 'SAVE20', description: '20% off your first booking', discount_type: 'percentage', discount_value: 20.00, min_booking_amount: 100.00, max_discount: 50.00, usage_limit: 500, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() },
  { code: 'SPRING25', description: 'Spring cleaning special', discount_type: 'fixed', discount_value: 25.00, min_booking_amount: 75.00, max_discount: null, usage_limit: 200, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
];

async function seed() {
  console.log('🌱 Seeding service categories...');
  const { data: catData, error: catErr } = await supabaseAdmin
    .from('service_categories')
    .upsert(categories, { onConflict: 'id' })
    .select();

  if (catErr) {
    console.error('❌ Categories error:', catErr.message);
    return;
  }
  console.log(`✅ ${catData.length} categories upserted`);

  console.log('🌱 Seeding services...');
  const { data: svcData, error: svcErr } = await supabaseAdmin
    .from('services')
    .upsert(services, { onConflict: 'id' })
    .select();

  if (svcErr) {
    console.error('❌ Services error:', svcErr.message);
    return;
  }
  console.log(`✅ ${svcData.length} services upserted`);

  console.log('🌱 Seeding promo codes...');
  const { data: promoData, error: promoErr } = await supabaseAdmin
    .from('promo_codes')
    .upsert(promoCodes, { onConflict: 'code' })
    .select();

  if (promoErr) {
    console.error('❌ Promo codes error:', promoErr.message);
  } else {
    console.log(`✅ ${promoData.length} promo codes upserted`);
  }

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
