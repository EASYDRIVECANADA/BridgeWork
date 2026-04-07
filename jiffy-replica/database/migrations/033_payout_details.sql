-- Migration 033: Add payout_details JSONB to pro_profiles
-- Stores method-specific payout info for cheque and direct deposit
-- cheque:         { cheque_payee, cheque_address }
-- direct_deposit: { bank_name, transit_number, account_number, institution_number }

ALTER TABLE pro_profiles
  ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN pro_profiles.payout_details IS
  'Stores method-specific payout credentials: cheque (cheque_payee, cheque_address) or direct_deposit (bank_name, transit_number, account_number, institution_number)';
