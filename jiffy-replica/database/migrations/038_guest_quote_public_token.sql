-- Migration 038: Add public_token to guest_quote_requests for the guest quote portal
-- Run this in the Supabase SQL editor

-- 1. Add the public_token column with a UUID default
ALTER TABLE guest_quote_requests
    ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();

-- 2. Backfill any existing rows
UPDATE guest_quote_requests
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

-- 3. Enforce NOT NULL going forward
ALTER TABLE guest_quote_requests
    ALTER COLUMN public_token SET NOT NULL;

-- 4. Enforce uniqueness
ALTER TABLE guest_quote_requests
    DROP CONSTRAINT IF EXISTS guest_quote_requests_public_token_key;

ALTER TABLE guest_quote_requests
    ADD CONSTRAINT guest_quote_requests_public_token_key UNIQUE (public_token);

-- 5. Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_guest_quote_requests_public_token ON guest_quote_requests (public_token);
