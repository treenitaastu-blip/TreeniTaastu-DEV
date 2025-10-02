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
  console.warn(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { priceId } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request data received", { priceId });

    // Try to get authenticated user (optional)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    let userEmail = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (!userError && userData.user?.email) {
        user = userData.user;
        userEmail = user.email;
        logStep("User authenticated", { userId: user.id, email: userEmail });
      }
    }
    
    if (!user) {
      logStep("No authenticated user - proceeding with guest checkout");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if Stripe customer exists (only if we have user email)
    let customerId;
    if (userEmail) {
      const customers = await stripe.customers.list({ 
        email: userEmail, 
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Create checkout session with proper mode based on price
    const sessionData: any = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        price_id: priceId
      }
    };

    // Add customer info if available, otherwise Stripe will collect email
    if (customerId) {
      sessionData.customer = customerId;
    } else if (userEmail) {
      sessionData.customer_email = userEmail;
    } else {
      // For guests: subscription mode needs different handling than payment mode
      if (priceId === "price_1SBCokCirvfSO0IROfFuh6AK") {
        // Monthly subscription - can't use customer_creation, Stripe will collect email
        sessionData.payment_method_collection = 'always';
      } else {
        // Payment mode can use customer_creation
        sessionData.customer_creation = 'always';
      }
    }

    // Add user_id to metadata if available
    if (user) {
      sessionData.metadata.user_id = user.id;
    }

    // Determine mode based on price type
    if (priceId === "price_1SBCokCirvfSO0IROfFuh6AK") {
      // Monthly recurring subscription
      sessionData.mode = "subscription";
    } else if (priceId === "price_1SBJMJCirvfSO0IRAHXrGSzn") {
      // Yearly one-time payment
      sessionData.mode = "payment";
    } else {
      // Default to payment mode for other products
      sessionData.mode = "payment";
    }

    logStep("Creating checkout session", { mode: sessionData.mode });

    const session = await stripe.checkout.sessions.create(sessionData);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});