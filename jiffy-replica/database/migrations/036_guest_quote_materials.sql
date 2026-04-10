-- Migration 036: Add materials fields to guest_quote_requests
-- Stores the pro's itemised materials list and computed total from the guest quote form

ALTER TABLE guest_quote_requests
  ADD COLUMN IF NOT EXISTS pro_materials_list   JSONB,
  ADD COLUMN IF NOT EXISTS pro_materials_total  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pro_work_price       NUMERIC(10,2);

COMMENT ON COLUMN guest_quote_requests.pro_materials_list  IS 'JSON array of { name, price } objects supplied by the pro';
COMMENT ON COLUMN guest_quote_requests.pro_materials_total IS 'Sum of all material prices submitted by the pro';
COMMENT ON COLUMN guest_quote_requests.pro_work_price      IS 'Labour/service portion of pro_quoted_price (excluding materials)';
