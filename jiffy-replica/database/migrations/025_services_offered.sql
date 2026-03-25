-- Migration 025: Add services_offered to pro_profiles
-- Allows tracking specific services (not just categories) that a pro offers
-- service_categories is still derived from this for backward compatibility

ALTER TABLE pro_profiles
ADD COLUMN IF NOT EXISTS services_offered UUID[] DEFAULT '{}';

COMMENT ON COLUMN pro_profiles.services_offered IS 'Array of service IDs this pro is approved to perform. service_categories is auto-derived from these values.';
