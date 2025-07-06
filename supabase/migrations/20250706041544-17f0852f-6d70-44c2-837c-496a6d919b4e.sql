-- Create enum type for proof submission status
CREATE TYPE public.proof_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create proof_submissions table
CREATE TABLE public.proof_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  doer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status proof_status NOT NULL DEFAULT 'pending',
  UNIQUE(task_id, doer_id)
);

-- Enable Row Level Security
ALTER TABLE public.proof_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for proof submissions
CREATE POLICY "Users can view all proof submissions" 
ON public.proof_submissions 
FOR SELECT 
USING (true);

CREATE POLICY "Doers can create their own proof submissions" 
ON public.proof_submissions 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = doer_id));

CREATE POLICY "Doers can update their own proof submissions" 
ON public.proof_submissions 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = doer_id));

-- Create indexes for better performance
CREATE INDEX idx_proof_submissions_task_id ON public.proof_submissions(task_id);
CREATE INDEX idx_proof_submissions_doer_id ON public.proof_submissions(doer_id);
CREATE INDEX idx_proof_submissions_status ON public.proof_submissions(status);

-- Create storage bucket for proof files
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', true);

-- Create storage policies for proof files
CREATE POLICY "Anyone can view proof files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'proofs');

CREATE POLICY "Authenticated users can upload proof files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own proof files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own proof files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]);