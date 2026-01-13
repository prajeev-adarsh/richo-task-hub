-- Add database-level validation constraints for input security
-- This provides server-side validation as a defense-in-depth measure

-- Add CHECK constraints for text field lengths on tasks table
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_title_length CHECK (char_length(title) <= 200),
ADD CONSTRAINT tasks_description_length CHECK (char_length(description) <= 5000),
ADD CONSTRAINT tasks_location_length CHECK (char_length(location) <= 200);

-- Add CHECK constraints for task_comments table
ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_content_length CHECK (char_length(content) <= 2000);

-- Add CHECK constraints for messages table
ALTER TABLE public.messages
ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 5000);

-- Add CHECK constraints for ratings review
ALTER TABLE public.ratings
ADD CONSTRAINT ratings_review_length CHECK (char_length(review) <= 1000);

-- Add CHECK constraints for users bio
ALTER TABLE public.users
ADD CONSTRAINT users_bio_length CHECK (char_length(bio) <= 2000),
ADD CONSTRAINT users_name_length CHECK (char_length(name) <= 100);

-- Add CHECK constraints for portfolio_items
ALTER TABLE public.portfolio_items
ADD CONSTRAINT portfolio_items_title_length CHECK (char_length(title) <= 200),
ADD CONSTRAINT portfolio_items_description_length CHECK (char_length(description) <= 1000);

-- Create rate limiting function for task creation
CREATE OR REPLACE FUNCTION public.check_task_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_count INTEGER;
BEGIN
  -- Check how many tasks the user has created in the last 24 hours
  SELECT COUNT(*) INTO task_count
  FROM public.tasks
  WHERE client_id = NEW.client_id
    AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Allow maximum 20 tasks per day per user
  IF task_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 20 tasks per day allowed. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task rate limiting
DROP TRIGGER IF EXISTS enforce_task_rate_limit ON public.tasks;
CREATE TRIGGER enforce_task_rate_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_rate_limit();

-- Create rate limiting function for comments
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_count INTEGER;
BEGIN
  -- Check how many comments the user has posted in the last hour
  SELECT COUNT(*) INTO comment_count
  FROM public.task_comments
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow maximum 50 comments per hour per user
  IF comment_count >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 50 comments per hour allowed. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment rate limiting
DROP TRIGGER IF EXISTS enforce_comment_rate_limit ON public.task_comments;
CREATE TRIGGER enforce_comment_rate_limit
  BEFORE INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_comment_rate_limit();