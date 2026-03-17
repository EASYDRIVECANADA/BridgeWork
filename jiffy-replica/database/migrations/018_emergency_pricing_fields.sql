-- Migration: Add emergency pricing fields to services table
-- This allows admin to set custom pricing for emergency services

-- Add emergency_base_price column
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS emergency_base_price DECIMAL(10,2) DEFAULT NULL;

-- Add emergency_pricing_type column
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS emergency_pricing_type VARCHAR(20) DEFAULT 'hourly';

-- Add comment for documentation
COMMENT ON COLUMN services.emergency_base_price IS 'Base price for emergency service bookings';
COMMENT ON COLUMN services.emergency_pricing_type IS 'Pricing type for emergency: fixed, hourly, per_job';
