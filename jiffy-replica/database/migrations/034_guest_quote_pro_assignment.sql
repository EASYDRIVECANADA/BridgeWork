-- Migration 034: Guest Quote Pro Assignment
-- Adds pro assignment + quotation tracking to guest_quote_requests
-- Enables: Admin assigns pro → Pro submits quote → Admin sends to guest

-- Add pro assignment columns
ALTER TABLE guest_quote_requests
    ADD COLUMN IF NOT EXISTS assigned_pro_id UUID REFERENCES pro_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pro_quoted_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pro_quote_description TEXT,
    ADD COLUMN IF NOT EXISTS pro_estimated_duration TEXT,
    ADD COLUMN IF NOT EXISTS pro_warranty_info TEXT,
    ADD COLUMN IF NOT EXISTS pro_notes TEXT,
    ADD COLUMN IF NOT EXISTS pro_quote_submitted_at TIMESTAMPTZ;

-- Update status CHECK to include pro_assigned and pro_quoted
ALTER TABLE guest_quote_requests DROP CONSTRAINT IF EXISTS guest_quote_requests_status_check;
ALTER TABLE guest_quote_requests
    ADD CONSTRAINT guest_quote_requests_status_check
    CHECK (status IN ('pending', 'pro_assigned', 'pro_quoted', 'quoted', 'payment_sent', 'paid', 'completed', 'cancelled'));

-- Index for pro lookups
CREATE INDEX IF NOT EXISTS idx_guest_quote_requests_pro ON guest_quote_requests(assigned_pro_id);
