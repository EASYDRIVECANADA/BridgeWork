-- Migration 027: payout withdrawals, payout settings, and payout calendar

CREATE TABLE IF NOT EXISTS payout_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    minimum_withdrawal_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payout_settings (minimum_withdrawal_amount)
SELECT 50.00
WHERE NOT EXISTS (
    SELECT 1 FROM payout_settings
);

CREATE TABLE IF NOT EXISTS payout_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_date DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('payout', 'holiday', 'event')),
    title TEXT NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_calendar_entry_date ON payout_calendar(entry_date ASC);
CREATE INDEX IF NOT EXISTS idx_payout_calendar_entry_type ON payout_calendar(entry_type);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pro_profile_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('e_transfer', 'stripe_connect')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    notes TEXT,
    admin_notes TEXT,
    scheduled_for_date DATE,
    payout_reference TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_pro_profile_id ON withdrawal_requests(pro_profile_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawal_requests_select_own ON withdrawal_requests;
CREATE POLICY withdrawal_requests_select_own ON withdrawal_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_payout_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payout_settings_updated_at ON payout_settings;
CREATE TRIGGER trigger_payout_settings_updated_at
    BEFORE UPDATE ON payout_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_payout_settings_updated_at();

CREATE OR REPLACE FUNCTION update_payout_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payout_calendar_updated_at ON payout_calendar;
CREATE TRIGGER trigger_payout_calendar_updated_at
    BEFORE UPDATE ON payout_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_payout_calendar_updated_at();

CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_requests_updated_at();