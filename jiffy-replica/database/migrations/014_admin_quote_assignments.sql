-- Migration: Admin-Controlled Quote Assignment System
-- Admin receives quote requests first and assigns specific pros to bid

-- Add 'pending_assignment' status to booking_status enum (before awaiting_quotes)
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_assignment';

-- Create quote_assignments table to track which pros are assigned to quote requests
CREATE TABLE IF NOT EXISTS quote_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    pro_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    
    -- Assignment tracking
    assigned_by UUID REFERENCES profiles(id),  -- Admin who assigned
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status: 'invited' (assigned), 'viewed' (pro saw it), 'quoted' (pro submitted), 'declined' (pro declined)
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'viewed', 'quoted', 'declined')),
    
    -- If pro declines
    declined_reason TEXT,
    declined_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One assignment per pro per booking
    UNIQUE(booking_id, pro_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_assignments_booking ON quote_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_quote_assignments_pro ON quote_assignments(pro_id);
CREATE INDEX IF NOT EXISTS idx_quote_assignments_status ON quote_assignments(status);
CREATE INDEX IF NOT EXISTS idx_bookings_pending_assignment ON bookings(status) WHERE status = 'pending_assignment';

-- Comments for documentation
COMMENT ON TABLE quote_assignments IS 'Tracks which pros are assigned to quote requests by admin';
COMMENT ON COLUMN quote_assignments.status IS 'invited=assigned by admin, viewed=pro saw request, quoted=pro submitted quote, declined=pro declined';

-- RLS Policies for quote_assignments
ALTER TABLE quote_assignments ENABLE ROW LEVEL SECURITY;

-- Pros can view their own assignments
CREATE POLICY "Pros can view own assignments" ON quote_assignments
    FOR SELECT USING (
        pro_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
    );

-- Pros can update their own assignments (to mark as viewed or declined)
CREATE POLICY "Pros can update own assignments" ON quote_assignments
    FOR UPDATE USING (
        pro_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
    );

-- Admins can do everything
CREATE POLICY "Admins full access to quote_assignments" ON quote_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
