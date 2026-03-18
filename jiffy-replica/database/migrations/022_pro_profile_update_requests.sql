-- Migration: Pro Profile Update Requests
-- When a Pro edits sensitive fields (business info, insurance), the changes
-- go into a pending-review queue instead of being applied immediately.
-- An admin reviews, then approves (applying the changes) or rejects.
 
CREATE TYPE profile_update_status AS ENUM ('pending', 'approved', 'rejected');
 
CREATE TABLE pro_profile_update_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pro_profile_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status profile_update_status DEFAULT 'pending',
    -- Snapshot of the requested changes (JSON with field_name → new_value)
    requested_changes JSONB NOT NULL DEFAULT '{}',
    -- Snapshot of the old values before the change
    previous_values JSONB NOT NULL DEFAULT '{}',
    -- Admin review
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
 
CREATE INDEX idx_pro_update_requests_pro ON pro_profile_update_requests(pro_profile_id);
CREATE INDEX idx_pro_update_requests_status ON pro_profile_update_requests(status);
CREATE INDEX idx_pro_update_requests_user ON pro_profile_update_requests(user_id);
 
-- Trigger for updated_at
CREATE TRIGGER update_pro_profile_update_requests_updated_at
    BEFORE UPDATE ON pro_profile_update_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
 
COMMENT ON TABLE pro_profile_update_requests IS 'Stores pending profile changes from Pros that require admin approval before being applied';
COMMENT ON COLUMN pro_profile_update_requests.requested_changes IS 'JSON object mapping field names to their new requested values';
COMMENT ON COLUMN pro_profile_update_requests.previous_values IS 'JSON object mapping field names to their values before the change request';