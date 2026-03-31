-- Migration 033: Guest Quote Requests
-- Allows public (unauthenticated) users to submit free quote requests
-- Admin manages the full lifecycle: quote, payment link, invoice

CREATE TABLE IF NOT EXISTS guest_quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    
    -- Guest contact info (no user account required)
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    
    -- Service details
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    
    -- Location
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    
    -- Request details
    description TEXT,
    preferred_date DATE,
    preferred_time TEXT,
    
    -- Admin workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'quoted', 'payment_sent', 'paid', 'completed', 'cancelled')),
    admin_notes TEXT,
    quoted_price NUMERIC(10,2),
    tax_amount NUMERIC(10,2),
    
    -- Stripe Checkout Session tracking
    stripe_session_id TEXT,
    stripe_payment_url TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Invoice tracking
    invoice_sent_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin listing
CREATE INDEX IF NOT EXISTS idx_guest_quote_requests_status ON guest_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_guest_quote_requests_created ON guest_quote_requests(created_at DESC);

-- Add guest_quotes permission to existing admin profiles
UPDATE profiles
SET admin_permissions = admin_permissions || '{"guest_quotes": true}'::jsonb
WHERE role = 'admin'
  AND admin_permissions IS NOT NULL;
