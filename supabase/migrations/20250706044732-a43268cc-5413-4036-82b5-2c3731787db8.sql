-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  client_id UUID NOT NULL,
  doer_id UUID NULL,
  amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  razorpay_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add payment_status column to tasks table
ALTER TABLE public.tasks ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid'));

-- Enable Row Level Security on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can view payments they're involved in" 
ON public.payments 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u WHERE u.id = payments.client_id
  ) OR 
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u WHERE u.id = payments.doer_id
  )
);

CREATE POLICY "Clients can create payments for their tasks" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u WHERE u.id = payments.client_id
  )
);

CREATE POLICY "System can update payment status" 
ON public.payments 
FOR UPDATE 
USING (true);

-- Add foreign key constraints
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_task_id 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_client_id 
FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_doer_id 
FOREIGN KEY (doer_id) REFERENCES public.users(id) ON DELETE SET NULL;