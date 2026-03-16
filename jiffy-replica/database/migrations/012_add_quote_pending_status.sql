-- Migration: Add 'quote_pending' status to booking_status enum
-- This status is used for Free Quote services that need admin pricing before going to pros

-- Add 'quote_pending' to the booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'quote_pending';

-- Add columns to bookings table for quote tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_free_quote BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_quote_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_set_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_set_by UUID REFERENCES profiles(id);

-- Create index for quote_pending bookings (admin query optimization)
CREATE INDEX IF NOT EXISTS idx_bookings_quote_pending ON bookings(status) WHERE status = 'quote_pending';

COMMENT ON COLUMN bookings.is_free_quote IS 'True if this booking was created from a Free Quote service';
COMMENT ON COLUMN bookings.admin_quote_notes IS 'Internal notes from admin when setting the quote price';
COMMENT ON COLUMN bookings.quote_set_at IS 'Timestamp when admin set the quote price';
COMMENT ON COLUMN bookings.quote_set_by IS 'Admin user who set the quote price';
