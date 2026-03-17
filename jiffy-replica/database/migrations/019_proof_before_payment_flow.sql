-- Migration: Proof Before Payment Flow
-- This modifies the booking flow so customers pay AFTER reviewing proof of work

-- 1. Add new booking statuses for the updated flow
DO $$
BEGIN
    -- Add 'proof_submitted' status if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'proof_submitted' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE booking_status ADD VALUE 'proof_submitted';
    END IF;
    
    -- Add 'proof_approved' status if not exists  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'proof_approved' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE booking_status ADD VALUE 'proof_approved';
    END IF;
END $$;

-- 2. Create dispute_messages table for customer-admin chat during disputes
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_booking ON dispute_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages(created_at DESC);

-- 3. Add dispute resolution fields to bookings if not exists
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS dispute_admin_id UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT NULL CHECK (dispute_status IN ('open', 'under_review', 'resolved', 'escalated'));

-- 4. Create admin_receipts table to store copies of payment receipts
CREATE TABLE IF NOT EXISTS admin_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pro_id UUID REFERENCES pro_profiles(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    receipt_number TEXT,
    receipt_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_receipts_booking ON admin_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_admin_receipts_customer ON admin_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_admin_receipts_created ON admin_receipts(created_at DESC);

-- 5. RLS Policies for dispute_messages
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view messages for their own bookings
CREATE POLICY "Customers can view dispute messages for own bookings"
    ON dispute_messages FOR SELECT
    TO authenticated
    USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- Customers can send messages for their own disputed bookings
CREATE POLICY "Customers can send dispute messages for own bookings"
    ON dispute_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid() AND status = 'disputed'
        )
    );

-- 6. RLS Policies for admin_receipts (admin only via service role)
ALTER TABLE admin_receipts ENABLE ROW LEVEL SECURITY;

-- Note: Admins access via supabaseAdmin (service role) which bypasses RLS
