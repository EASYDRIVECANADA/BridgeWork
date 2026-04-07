-- Migration 036: Admin quote editing capabilities
-- Allows admin to edit pro price and override tax rate before sending to customer

-- booking_quotations: add admin-edited pro price and tax rate used
ALTER TABLE booking_quotations
  ADD COLUMN IF NOT EXISTS admin_edited_pro_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_rate_used          NUMERIC(6, 4)  DEFAULT NULL;

-- guest_quote_requests: add commission tracking, admin-edited pro price, and tax rate used
ALTER TABLE guest_quote_requests
  ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_edited_pro_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_rate_used          NUMERIC(6, 4)  DEFAULT NULL;

COMMENT ON COLUMN booking_quotations.admin_edited_pro_price IS 'Admin-overridden pro price. NULL means original quoted_price was used.';
COMMENT ON COLUMN booking_quotations.tax_rate_used          IS 'Tax rate applied during admin review (e.g. 0.13 for 13%).';
COMMENT ON COLUMN guest_quote_requests.commission_amount      IS 'BridgeWork commission added on top of the pro price.';
COMMENT ON COLUMN guest_quote_requests.admin_edited_pro_price IS 'Admin-overridden pro price. NULL means original pro_quoted_price was used.';
COMMENT ON COLUMN guest_quote_requests.tax_rate_used          IS 'Tax rate applied when sending quote (e.g. 0.13 for 13%).';
