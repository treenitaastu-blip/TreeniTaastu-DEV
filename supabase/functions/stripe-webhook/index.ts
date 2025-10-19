import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ' - ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Get the raw body
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Webhook verified", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event, supabaseClient);
        break;
      
      case "invoice.payment_failed":
        await handlePaymentFailed(event, supabaseClient);
        break;
      
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event, supabaseClient);
        break;
      
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event, supabaseClient);
        break;
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handlePaymentSucceeded(event: Stripe.Event, supabaseClient: any) {
  const invoice = event.data.object as Stripe.Invoice;
  logStep("Processing payment succeeded", { 
    invoiceId: invoice.id, 
    customerId: invoice.customer,
    amount: invoice.amount_paid 
  });

  // Find the user by Stripe customer ID
  const { data: subscriber, error: subError } = await supabaseClient
    .from('subscribers')
    .select('user_id, email')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (subError || !subscriber) {
    logStep("No subscriber found for customer", { customerId: invoice.customer });
    return;
  }

  // Add payment record
  await supabaseClient
    .from('payments')
    .insert({
      user_id: subscriber.user_id,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid'
    });

  // Update subscription status
  await supabaseClient
    .from('subscribers')
    .update({
      status: 'active',
      subscribed: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  // Update user entitlements
  await supabaseClient
    .from('user_entitlements')
    .update({
      status: 'active',
      paused: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  logStep("Payment processed successfully", { userId: subscriber.user_id });
}

async function handlePaymentFailed(event: Stripe.Event, supabaseClient: any) {
  const invoice = event.data.object as Stripe.Invoice;
  logStep("Processing payment failed", { 
    invoiceId: invoice.id, 
    customerId: invoice.customer 
  });

  // Find the user by Stripe customer ID
  const { data: subscriber, error: subError } = await supabaseClient
    .from('subscribers')
    .select('user_id, email')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (subError || !subscriber) {
    logStep("No subscriber found for customer", { customerId: invoice.customer });
    return;
  }

  // Update subscription status to indicate payment failure
  await supabaseClient
    .from('subscribers')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  logStep("Payment failure processed", { userId: subscriber.user_id });
}

async function handleSubscriptionUpdated(event: Stripe.Event, supabaseClient: any) {
  const subscription = event.data.object as Stripe.Subscription;
  logStep("Processing subscription updated", { 
    subscriptionId: subscription.id, 
    customerId: subscription.customer,
    status: subscription.status 
  });

  // Find the user by Stripe customer ID
  const { data: subscriber, error: subError } = await supabaseClient
    .from('subscribers')
    .select('user_id, email')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (subError || !subscriber) {
    logStep("No subscriber found for customer", { customerId: subscription.customer });
    return;
  }

  // Update subscription status based on Stripe status
  const status = subscription.status === 'active' ? 'active' : 'inactive';
  const subscribed = subscription.status === 'active';

  await supabaseClient
    .from('subscribers')
    .update({
      status: status,
      subscribed: subscribed,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  // Update user entitlements
  await supabaseClient
    .from('user_entitlements')
    .update({
      status: status,
      paused: !subscribed,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  logStep("Subscription updated", { userId: subscriber.user_id, status });
}

async function handleSubscriptionDeleted(event: Stripe.Event, supabaseClient: any) {
  const subscription = event.data.object as Stripe.Subscription;
  logStep("Processing subscription deleted", { 
    subscriptionId: subscription.id, 
    customerId: subscription.customer 
  });

  // Find the user by Stripe customer ID
  const { data: subscriber, error: subError } = await supabaseClient
    .from('subscribers')
    .select('user_id, email')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (subError || !subscriber) {
    logStep("No subscriber found for customer", { customerId: subscription.customer });
    return;
  }

  // Update subscription status to cancelled
  await supabaseClient
    .from('subscribers')
    .update({
      status: 'cancelled',
      subscribed: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  // Update user entitlements to inactive
  await supabaseClient
    .from('user_entitlements')
    .update({
      status: 'inactive',
      paused: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscriber.user_id);

  logStep("Subscription cancelled", { userId: subscriber.user_id });
}
