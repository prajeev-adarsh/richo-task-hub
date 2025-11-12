-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments TEXT[], -- Array of storage URLs
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies: only participants can view/create
CREATE POLICY "Participants can view chat rooms"
  ON chat_rooms FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE id IN (client_id, doer_id)
    )
  );

CREATE POLICY "System can create chat rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE id IN (client_id, doer_id)
    )
  );

-- Messages policies: only room participants can view/send
CREATE POLICY "Room participants can view messages"
  ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.auth_user_id FROM users u
      JOIN chat_rooms cr ON u.id IN (cr.client_id, cr.doer_id)
      WHERE cr.id = messages.room_id
    )
  );

CREATE POLICY "Room participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT u.auth_user_id FROM users u
      JOIN chat_rooms cr ON u.id = cr.client_id OR u.id = cr.doer_id
      WHERE cr.id = messages.room_id
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = sender_id)
  );

-- Indexes for performance
CREATE INDEX idx_chat_rooms_task_id ON chat_rooms(task_id);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read ON messages(read) WHERE read = false;

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Room participants can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );