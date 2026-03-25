-- 024_superadmin_permissions.sql
-- Adds SuperAdmin role and per-admin permission controls

-- Add is_superadmin flag and admin_permissions JSON column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT NULL;

-- Index for fast SuperAdmin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON profiles(is_superadmin) WHERE is_superadmin = true;

-- Set admin@bridgework.ca as SuperAdmin
UPDATE profiles
SET is_superadmin = true
WHERE email = 'admin@bridgework.ca' AND role = 'admin';

-- Comment: admin_permissions JSONB structure (null = no access to anything except revenue):
-- {
--   "revenue": true,
--   "services": true,
--   "categories": true,
--   "pro_applications": true,
--   "profile_updates": true,
--   "invitations": true,
--   "payouts": true,
--   "quotations": true,
--   "quote_assignments": true,
--   "quote_requests": true,
--   "proofs": true,
--   "support_chat": true,
--   "disputes": true
-- }

-- Add admin_permissions column to admin_invitations table
-- so permissions can be pre-assigned when the invitation is created
ALTER TABLE admin_invitations
  ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT NULL;
