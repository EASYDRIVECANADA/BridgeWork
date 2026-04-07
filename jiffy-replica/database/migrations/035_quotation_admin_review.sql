-- Migration 035: Add admin review / commission markup columns to booking_quotations
-- This gate allows admin to review and mark up a pro's submitted quote before the customer sees it.

-- Step 1: Expand the status CHECK constraint to allow the new 'pending_admin_review' status
ALTER TABLE booking_quotations DROP CONSTRAINT IF EXISTS booking_quotations_status_check;
ALTER TABLE booking_quotations ADD CONSTRAINT booking_quotations_status_check
    CHECK (status IN ('pending', 'selected', 'rejected', 'counter_offered', 'pending_admin_review'));

-- Step 2: Add commission / admin review columns
ALTER TABLE booking_quotations
  ADD COLUMN IF NOT EXISTS admin_price         NUMERIC(10, 2)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_amount   NUMERIC(10, 2)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_rate     NUMERIC(6, 4)    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_approved_at   TIMESTAMPTZ      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_approved_by   UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_review_notes  TEXT             DEFAULT NULL;

-- Step 3: Index to quickly find quotations awaiting admin review
CREATE INDEX IF NOT EXISTS idx_booking_quotations_pending_admin_review
  ON booking_quotations (status)
  WHERE status = 'pending_admin_review';

COMMENT ON COLUMN booking_quotations.admin_price        IS 'Customer-facing subtotal (pro quoted_price + commission). Set by admin during review.';
COMMENT ON COLUMN booking_quotations.commission_amount  IS 'BridgeWork platform commission added on top of the pro''s quoted_price.';
COMMENT ON COLUMN booking_quotations.commission_rate    IS 'Effective commission rate (commission_amount / quoted_price) stored for auditing.';
COMMENT ON COLUMN booking_quotations.admin_approved_at  IS 'Timestamp when admin approved this quotation and released it to the customer.';
COMMENT ON COLUMN booking_quotations.admin_approved_by  IS 'Profile ID of the admin who approved this quotation.';
COMMENT ON COLUMN booking_quotations.admin_review_notes IS 'Optional internal notes left by admin during review.';
