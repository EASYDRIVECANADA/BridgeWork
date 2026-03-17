-- Migration: Additional Invoices for Rate-Based Bookings
-- This allows pros to add extra charges (labor hours + materials) when submitting proof of work

-- 1. Create additional_invoices table
CREATE TABLE IF NOT EXISTS additional_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    pro_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    
    -- Original booking amount
    original_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Additional labor charges
    additional_hours DECIMAL(5,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    labor_total DECIMAL(10,2) DEFAULT 0,
    
    -- Materials used (JSON array of items)
    -- Format: [{name: string, quantity: number, unit_price: number, total: number}]
    materials JSONB DEFAULT '[]'::jsonb,
    materials_total DECIMAL(10,2) DEFAULT 0,
    
    -- Totals
    subtotal DECIMAL(10,2) DEFAULT 0,          -- labor_total + materials_total
    tax DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0.13,        -- Store the tax rate used
    grand_total DECIMAL(10,2) DEFAULT 0,       -- original_amount + subtotal + tax
    
    -- Notes explaining additional charges
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',       -- pending, approved, rejected
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one additional invoice per booking
    UNIQUE(booking_id)
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_additional_invoices_booking_id ON additional_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_additional_invoices_pro_id ON additional_invoices(pro_id);
CREATE INDEX IF NOT EXISTS idx_additional_invoices_status ON additional_invoices(status);

-- 3. Add has_additional_invoice flag to bookings for quick filtering
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS has_additional_invoice BOOLEAN DEFAULT FALSE;

-- 4. Add updated_total_price to bookings to store the new total after additional invoice
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_total_price DECIMAL(10,2);

-- 5. Enable RLS
ALTER TABLE additional_invoices ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Pros can view their own additional invoices
CREATE POLICY "Pros can view own additional invoices"
    ON additional_invoices FOR SELECT
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Pros can create additional invoices for their bookings
CREATE POLICY "Pros can create additional invoices for own bookings"
    ON additional_invoices FOR INSERT
    TO authenticated
    WITH CHECK (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Customers can view additional invoices for their bookings
CREATE POLICY "Customers can view additional invoices for own bookings"
    ON additional_invoices FOR SELECT
    TO authenticated
    USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- Admins access via supabaseAdmin (service role) which bypasses RLS

-- 7. Function to update timestamps
CREATE OR REPLACE FUNCTION update_additional_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger for updated_at
DROP TRIGGER IF EXISTS additional_invoices_updated_at ON additional_invoices;
CREATE TRIGGER additional_invoices_updated_at
    BEFORE UPDATE ON additional_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_additional_invoice_timestamp();
