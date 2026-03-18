-- ============================================================
-- CLEANUP TEST DATA — Safe Script
-- Deletes all transactional/test data while preserving:
--   ✅ profiles (user/pro/admin accounts)
--   ✅ pro_profiles (pro business info — stats will be reset)
--   ✅ pro_applications (approval history)
--   ✅ services & service_categories (catalog)
--   ✅ pro_availability & pro_time_off (schedules)
--   ✅ saved_addresses, favorites, promo_codes
-- ============================================================

-- Run this in Supabase SQL Editor
-- IMPORTANT: Execute as a single transaction

BEGIN;

-- ==================== LAYER 1: Leaf tables (no dependents) ====================

-- Dispute chat messages
DELETE FROM dispute_messages;

-- Admin payment receipts
DELETE FROM admin_receipts;

-- Job proof photos
DELETE FROM job_proof;

-- Additional invoices (extra charges on bookings)
DELETE FROM additional_invoices;

-- Invoice line items
DELETE FROM invoice_items;

-- Quote line items
DELETE FROM quote_items;

-- Clear FK references from bookings before deleting child tables
UPDATE bookings SET selected_quotation_id = NULL WHERE selected_quotation_id IS NOT NULL;
UPDATE bookings SET has_additional_invoice = FALSE WHERE has_additional_invoice = TRUE;

-- Pro-submitted quotations for bookings
DELETE FROM booking_quotations;

-- Admin quote assignments
DELETE FROM quote_assignments;

-- Support chat
DELETE FROM support_messages;
DELETE FROM support_conversations;

-- Notifications
DELETE FROM notifications;

-- ==================== LAYER 2: Mid-level tables ====================

-- Reviews (must go before bookings due to FK)
DELETE FROM reviews;

-- Messages (booking chat)
DELETE FROM messages;

-- Transactions (Stripe payments)
DELETE FROM transactions;

-- Invoices (from quotes system)
DELETE FROM invoices;

-- Quotes (from quotes system)
DELETE FROM quotes;

-- ==================== LAYER 3: Core table ====================

-- Bookings (all jobs, requests, active jobs, quote requests)
DELETE FROM bookings;

-- ==================== LAYER 4: Reset pro profile stats ====================

-- Reset all pro stats to clean slate (accounts stay intact)
UPDATE pro_profiles SET
    rating = 0.00,
    total_reviews = 0,
    total_jobs = 0,
    completed_jobs = 0,
    acceptance_rate = 0.00;

-- ==================== DONE ====================

COMMIT;

-- Verify cleanup
SELECT 'bookings' AS table_name, COUNT(*) AS row_count FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'booking_quotations', COUNT(*) FROM booking_quotations
UNION ALL SELECT 'quote_assignments', COUNT(*) FROM quote_assignments
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'job_proof', COUNT(*) FROM job_proof
UNION ALL SELECT 'additional_invoices', COUNT(*) FROM additional_invoices
UNION ALL SELECT 'dispute_messages', COUNT(*) FROM dispute_messages
UNION ALL SELECT 'support_conversations', COUNT(*) FROM support_conversations
UNION ALL SELECT 'profiles (KEPT)', COUNT(*) FROM profiles
UNION ALL SELECT 'pro_profiles (KEPT)', COUNT(*) FROM pro_profiles
UNION ALL SELECT 'services (KEPT)', COUNT(*) FROM services
ORDER BY table_name;
