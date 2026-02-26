-- BridgeWork: Escrow Payment + Job Proof System
-- Run this in the Supabase SQL Editor.

-- 1. Add new columns to bookings for the escrow/proof/dispute flow
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS payment_held_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 2. Create job_proof table for pro to upload proof of work
CREATE TABLE IF NOT EXISTS job_proof (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    pro_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_proof_booking ON job_proof(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_proof_pro ON job_proof(pro_id);

-- 3. Add 'held' to the payment_status enum (for escrow holds)
-- Check if 'held' already exists before adding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'held' AND enumtypid = 'payment_status'::regtype) THEN
        ALTER TYPE payment_status ADD VALUE 'held';
    END IF;
END $$;

-- 4. Add 'disputed' to the booking_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disputed' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE booking_status ADD VALUE 'disputed';
    END IF;
END $$;
