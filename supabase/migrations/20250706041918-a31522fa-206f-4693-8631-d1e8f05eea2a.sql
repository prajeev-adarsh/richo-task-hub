-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, from_user, to_user)
);

-- Enable Row Level Security
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for ratings
CREATE POLICY "Users can view all ratings" 
ON public.ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create ratings for their tasks" 
ON public.ratings 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = from_user));

CREATE POLICY "Users can update their own ratings" 
ON public.ratings 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = from_user));

-- Create indexes for better performance
CREATE INDEX idx_ratings_task_id ON public.ratings(task_id);
CREATE INDEX idx_ratings_from_user ON public.ratings(from_user);
CREATE INDEX idx_ratings_to_user ON public.ratings(to_user);
CREATE INDEX idx_ratings_stars ON public.ratings(stars);