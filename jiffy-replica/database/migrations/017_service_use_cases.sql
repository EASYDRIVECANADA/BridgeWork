-- Migration 017: Add use_cases column to services table
-- Stores a JSON array of strings representing what customers use the service for
-- Example: ["Dishwasher Install", "Washer Install", "Dryer Install"]

ALTER TABLE services ADD COLUMN IF NOT EXISTS use_cases JSONB DEFAULT '[]'::jsonb;
