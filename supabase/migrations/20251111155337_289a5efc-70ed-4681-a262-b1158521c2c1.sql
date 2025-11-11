-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create task_comments table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Anyone involved in the task can view comments
CREATE POLICY "Users involved in task can view comments"
  ON task_comments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users 
      WHERE id IN (
        SELECT client_id FROM tasks WHERE id = task_comments.task_id
        UNION
        SELECT doer_id FROM tasks WHERE id = task_comments.task_id AND doer_id IS NOT NULL
      )
    )
  );

-- Users involved can create comments
CREATE POLICY "Users involved in task can create comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM users 
      WHERE id IN (
        SELECT client_id FROM tasks WHERE id = task_comments.task_id
        UNION
        SELECT doer_id FROM tasks WHERE id = task_comments.task_id AND doer_id IS NOT NULL
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON task_comments FOR DELETE
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- Create indexes for performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();