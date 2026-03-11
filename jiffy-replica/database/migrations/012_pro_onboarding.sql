-- Migration: Pro Onboarding Flow
-- Adds fields to track multi-step onboarding progress, digital service agreement acceptance,
-- business details, insurance, references, and admin approval gating.

-- Add onboarding tracking to pro_profiles
ALTER TABLE pro_profiles
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_unit TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS how_heard TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
ADD COLUMN IF NOT EXISTS reference_1_name TEXT,
ADD COLUMN IF NOT EXISTS reference_1_phone TEXT,
ADD COLUMN IF NOT EXISTS reference_1_email TEXT,
ADD COLUMN IF NOT EXISTS reference_1_relationship TEXT,
ADD COLUMN IF NOT EXISTS reference_2_name TEXT,
ADD COLUMN IF NOT EXISTS reference_2_phone TEXT,
ADD COLUMN IF NOT EXISTS reference_2_email TEXT,
ADD COLUMN IF NOT EXISTS reference_2_relationship TEXT,
ADD COLUMN IF NOT EXISTS service_agreement_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS service_agreement_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS service_agreement_version TEXT,
ADD COLUMN IF NOT EXISTS service_agreement_ip TEXT,
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;

COMMENT ON COLUMN pro_profiles.onboarding_step IS 'Current onboarding step: 0=not started, 1=business info, 2=service agreement, 3=requirements, 4=stripe, 5=complete';
COMMENT ON COLUMN pro_profiles.onboarding_completed IS 'True when all onboarding steps are finished';
COMMENT ON COLUMN pro_profiles.service_agreement_accepted IS 'True when pro accepted the digital service agreement';
COMMENT ON COLUMN pro_profiles.admin_approved IS 'True when admin has reviewed and approved this pro';
COMMENT ON COLUMN pro_profiles.commission_rate IS 'Custom commission rate for this pro (e.g., 0.15 = 15%). NULL means use platform default.';

-- Update pro_applications to add service agreement tracking
ALTER TABLE pro_applications
ADD COLUMN IF NOT EXISTS service_agreement_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS service_agreement_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
