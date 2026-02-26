-- Migration: Add per-pro custom commission rate
-- Default is NULL, which means use the platform default (PLATFORM_COMMISSION_RATE env var)

ALTER TABLE pro_profiles 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4) DEFAULT NULL;

COMMENT ON COLUMN pro_profiles.commission_rate IS 'Custom commission rate for this pro (e.g., 0.15 = 15%). NULL means use platform default.';
