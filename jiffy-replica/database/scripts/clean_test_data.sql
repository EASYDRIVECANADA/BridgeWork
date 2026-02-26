-- BridgeWork: Clean Transactional Test Data
-- This script removes all transactional data while preserving:
--   ✅ User accounts (profiles, auth.users)
--   ✅ Pro profiles (pro_profiles, pro_applications)
--   ✅ Services & service categories
--   ✅ Promo codes
--   ✅ Pro availability & time off settings
--
-- Run this in the Supabase SQL Editor.

BEGIN;

-- 1. Delete in FK-safe order (children first)

-- Job proof depends on bookings + pro_profiles
DELETE FROM job_proof;

-- Reviews depend on bookings + pro_profiles
DELETE FROM reviews;

-- Messages depend on bookings + profiles
DELETE FROM messages;

-- Transactions depend on bookings + profiles + pro_profiles
DELETE FROM transactions;

-- Support tickets depend on bookings + profiles
DELETE FROM support_tickets;

-- Notifications depend on profiles
DELETE FROM notifications;

-- Favorites depend on profiles + pro_profiles
DELETE FROM favorites;

-- Saved addresses depend on profiles
DELETE FROM saved_addresses;

-- Bookings depend on profiles + pro_profiles + services
DELETE FROM bookings;

-- 2. Reset pro_profiles stats (since all bookings are gone)
UPDATE pro_profiles SET
    total_jobs = 0,
    completed_jobs = 0;

-- 3. Clear stripe_customer_id so fresh Stripe customers are created on next payment
UPDATE profiles SET stripe_customer_id = NULL;

-- 4. Verify counts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT 'job_proof' AS tbl, COUNT(*) AS cnt FROM job_proof
        UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
        UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
        UNION ALL SELECT 'messages', COUNT(*) FROM messages
        UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
        UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
        UNION ALL SELECT 'favorites', COUNT(*) FROM favorites
        UNION ALL SELECT 'saved_addresses', COUNT(*) FROM saved_addresses
        UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets
    LOOP
        RAISE NOTICE '% : % rows remaining', r.tbl, r.cnt;
    END LOOP;
END $$;

COMMIT;
