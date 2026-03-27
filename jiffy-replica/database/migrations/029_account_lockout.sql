-- Migration 028: Account lockout after failed login attempts (FR-1.6)
-- 5 failed attempts within 15 minutes triggers a 15-minute lockout

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- Cleanup function: delete attempts older than 24 hours (keep table small)
-- Can be called periodically via a cron job or pg_cron
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE login_attempts IS 'Tracks login attempts for account lockout (FR-1.6). 5 failures in 15 min = 15 min lockout.';
