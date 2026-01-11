-- Create a secure function for sending contact messages to doers
-- This function validates the sender, sanitizes input, and implements rate limiting

CREATE OR REPLACE FUNCTION public.send_contact_message(
  p_doer_id UUID,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id UUID;
  v_sender_name TEXT;
  v_recent_count INTEGER;
  v_notification_id UUID;
  v_sanitized_message TEXT;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get sender's public.users.id and name
  SELECT id, name INTO v_sender_id, v_sender_name
  FROM users
  WHERE auth_user_id = auth.uid()
  AND deleted_at IS NULL;
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Prevent sending messages to self
  IF v_sender_id = p_doer_id THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;
  
  -- Validate doer exists and is not deleted
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_doer_id 
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;
  
  -- Validate message content
  IF p_message IS NULL OR LENGTH(TRIM(p_message)) < 10 THEN
    RAISE EXCEPTION 'Message must be at least 10 characters';
  END IF;
  
  IF LENGTH(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message cannot exceed 1000 characters';
  END IF;
  
  -- Rate limiting: max 5 contact messages per hour to any user
  SELECT COUNT(*) INTO v_recent_count
  FROM notifications
  WHERE payload->>'from_user_id' = v_sender_id::text
  AND type = 'new_message'
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;
  
  -- Rate limiting: max 2 messages to the same doer per day
  SELECT COUNT(*) INTO v_recent_count
  FROM notifications
  WHERE user_id = p_doer_id
  AND payload->>'from_user_id' = v_sender_id::text
  AND type = 'new_message'
  AND created_at > NOW() - INTERVAL '24 hours';
  
  IF v_recent_count >= 2 THEN
    RAISE EXCEPTION 'You can only send 2 messages per day to the same expert. Please wait.';
  END IF;
  
  -- Sanitize message (basic HTML/script removal)
  v_sanitized_message := REGEXP_REPLACE(
    REGEXP_REPLACE(p_message, '<[^>]*>', '', 'g'),
    E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'
  );
  
  -- Create the notification using internal function call
  INSERT INTO notifications (user_id, type, title, message, payload)
  VALUES (
    p_doer_id,
    'new_message'::notification_type,
    'New message from a client',
    v_sender_name || ' wants to connect: "' || 
      SUBSTRING(v_sanitized_message FROM 1 FOR 100) || 
      CASE WHEN LENGTH(v_sanitized_message) > 100 THEN '...' ELSE '' END || '"',
    jsonb_build_object(
      'from_user_id', v_sender_id,
      'from_user_name', v_sender_name,
      'message', v_sanitized_message
    )
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$function$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.send_contact_message(UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.send_contact_message IS 'Securely sends a contact message from a client to a doer/expert with rate limiting and input validation';