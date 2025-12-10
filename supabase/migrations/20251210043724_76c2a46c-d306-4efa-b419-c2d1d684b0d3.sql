-- Add new notification type for task posted
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_task_posted';

-- Create doer_skills table for storing doer expertise
CREATE TABLE public.doer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category task_category NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.doer_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doer_skills
CREATE POLICY "Users can view all doer skills"
ON public.doer_skills FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doers can insert their own skills"
ON public.doer_skills FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT auth_user_id FROM users WHERE id = doer_skills.user_id
));

CREATE POLICY "Doers can delete their own skills"
ON public.doer_skills FOR DELETE
USING (auth.uid() IN (
  SELECT auth_user_id FROM users WHERE id = doer_skills.user_id
));

-- Create portfolio_items table for doer work samples
CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category task_category,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_items
CREATE POLICY "Anyone authenticated can view portfolio items"
ON public.portfolio_items FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doers can insert their own portfolio items"
ON public.portfolio_items FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT auth_user_id FROM users WHERE id = portfolio_items.user_id
));

CREATE POLICY "Doers can update their own portfolio items"
ON public.portfolio_items FOR UPDATE
USING (auth.uid() IN (
  SELECT auth_user_id FROM users WHERE id = portfolio_items.user_id
));

CREATE POLICY "Doers can delete their own portfolio items"
ON public.portfolio_items FOR DELETE
USING (auth.uid() IN (
  SELECT auth_user_id FROM users WHERE id = portfolio_items.user_id
));

-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for portfolio bucket
CREATE POLICY "Anyone can view portfolio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own portfolio images"
ON storage.objects FOR DELETE
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to notify matching doers when a task is posted
CREATE OR REPLACE FUNCTION public.notify_matching_doers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_doer RECORD;
  client_name TEXT;
BEGIN
  -- Get client name
  SELECT name INTO client_name FROM users WHERE id = NEW.client_id;
  
  -- Find doers with matching skills (by category)
  FOR matching_doer IN
    SELECT DISTINCT ds.user_id
    FROM doer_skills ds
    JOIN users u ON u.id = ds.user_id
    WHERE ds.category = NEW.category
    AND u.id != NEW.client_id
    AND (
      NEW.is_remote = true 
      OR NEW.location ILIKE '%' || COALESCE(u.phone, '') || '%'
      OR true -- For now, notify all matching doers regardless of location
    )
  LOOP
    PERFORM create_notification(
      matching_doer.user_id,
      'new_task_posted',
      'New Task Matching Your Skills',
      client_name || ' posted "' || NEW.title || '" - ₹' || NEW.budget,
      jsonb_build_object('task_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifying matching doers
CREATE TRIGGER on_task_posted_notify_doers
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_doers();

-- Function to get public doer profile with stats
CREATE OR REPLACE FUNCTION public.get_doer_profile(_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  photo_url text,
  skills task_category[],
  avg_rating numeric,
  total_reviews bigint,
  completed_tasks bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.name,
    u.photo_url,
    ARRAY(SELECT category FROM doer_skills WHERE user_id = u.id) as skills,
    COALESCE(AVG(r.stars)::numeric, 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
  FROM users u
  LEFT JOIN ratings r ON r.to_user = u.id
  LEFT JOIN tasks t ON t.doer_id = u.id
  WHERE u.id = _user_id
  AND auth.uid() IS NOT NULL
  GROUP BY u.id, u.name, u.photo_url
$$;