-- Migration 037: Add public_token to quotes for the public accept-quote portal
-- Run this in the Supabase SQL editor

-- 1. Add the public_token column with a UUID default
ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();

-- 2. Backfill any existing rows that have a NULL token
UPDATE quotes
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

-- 3. Enforce NOT NULL going forward
ALTER TABLE quotes
    ALTER COLUMN public_token SET NOT NULL;

-- 4. Ensure uniqueness
ALTER TABLE quotes
    DROP CONSTRAINT IF EXISTS quotes_public_token_key;

ALTER TABLE quotes
    ADD CONSTRAINT quotes_public_token_key UNIQUE (public_token);

-- 5. Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes (public_token);
