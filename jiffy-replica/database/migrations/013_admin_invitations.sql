-- Admin Invitations System
-- Allows existing admins to invite new admins via email

CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_invited_by ON admin_invitations(invited_by);

-- Updated_at trigger
CREATE TRIGGER update_admin_invitations_updated_at
    BEFORE UPDATE ON admin_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
    ON admin_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
    ON admin_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
    ON admin_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE admin_invitations IS 'Stores admin invitation tokens and metadata';
COMMENT ON COLUMN admin_invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN admin_invitations.expires_at IS 'Invitation expiry timestamp (typically 7 days)';
