import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-PAYMENT] ${step}${details ? ' - ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Session ID received", { sessionId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Retrieved checkout session", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      mode: session.mode 
    });

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Verify user matches session metadata
    if (session.metadata?.user_id !== userData.user.id) {
      throw new Error("User ID mismatch");
    }

    const priceId = session.metadata?.price_id;
    logStep("Processing successful payment", { priceId, mode: session.mode });

    // Grant access based on the price/product purchased
    if (priceId === "price_1SBCY0EOy7gy4lEEyRwBvuyw") {
      // Self-Guided Monthly (19.99€) - grant static access only
      await supabaseClient
        .from('user_entitlements')
        .upsert({
          user_id: userData.user.id,
          product: 'static',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: null, // Recurring subscription, managed by Stripe
          paused: false,
          source: 'stripe_self_guided',
          note: `Self-Guided monthly subscription - Session: ${sessionId}`
        }, {
          onConflict: 'user_id,product'
        });

      logStep("Granted Self-Guided (static) access");

    } else if (priceId === "price_1SBCYgEOy7gy4lEEWJWNz8gW") {
      // Guided Monthly (49.99€) - grant both static and PT access
      await supabaseClient
        .from('user_entitlements')
        .upsert({
          user_id: userData.user.id,
          product: 'static',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: null, // Recurring subscription, managed by Stripe
          paused: false,
          source: 'stripe_guided',
          note: `Guided monthly subscription - Session: ${sessionId}`
        }, {
          onConflict: 'user_id,product'
        });

      await supabaseClient
        .from('user_entitlements')
        .upsert({
          user_id: userData.user.id,
          product: 'pt',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: null, // Recurring subscription, managed by Stripe
          paused: false,
          source: 'stripe_guided',
          note: `Guided monthly with PT - Session: ${sessionId}`
        }, {
          onConflict: 'user_id,product'
        });

      logStep("Granted Guided (static + PT) access");

    } else if (priceId === "price_1SBCZeEOy7gy4lEEc3DwQzTu") {
      // Transformation (199€ one-time) - grant both static and PT access for 1 year
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await supabaseClient
        .from('user_entitlements')
        .upsert({
          user_id: userData.user.id,
          product: 'static',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          paused: false,
          source: 'stripe_transformation',
          note: `Transformation package - Session: ${sessionId}`
        }, {
          onConflict: 'user_id,product'
        });

      await supabaseClient
        .from('user_entitlements')
        .upsert({
          user_id: userData.user.id,
          product: 'pt',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          paused: false,
          source: 'stripe_transformation',
          note: `Transformation package with PT - Session: ${sessionId}`
        }, {
          onConflict: 'user_id,product'
        });

      logStep("Granted Transformation (static + PT) access for 1 year", { expiresAt });
    } else {
      // Unknown price ID - log error and fail
      logStep("ERROR: Unknown price ID", { priceId });
      throw new Error(`Unknown price ID: ${priceId}. No entitlements granted.`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment verified and access granted",
      sessionId 
    }), {
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