-- Drop the razorpay_payment_id column from payments table
ALTER TABLE public.payments DROP COLUMN IF EXISTS razorpay_payment_id;