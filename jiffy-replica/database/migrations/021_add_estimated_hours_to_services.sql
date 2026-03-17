-- Migration: Add additional_hourly_rate to services table
-- This field stores the hourly rate for additional work beyond the base service

-- Add additional_hourly_rate column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS additional_hourly_rate DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN services.additional_hourly_rate IS 'Hourly rate charged for additional hours when pros submit additional invoices (CAD)';
