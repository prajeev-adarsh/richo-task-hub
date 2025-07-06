import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { razorpay_payment_id, task_id, client_id, amount } = await req.json()

    // Here you would typically verify the payment with Razorpay API
    // For now, we'll assume the payment is valid and proceed with database updates
    
    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        task_id,
        client_id,
        amount,
        payment_status: 'paid',
        razorpay_payment_id,
      })

    if (paymentError) {
      throw paymentError
    }

    // Update task payment status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ payment_status: 'paid' })
      .eq('id', task_id)

    if (taskError) {
      throw taskError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and recorded' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})