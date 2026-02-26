-- Jiffy On Demand Replica - Seed Data
-- Run this in Supabase SQL Editor after 001 and 002

-- Insert Service Categories
INSERT INTO service_categories (id, name, slug, description, icon_url, display_order) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Handyman', 'handyman', 'General repairs and maintenance around your home', 'https://example.com/icons/handyman.svg', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Appliance Repair', 'appliance-repair', 'Fix and maintain your home appliances', 'https://example.com/icons/appliance.svg', 2),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Plumbing', 'plumbing', 'Plumbing repairs and installations', 'https://example.com/icons/plumbing.svg', 3),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Electrical', 'electrical', 'Electrical repairs and installations', 'https://example.com/icons/electrical.svg', 4),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'HVAC', 'hvac', 'Heating and cooling services', 'https://example.com/icons/hvac.svg', 5),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Lawn Care', 'lawn-care', 'Lawn maintenance and landscaping', 'https://example.com/icons/lawn.svg', 6),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Painting', 'painting', 'Interior and exterior painting services', 'https://example.com/icons/painting.svg', 7),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Carpentry', 'carpentry', 'Custom woodwork and repairs', 'https://example.com/icons/carpentry.svg', 8),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'Cleaning', 'cleaning', 'Professional cleaning services', 'https://example.com/icons/cleaning.svg', 9),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'Moving', 'moving', 'Moving and hauling services', 'https://example.com/icons/moving.svg', 10);

-- Insert Services
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, estimated_duration, tags) VALUES
    -- Handyman Services
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Furniture Assembly', 'furniture-assembly', 'Professional furniture assembly service for all types of furniture including IKEA, Wayfair, Amazon furniture and more.', 'Get your furniture assembled quickly', 75.00, 'fixed', 90, ARRAY['furniture', 'assembly', 'ikea']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TV Mounting', 'tv-mounting', 'Professional TV mounting service with proper wall anchoring and cable management.', 'Mount your TV safely on the wall', 100.00, 'fixed', 60, ARRAY['tv', 'mounting', 'wall']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Picture Hanging', 'picture-hanging', 'Hang pictures, mirrors, and artwork securely on any wall type.', 'Hang pictures and artwork professionally', 50.00, 'fixed', 45, ARRAY['pictures', 'hanging', 'artwork']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Door Repair', 'door-repair', 'Fix squeaky doors, adjust hinges, replace locks and handles.', 'Repair and maintain your doors', 85.00, 'fixed', 75, ARRAY['door', 'repair', 'locks']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Drywall Repair', 'drywall-repair', 'Patch holes, fix cracks, and repair damaged drywall.', 'Fix holes and cracks in walls', 95.00, 'fixed', 120, ARRAY['drywall', 'repair', 'walls']),
    
    -- Appliance Repair Services
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Dishwasher Repair', 'dishwasher-repair', 'Diagnose and repair dishwasher issues including leaks, drainage problems, and control issues.', 'Fix your dishwasher problems', 120.00, 'hourly', 90, ARRAY['dishwasher', 'appliance', 'repair']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Refrigerator Repair', 'refrigerator-repair', 'Repair cooling issues, ice maker problems, and general refrigerator malfunctions.', 'Get your fridge working again', 150.00, 'hourly', 120, ARRAY['refrigerator', 'appliance', 'repair']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Washer/Dryer Repair', 'washer-dryer-repair', 'Fix washing machine and dryer issues including leaks, noise, and performance problems.', 'Repair your laundry appliances', 130.00, 'hourly', 90, ARRAY['washer', 'dryer', 'laundry']),
    
    -- Plumbing Services
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Drain Cleaning', 'drain-cleaning', 'Clear clogged drains and pipes in kitchen, bathroom, or basement.', 'Unclog your drains quickly', 110.00, 'fixed', 60, ARRAY['drain', 'plumbing', 'unclog']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Faucet Repair', 'faucet-repair', 'Fix leaky faucets, replace cartridges, and repair fixtures.', 'Fix leaky faucets and fixtures', 90.00, 'fixed', 75, ARRAY['faucet', 'plumbing', 'leak']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Toilet Repair', 'toilet-repair', 'Repair running toilets, fix leaks, and replace parts.', 'Fix your toilet problems', 100.00, 'fixed', 60, ARRAY['toilet', 'plumbing', 'repair']),
    
    -- Lawn Care Services
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Lawn Mowing', 'lawn-mowing', 'Professional lawn mowing service with edging and cleanup.', 'Keep your lawn looking great', 60.00, 'fixed', 60, ARRAY['lawn', 'mowing', 'maintenance']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Yard Cleanup', 'yard-cleanup', 'Remove leaves, branches, and debris from your yard.', 'Clean up your yard', 80.00, 'hourly', 120, ARRAY['yard', 'cleanup', 'leaves']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Hedge Trimming', 'hedge-trimming', 'Trim and shape hedges, bushes, and shrubs.', 'Trim your hedges professionally', 70.00, 'fixed', 90, ARRAY['hedge', 'trimming', 'landscaping']);

-- Insert Promo Codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_booking_amount, max_discount, usage_limit, valid_from, valid_until) VALUES
    ('WELCOME10', 'Welcome discount for new users', 'percentage', 10.00, 50.00, 20.00, 1000, NOW(), NOW() + INTERVAL '90 days'),
    ('SAVE20', '20% off your first booking', 'percentage', 20.00, 100.00, 50.00, 500, NOW(), NOW() + INTERVAL '60 days'),
    ('SPRING25', 'Spring cleaning special', 'fixed', 25.00, 75.00, NULL, 200, NOW(), NOW() + INTERVAL '30 days');

-- Note: Test users should be created through the application's signup flow
-- as they need to be created in auth.users first via Supabase Auth.
-- The following are example profiles that would be created after signup:

-- Example profile structure (do not run, just for reference):
-- INSERT INTO profiles (id, email, full_name, role, city, state, latitude, longitude) VALUES
--     ('user-uuid-here', 'john.doe@example.com', 'John Doe', 'user', 'San Francisco', 'CA', 37.7749, -122.4194),
--     ('pro-uuid-here', 'jane.smith@example.com', 'Jane Smith', 'pro', 'San Francisco', 'CA', 37.7849, -122.4094);

-- To test the application, you'll need to:
-- 1. Sign up users through the UI (creates auth.users + profiles)
-- 2. Some users can apply to become pros through the application
-- 3. Admin can approve pro applications
-- 4. Then bookings, reviews, etc. can be created

-- Create a helper function to generate sample data after real users exist
CREATE OR REPLACE FUNCTION generate_sample_booking(
    p_user_id UUID,
    p_pro_id UUID,
    p_service_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_service services;
BEGIN
    SELECT * INTO v_service FROM services WHERE id = p_service_id;
    
    INSERT INTO bookings (
        id,
        booking_number,
        user_id,
        pro_id,
        service_id,
        service_name,
        service_description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        scheduled_date,
        scheduled_time,
        scheduled_datetime,
        estimated_duration,
        base_price,
        total_price,
        status
    ) VALUES (
        uuid_generate_v4(),
        generate_booking_number(),
        p_user_id,
        p_pro_id,
        p_service_id,
        v_service.name,
        v_service.description,
        '123 Main St',
        'San Francisco',
        'CA',
        '94102',
        37.7749,
        -122.4194,
        CURRENT_DATE + INTERVAL '3 days',
        '10:00:00',
        (CURRENT_DATE + INTERVAL '3 days' + TIME '10:00:00')::TIMESTAMPTZ,
        v_service.estimated_duration,
        v_service.base_price,
        v_service.base_price,
        'pending'
    ) RETURNING id INTO v_booking_id;
    
    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create test data (run after creating real users)
CREATE OR REPLACE FUNCTION create_test_data()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Test data creation complete. Services and categories are ready.';
    RAISE NOTICE 'Create users through the application signup flow to test full functionality.';
END;
$$ LANGUAGE plpgsql;

-- Run initial setup
SELECT create_test_data();

-- Create some helpful views for analytics

-- View for pro statistics
CREATE OR REPLACE VIEW pro_statistics AS
SELECT 
    pp.id as pro_id,
    pp.user_id,
    p.full_name,
    pp.business_name,
    pp.rating,
    pp.total_reviews,
    pp.completed_jobs,
    pp.acceptance_rate,
    pp.response_time,
    COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'pending') as pending_jobs,
    COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'in_progress') as active_jobs,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'succeeded'), 0) as total_earnings,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'succeeded' AND t.created_at >= NOW() - INTERVAL '30 days'), 0) as earnings_last_30_days
FROM pro_profiles pp
JOIN profiles p ON pp.user_id = p.id
LEFT JOIN bookings b ON pp.id = b.pro_id
LEFT JOIN transactions t ON pp.id = t.pro_id
GROUP BY pp.id, pp.user_id, p.full_name, pp.business_name, pp.rating, pp.total_reviews, 
         pp.completed_jobs, pp.acceptance_rate, pp.response_time;

-- View for popular services
CREATE OR REPLACE VIEW popular_services AS
SELECT 
    s.id,
    s.name,
    s.slug,
    sc.name as category_name,
    COUNT(b.id) as total_bookings,
    AVG(r.rating) as average_rating,
    COUNT(r.id) as total_reviews,
    s.base_price
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN bookings b ON s.id = b.service_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.slug, sc.name, s.base_price
ORDER BY total_bookings DESC;

-- View for booking analytics
CREATE OR REPLACE VIEW booking_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    AVG(total_price) as average_booking_value,
    SUM(total_price) FILTER (WHERE status = 'completed') as total_revenue
FROM bookings
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY booking_date DESC;

COMMENT ON VIEW pro_statistics IS 'Aggregate statistics for each pro';
COMMENT ON VIEW popular_services IS 'Most popular services by bookings and ratings';
COMMENT ON VIEW booking_analytics IS 'Daily booking statistics and revenue';
