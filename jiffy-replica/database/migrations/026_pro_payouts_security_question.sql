-- Migration 026: Add Interac e-Transfer security question/answer fields to pro_payouts
-- These are set by the admin when recording a manual payout and emailed to the pro

ALTER TABLE pro_payouts
  ADD COLUMN IF NOT EXISTS security_question TEXT,
  ADD COLUMN IF NOT EXISTS security_answer   TEXT;
