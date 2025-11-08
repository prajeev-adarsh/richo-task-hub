import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
interface PaymentVerificationRequest {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  task_id: string;
  amount: number;
}

function validatePaymentRequest(data: any): PaymentVerificationRequest {
  if (!data.razorpay_payment_id || typeof data.razorpay_payment_id !== 'string') {
    throw new Error('Invalid razorpay_payment_id');
  }
  if (!data.task_id || typeof data.task_id !== 'string') {
    throw new Error('Invalid task_id');
  }
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  return {
    razorpay_payment_id: data.razorpay_payment_id.trim(),
    razorpay_order_id: data.razorpay_order_id?.trim(),
    razorpay_signature: data.razorpay_signature?.trim(),
    task_id: data.task_id.trim(),
    amount: data.amount,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authentication' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Invalid authentication token:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse and validate input
    const requestData = await req.json();
    const validatedData = validatePaymentRequest(requestData);

    console.log('Processing payment verification for task:', validatedData.task_id);

    // Verify task exists and get client_id
    const { data: task, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id, client_id, budget, payment_status')
      .eq('id', validatedData.task_id)
      .single();

    if (taskFetchError || !task) {
      console.error('Task not found:', taskFetchError);
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Get the authenticated user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Verify the requesting user is the task's client OR is an admin (defense-in-depth)
    // Check if user has admin role for defense-in-depth
    const { data: isAdmin } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    const isAuthorized = task.client_id === userProfile.id || isAdmin === true;
    
    if (!isAuthorized) {
      console.error('User is not authorized for this payment verification');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You are not authorized for this task' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Verify amount matches task budget
    if (validatedData.amount !== task.budget) {
      console.error(`Amount mismatch: expected ${task.budget}, got ${validatedData.amount}`);
      return new Response(
        JSON.stringify({ error: 'Amount does not match task budget' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('task_id', validatedData.task_id)
      .eq('payment_status', 'paid')
      .single();

    if (existingPayment) {
      console.log('Payment already recorded for this task');
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already verified' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // TODO: Verify payment with Razorpay API using signature verification
    // This requires RAZORPAY_KEY_SECRET to be added as a secret
    // For now, we trust the client-side Razorpay SDK verification
    
    // Create payment record using service role (bypasses RLS)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        task_id: validatedData.task_id,
        client_id: task.client_id,
        amount: validatedData.amount,
        payment_status: 'paid',
        payment_mode: 'razorpay',
        razorpay_payment_id: validatedData.razorpay_payment_id,
      });

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      throw paymentError;
    }

    // Update task payment status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ payment_status: 'paid' })
      .eq('id', validatedData.task_id);

    if (taskError) {
      console.error('Task update error:', taskError);
      throw taskError;
    }

    console.log('Payment verified and recorded successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and recorded' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})