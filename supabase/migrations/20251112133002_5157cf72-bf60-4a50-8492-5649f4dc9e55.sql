-- Create notification_types enum
CREATE TYPE notification_type AS ENUM (
  'application_received',
  'application_accepted',
  'application_rejected',
  'task_assigned',
  'proof_submitted',
  'proof_accepted',
  'proof_rejected',
  'payment_released',
  'rating_received',
  'new_message',
  'new_comment'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, payload)
  VALUES (p_user_id, p_type, p_title, p_message, p_payload)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger function for new task application
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title TEXT;
  task_client_id UUID;
  doer_name TEXT;
BEGIN
  -- Get task details
  SELECT t.title, t.client_id INTO task_title, task_client_id
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get doer name
  SELECT u.name INTO doer_name
  FROM users u
  WHERE u.id = NEW.doer_id;
  
  -- Notify client
  PERFORM create_notification(
    task_client_id,
    'application_received',
    'New Application',
    doer_name || ' applied for "' || task_title || '"',
    jsonb_build_object('task_id', NEW.task_id, 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_application
AFTER INSERT ON task_applications
FOR EACH ROW
EXECUTE FUNCTION notify_new_application();

-- Trigger function for task assignment
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title TEXT;
  client_name TEXT;
BEGIN
  -- Only trigger when doer_id changes from NULL to a value
  IF OLD.doer_id IS NULL AND NEW.doer_id IS NOT NULL THEN
    -- Get task title
    SELECT title INTO task_title FROM tasks WHERE id = NEW.id;
    
    -- Get client name
    SELECT u.name INTO client_name
    FROM users u
    WHERE u.id = NEW.client_id;
    
    -- Notify doer
    PERFORM create_notification(
      NEW.doer_id,
      'task_assigned',
      'Task Assigned',
      client_name || ' assigned you to "' || task_title || '"',
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_task_assignment
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assignment();

-- Trigger function for proof submission
CREATE OR REPLACE FUNCTION notify_proof_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title TEXT;
  task_client_id UUID;
  doer_name TEXT;
BEGIN
  -- Get task details
  SELECT t.title, t.client_id INTO task_title, task_client_id
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get doer name
  SELECT u.name INTO doer_name
  FROM users u
  WHERE u.id = NEW.doer_id;
  
  -- Notify client
  PERFORM create_notification(
    task_client_id,
    'proof_submitted',
    'Proof Submitted',
    doer_name || ' submitted proof for "' || task_title || '"',
    jsonb_build_object('task_id', NEW.task_id, 'proof_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_proof_submission
AFTER INSERT ON proof_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_proof_submission();

-- Trigger function for new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_client_id UUID;
  room_doer_id UUID;
  sender_name TEXT;
  receiver_id UUID;
  task_title TEXT;
BEGIN
  -- Get room participants
  SELECT cr.client_id, cr.doer_id INTO room_client_id, room_doer_id
  FROM chat_rooms cr
  WHERE cr.id = NEW.room_id;
  
  -- Get sender name
  SELECT u.name INTO sender_name
  FROM users u
  WHERE u.id = NEW.sender_id;
  
  -- Get task title
  SELECT t.title INTO task_title
  FROM tasks t
  JOIN chat_rooms cr ON t.id = cr.task_id
  WHERE cr.id = NEW.room_id;
  
  -- Determine receiver (the one who didn't send the message)
  IF NEW.sender_id = room_client_id THEN
    receiver_id := room_doer_id;
  ELSE
    receiver_id := room_client_id;
  END IF;
  
  -- Notify receiver
  PERFORM create_notification(
    receiver_id,
    'new_message',
    'New Message',
    sender_name || ' sent you a message about "' || task_title || '"',
    jsonb_build_object('room_id', NEW.room_id, 'message_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();

-- Trigger function for new comment
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_client_id UUID;
  task_doer_id UUID;
  commenter_name TEXT;
  task_title TEXT;
BEGIN
  -- Get task details
  SELECT t.title, t.client_id, t.doer_id INTO task_title, task_client_id, task_doer_id
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get commenter name
  SELECT u.name INTO commenter_name
  FROM users u
  WHERE u.id = NEW.user_id;
  
  -- Notify client if commenter is not client
  IF NEW.user_id != task_client_id THEN
    PERFORM create_notification(
      task_client_id,
      'new_comment',
      'New Comment',
      commenter_name || ' commented on "' || task_title || '"',
      jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
    );
  END IF;
  
  -- Notify doer if exists and commenter is not doer
  IF task_doer_id IS NOT NULL AND NEW.user_id != task_doer_id THEN
    PERFORM create_notification(
      task_doer_id,
      'new_comment',
      'New Comment',
      commenter_name || ' commented on "' || task_title || '"',
      jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_comment
AFTER INSERT ON task_comments
FOR EACH ROW
EXECUTE FUNCTION notify_new_comment();

-- Trigger function for payment released
CREATE OR REPLACE FUNCTION notify_payment_released()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title TEXT;
BEGIN
  -- Only trigger when payment status changes to 'completed'
  IF OLD.payment_status != 'completed' AND NEW.payment_status = 'completed' THEN
    -- Get task title
    SELECT t.title INTO task_title
    FROM tasks t
    WHERE t.id = NEW.task_id;
    
    -- Notify doer
    IF NEW.doer_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.doer_id,
        'payment_released',
        'Payment Released',
        'Payment of ₹' || NEW.amount || ' released for "' || task_title || '"',
        jsonb_build_object('task_id', NEW.task_id, 'payment_id', NEW.id, 'amount', NEW.amount)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_payment_released
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_payment_released();

-- Trigger function for rating received
CREATE OR REPLACE FUNCTION notify_rating_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title TEXT;
  rater_name TEXT;
BEGIN
  -- Get task title
  SELECT t.title INTO task_title
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get rater name
  SELECT u.name INTO rater_name
  FROM users u
  WHERE u.id = NEW.from_user;
  
  -- Notify rated user
  PERFORM create_notification(
    NEW.to_user,
    'rating_received',
    'New Rating',
    rater_name || ' rated you ' || NEW.stars || ' stars for "' || task_title || '"',
    jsonb_build_object('task_id', NEW.task_id, 'rating_id', NEW.id, 'stars', NEW.stars)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_rating_received
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION notify_rating_received();