-- Create enum type for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create task_applications table
CREATE TABLE public.task_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  doer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, doer_id)
);

-- Enable Row Level Security
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for task applications
CREATE POLICY "Users can view all task applications" 
ON public.task_applications 
FOR SELECT 
USING (true);

CREATE POLICY "Doers can create their own applications" 
ON public.task_applications 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = doer_id));

CREATE POLICY "Doers can view their own applications" 
ON public.task_applications 
FOR SELECT 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = doer_id));

CREATE POLICY "Clients can update applications for their tasks" 
ON public.task_applications 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users u JOIN public.tasks t ON u.id = t.client_id WHERE t.id = task_id));

-- Create indexes for better performance
CREATE INDEX idx_task_applications_task_id ON public.task_applications(task_id);
CREATE INDEX idx_task_applications_doer_id ON public.task_applications(doer_id);
CREATE INDEX idx_task_applications_status ON public.task_applications(status);