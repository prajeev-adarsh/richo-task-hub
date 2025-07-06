-- Create enum types for task categories and status
CREATE TYPE public.task_category AS ENUM ('student', 'skilled', 'ai', 'custom');
CREATE TYPE public.task_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category task_category NOT NULL,
  location TEXT NOT NULL,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  budget INTEGER NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  proof_required BOOLEAN NOT NULL DEFAULT false,
  status task_status NOT NULL DEFAULT 'open',
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for task access
CREATE POLICY "Users can view all tasks" 
ON public.tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Clients can create their own tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = client_id));

CREATE POLICY "Clients can update their own tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = client_id));

CREATE POLICY "Clients can delete their own tasks" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = client_id));

-- Create indexes for better performance
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_doer_id ON public.tasks(doer_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_category ON public.tasks(category);