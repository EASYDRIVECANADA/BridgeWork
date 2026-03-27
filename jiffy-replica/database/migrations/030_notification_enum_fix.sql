-- Migration 029: Fix notification_type enum + add notifications API support
-- The enum was missing 'admin' and 'profile_update_rejected' types that controllers already use

-- Add missing enum values (safe with IF NOT EXISTS pattern)
DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'profile_update_rejected';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'dispute';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
