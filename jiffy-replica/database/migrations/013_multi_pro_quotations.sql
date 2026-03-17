-- Migration: Multi-Pro Quotation System
-- Allows multiple pros to submit quotes for Free Quote bookings
-- Admin reviews and selects the winning quote

-- Add 'awaiting_quotes' and 'quote_approved' to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_quotes';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'quote_approved';

-- Create booking_quotations table for pro submissions
CREATE TABLE IF NOT EXISTS booking_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    pro_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    
    -- Quotation details from pro
    quoted_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    estimated_duration INTEGER, -- in minutes
    materials_included BOOLEAN DEFAULT FALSE,
    warranty_info TEXT,
    notes TEXT,
    
    -- Status: 'pending' (submitted), 'selected' (admin picked), 'rejected' (not selected)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
    
    -- Admin review fields
    selected_by UUID REFERENCES profiles(id),
    selected_at TIMESTAMPTZ,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One quote per pro per booking
    UNIQUE(booking_id, pro_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_quotations_booking ON booking_quotations(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_quotations_pro ON booking_quotations(pro_id);
CREATE INDEX IF NOT EXISTS idx_booking_quotations_status ON booking_quotations(status);
CREATE INDEX IF NOT EXISTS idx_bookings_awaiting_quotes ON bookings(status) WHERE status = 'awaiting_quotes';

-- Add selected_quotation_id to bookings table to track which quote was selected
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selected_quotation_id UUID REFERENCES booking_quotations(id);

-- Comments for documentation
COMMENT ON TABLE booking_quotations IS 'Stores quotations submitted by pros for Free Quote bookings';
COMMENT ON COLUMN booking_quotations.quoted_price IS 'Price quoted by the pro (before tax)';
COMMENT ON COLUMN booking_quotations.status IS 'pending=awaiting review, selected=admin picked this quote, rejected=not selected';
COMMENT ON COLUMN bookings.selected_quotation_id IS 'Reference to the winning quotation selected by admin';

-- RLS Policies for booking_quotations
ALTER TABLE booking_quotations ENABLE ROW LEVEL SECURITY;

-- Pros can view their own quotations
CREATE POLICY "Pros can view own quotations" ON booking_quotations
    FOR SELECT USING (
        pro_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
    );

-- Pros can insert quotations for awaiting_quotes bookings
CREATE POLICY "Pros can submit quotations" ON booking_quotations
    FOR INSERT WITH CHECK (
        pro_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
        AND booking_id IN (SELECT id FROM bookings WHERE status = 'awaiting_quotes')
    );

-- Pros can update their own pending quotations
CREATE POLICY "Pros can update own pending quotations" ON booking_quotations
    FOR UPDATE USING (
        pro_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
        AND status = 'pending'
    );

-- Admins can do everything
CREATE POLICY "Admins full access to quotations" ON booking_quotations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Customers can view selected quotations for their bookings
CREATE POLICY "Customers can view selected quotations" ON booking_quotations
    FOR SELECT USING (
        status = 'selected'
        AND booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
    );
