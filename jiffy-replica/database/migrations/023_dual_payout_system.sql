-- Migration: Dual Payout System (Stripe Connect + Interac e-Transfer)
-- Adds payout_method and etransfer_email to pro_profiles,
-- creates pro_payouts table to track earnings and admin-initiated payouts.

-- Add payout method fields to pro_profiles
ALTER TABLE pro_profiles
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'e_transfer' CHECK (payout_method IN ('e_transfer', 'stripe_connect')),
ADD COLUMN IF NOT EXISTS etransfer_email TEXT;

COMMENT ON COLUMN pro_profiles.payout_method IS 'How the pro receives earnings: e_transfer (admin sends Interac) or stripe_connect (automated via Stripe)';
COMMENT ON COLUMN pro_profiles.etransfer_email IS 'Email address for Interac e-Transfer payouts (used when payout_method = e_transfer)';

-- Pro payouts ledger: tracks every earning and every payout
CREATE TABLE IF NOT EXISTS pro_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pro_profile_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Earning or payout
    type TEXT NOT NULL CHECK (type IN ('earning', 'payout')),

    -- For earnings: link to the booking/transaction that generated it
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Money
    amount DECIMAL(10,2) NOT NULL,           -- positive for earnings, positive for payouts
    platform_fee DECIMAL(10,2) DEFAULT 0,    -- platform commission taken (only for earnings)
    commission_rate DECIMAL(5,4) DEFAULT 0,  -- commission rate at time of earning

    -- Payout details (for type = 'payout')
    payout_method TEXT CHECK (payout_method IN ('e_transfer', 'stripe_connect', 'stripe_transfer')),
    payout_reference TEXT,                    -- e-Transfer confirmation #, Stripe transfer ID, etc.
    paid_by UUID REFERENCES profiles(id),    -- admin who initiated the payout
    paid_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pro_payouts_pro_profile_id ON pro_payouts(pro_profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_payouts_user_id ON pro_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_payouts_type ON pro_payouts(type);
CREATE INDEX IF NOT EXISTS idx_pro_payouts_status ON pro_payouts(status);
CREATE INDEX IF NOT EXISTS idx_pro_payouts_booking_id ON pro_payouts(booking_id);
CREATE INDEX IF NOT EXISTS idx_pro_payouts_created_at ON pro_payouts(created_at DESC);

-- RLS policies
ALTER TABLE pro_payouts ENABLE ROW LEVEL SECURITY;

-- Pros can view their own payouts
CREATE POLICY pro_payouts_select_own ON pro_payouts
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all payouts (service role bypasses RLS)
-- Insert/update handled via supabaseAdmin (service role) in backend

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pro_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pro_payouts_updated_at
    BEFORE UPDATE ON pro_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_pro_payouts_updated_at();
