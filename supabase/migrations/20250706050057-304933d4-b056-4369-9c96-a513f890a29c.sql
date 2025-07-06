-- Add upi_id to users table
ALTER TABLE public.users ADD COLUMN upi_id TEXT;

-- Add payment_mode and uploaded_proof to payments table
ALTER TABLE public.payments ADD COLUMN payment_mode TEXT DEFAULT 'upi_manual' CHECK (payment_mode IN ('upi_manual', 'razorpay'));
ALTER TABLE public.payments ADD COLUMN uploaded_proof TEXT;