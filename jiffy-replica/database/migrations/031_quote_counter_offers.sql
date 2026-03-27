-- Migration 030: Add counter-offer support to booking_quotations
-- Allows homeowners to counter-offer a pro's quoted price

-- Add counter-offer columns
ALTER TABLE booking_quotations
ADD COLUMN IF NOT EXISTS counter_offer_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS counter_offer_message TEXT,
ADD COLUMN IF NOT EXISTS counter_offered_at TIMESTAMPTZ;

-- Drop old status CHECK constraint and add new one with 'counter_offered'
ALTER TABLE booking_quotations DROP CONSTRAINT IF EXISTS booking_quotations_status_check;
ALTER TABLE booking_quotations ADD CONSTRAINT booking_quotations_status_check
    CHECK (status IN ('pending', 'selected', 'rejected', 'counter_offered'));
