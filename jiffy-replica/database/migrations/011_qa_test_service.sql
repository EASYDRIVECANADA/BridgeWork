-- QA Test Service ($1.00) for Stripe payment flow testing
-- Run this in Supabase SQL Editor

-- Insert QA/Test Category
INSERT INTO service_categories (id, name, slug, description, icon_url, display_order, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    'QA Testing',
    'qa-testing',
    'Internal testing services — not visible to public',
    NULL,
    99,
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert $1.00 QA Test Service
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, estimated_duration, tags, is_active)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    'QA Test Service ($1)',
    'qa-test-service',
    'This is a $1.00 test service for QA purposes. Use this to test the full payment flow: booking → payment → pro assignment → capture → payout.',
    'QA test service - $1.00',
    1.00,
    'fixed',
    15,
    ARRAY['qa', 'test', 'internal'],
    true
) ON CONFLICT (id) DO NOTHING;
