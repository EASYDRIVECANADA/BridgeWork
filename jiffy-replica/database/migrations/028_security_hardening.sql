-- Migration 027: Security Hardening (P0 Bug Fixes)
-- Fixes: BUG-001 (SQL injection), BUG-005 (webhook idempotency)

-- ============================================================
-- 1. Parameterized nearby-pro search function (fixes BUG-001)
-- Replaces raw SQL exec_sql() with a typed, parameterized function
-- ============================================================
CREATE OR REPLACE FUNCTION find_nearby_pros(
    p_lon DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION,
    p_service_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    business_name TEXT,
    business_address TEXT,
    business_unit TEXT,
    gst_number TEXT,
    years_experience INTEGER,
    service_categories TEXT[],
    services_offered UUID[],
    hourly_rate NUMERIC,
    is_available BOOLEAN,
    is_verified BOOLEAN,
    admin_approved BOOLEAN,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_expiry DATE,
    insurance_document_url TEXT,
    license_number TEXT,
    bio TEXT,
    website TEXT,
    service_radius INTEGER,
    payout_method TEXT,
    etransfer_email TEXT,
    stripe_account_id TEXT,
    commission_rate NUMERIC,
    onboarding_step INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    city TEXT,
    state TEXT,
    distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.id,
        pp.user_id,
        pp.business_name,
        pp.business_address,
        pp.business_unit,
        pp.gst_number,
        pp.years_experience,
        pp.service_categories,
        pp.services_offered,
        pp.hourly_rate,
        pp.is_available,
        pp.is_verified,
        pp.admin_approved,
        pp.insurance_provider,
        pp.insurance_policy_number,
        pp.insurance_expiry,
        pp.insurance_document_url,
        pp.license_number,
        pp.bio,
        pp.website,
        pp.service_radius,
        pp.payout_method,
        pp.etransfer_email,
        pp.stripe_account_id,
        pp.commission_rate,
        pp.onboarding_step,
        pp.created_at,
        pp.updated_at,
        p.full_name,
        p.avatar_url,
        p.city,
        p.state,
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) / 1609.34 AS distance_miles
    FROM pro_profiles pp
    JOIN profiles p ON pp.user_id = p.id
    WHERE pp.is_available = true
      AND pp.is_verified = true
      AND ST_DWithin(
          p.location,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
          p_radius_meters
      )
      AND (p_service_category IS NULL OR p_service_category = ANY(pp.service_categories))
    ORDER BY distance_miles
    LIMIT 20;
END;
$$;

-- ============================================================
-- 2. Stripe webhook events table (fixes BUG-005)
-- Stores processed event IDs for idempotency
-- ============================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id TEXT PRIMARY KEY,               -- Stripe event ID (evt_...)
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup of old events (retain 30 days)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
    ON stripe_webhook_events (processed_at);

-- ============================================================
-- 3. Audit log table (FR-8.2)
-- Immutable admin action log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
