-- Migration 040: Add proof-of-work fields to guest_quote_requests
-- Enables: Pro submits proof after completing work → Admin reviews → Admin sends payment link

ALTER TABLE guest_quote_requests
  ADD COLUMN IF NOT EXISTS proof_submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_description    TEXT,
  ADD COLUMN IF NOT EXISTS proof_photos         JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN guest_quote_requests.proof_submitted_at IS 'Timestamp when pro submitted proof of work';
COMMENT ON COLUMN guest_quote_requests.proof_description  IS 'Pro description of work completed';
COMMENT ON COLUMN guest_quote_requests.proof_photos       IS 'JSON array of Supabase Storage public URLs';

-- Update status CHECK to include proof_submitted
ALTER TABLE guest_quote_requests DROP CONSTRAINT IF EXISTS guest_quote_requests_status_check;
ALTER TABLE guest_quote_requests
  ADD CONSTRAINT guest_quote_requests_status_check
  CHECK (status IN (
    'pending', 'pro_assigned', 'pro_quoted', 'quoted',
    'proof_submitted', 'payment_sent', 'paid', 'completed', 'cancelled'
  ));

-- Index so admin can quickly filter by proof_submitted status
CREATE INDEX IF NOT EXISTS idx_guest_quote_requests_proof ON guest_quote_requests(proof_submitted_at) WHERE proof_submitted_at IS NOT NULL;
