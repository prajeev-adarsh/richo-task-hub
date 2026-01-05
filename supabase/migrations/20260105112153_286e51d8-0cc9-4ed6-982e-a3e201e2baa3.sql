-- Create saved_tasks table for bookmarked tasks
CREATE TABLE public.saved_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved tasks"
ON public.saved_tasks
FOR SELECT
USING (auth.uid() IN (
  SELECT users.auth_user_id FROM users WHERE users.id = saved_tasks.user_id
));

CREATE POLICY "Users can save tasks"
ON public.saved_tasks
FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT users.auth_user_id FROM users WHERE users.id = saved_tasks.user_id
));

CREATE POLICY "Users can unsave tasks"
ON public.saved_tasks
FOR DELETE
USING (auth.uid() IN (
  SELECT users.auth_user_id FROM users WHERE users.id = saved_tasks.user_id
));