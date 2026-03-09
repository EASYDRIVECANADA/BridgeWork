-- Add Emergency category and emergency services
-- Run this in Supabase SQL Editor

-- Insert Emergency Category
INSERT INTO service_categories (id, name, slug, description, icon_url, display_order, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Emergency',
    'emergency',
    'Emergency home services available 24/7 for urgent HVAC, plumbing, and electrical issues',
    NULL,
    12,
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert Emergency Services
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, estimated_duration, tags, is_active)
VALUES
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Emergency HVAC',
        'emergency-hvac',
        'Emergency heating and cooling repair available 24/7. Includes furnace failures, AC breakdowns, no heat situations, and other urgent HVAC issues requiring immediate attention.',
        'Urgent 24/7 heating & cooling repair',
        200.00,
        'fixed',
        120,
        ARRAY['emergency', 'hvac', 'heating', 'cooling', 'furnace', 'ac', 'urgent'],
        true
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Emergency Plumbing',
        'emergency-plumbing',
        'Emergency plumbing service available 24/7. Includes burst pipes, severe leaks, sewer backups, flooding, and other urgent plumbing emergencies requiring immediate response.',
        'Urgent 24/7 plumbing emergency repair',
        200.00,
        'fixed',
        90,
        ARRAY['emergency', 'plumbing', 'leak', 'burst', 'pipe', 'flood', 'urgent'],
        true
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Emergency Electrical',
        'emergency-electrical',
        'Emergency electrical service available 24/7. Includes power outages, exposed wiring, electrical fires, sparking outlets, and other dangerous electrical issues requiring immediate attention.',
        'Urgent 24/7 electrical emergency repair',
        200.00,
        'fixed',
        90,
        ARRAY['emergency', 'electrical', 'power', 'wiring', 'outlet', 'urgent'],
        true
    )
ON CONFLICT (id) DO NOTHING;
