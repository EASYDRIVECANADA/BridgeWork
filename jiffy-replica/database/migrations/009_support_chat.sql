-- Support Chat System
-- Allows users to chat with admins through the Help widget
-- Separate from booking-based messages

-- Support conversations table
CREATE TABLE support_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT DEFAULT 'Help Request',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    assigned_admin_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);
CREATE INDEX idx_support_conversations_admin ON support_conversations(assigned_admin_id);

-- Support messages table
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_messages_conversation ON support_messages(conversation_id);
CREATE INDEX idx_support_messages_sender ON support_messages(sender_id);
CREATE INDEX idx_support_messages_created ON support_messages(created_at DESC);

-- Trigger for updated_at on support_conversations
CREATE TRIGGER update_support_conversations_updated_at
    BEFORE UPDATE ON support_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own support conversations
CREATE POLICY "Users can view own support conversations"
    ON support_conversations FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create support conversations
CREATE POLICY "Users can create support conversations"
    ON support_conversations FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can view messages in their own conversations
CREATE POLICY "Users can view own support messages"
    ON support_messages FOR SELECT
    TO authenticated
    USING (
        conversation_id IN (
            SELECT id FROM support_conversations WHERE user_id = auth.uid()
        )
    );

-- Users can send messages in their own conversations
CREATE POLICY "Users can send support messages"
    ON support_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT id FROM support_conversations WHERE user_id = auth.uid()
        )
    );
