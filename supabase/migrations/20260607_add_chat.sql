-- Chat messaging table for AI assistant + WhatsApp integration
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_lookup ON chat_messages(client_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Clients can see their own messages
CREATE POLICY "Clients can view their own chat messages" ON chat_messages
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Salon owners see all messages for their salon
CREATE POLICY "Salon owners can view chat messages" ON chat_messages
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );
