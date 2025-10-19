import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.warn(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Initialize Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // First try to find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found Stripe customer by email", { customerId });
    } else {
      // If no customer found by email, check if we have a stored customer ID
      const { data: subscriberData } = await supabaseClient
        .from('subscribers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();
        
      if (subscriberData?.stripe_customer_id) {
        // Verify the customer exists in Stripe
        try {
          const customer = await stripe.customers.retrieve(subscriberData.stripe_customer_id);
          if (customer && !customer.deleted) {
            customerId = subscriberData.stripe_customer_id;
            logStep("Found Stripe customer by stored ID", { customerId });
          }
        } catch (error) {
          logStep("Stored customer ID not found in Stripe", { customerId: subscriberData.stripe_customer_id });
        }
      }
    }
    
    if (!customerId) {
      // If no customer exists, create one
      logStep("No customer found, creating new customer");
      try {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
        
        // Store the customer ID in our database
        const { error: dbError } = await supabaseClient
          .from('subscribers')
          .upsert({
            user_id: user.id,
            email: user.email,
            stripe_customer_id: customerId,
            subscribed: true,
            status: 'active',
            subscription_tier: 'guided'
          });
          
        if (dbError) {
          logStep("Database update error", { error: dbError.message });
          // Continue anyway, customer was created in Stripe
        }
      } catch (stripeError) {
        logStep("Stripe customer creation error", { error: stripeError.message });
        throw new Error(`Failed to create Stripe customer: ${stripeError.message}`);
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    logStep("Creating portal session", { customerId, origin });
    
    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/konto`,
      });
      logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });
    } catch (portalError) {
      logStep("Portal session creation error", { error: portalError.message });
      throw new Error(`Failed to create portal session: ${portalError.message}`);
    }

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});