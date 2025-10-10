import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for email and password
    const { email, password } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    console.log(`[START-PT-TRIAL] Creating trial account for: ${email}`);

    // Create Supabase client with service role for user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email for trial users
    });

    if (authError) {
      console.error(`[START-PT-TRIAL] Auth error:`, authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    console.log(`[START-PT-TRIAL] User created successfully: ${authData.user.id}`);

    // Start 7-day trial using the database function (note: function name still references 3d for backward compatibility)
    const { data: trialData, error: trialError } = await supabaseAdmin.rpc('start_pt_trial_3d', {
      u: authData.user.id
    });

    if (trialError) {
      console.error(`[START-PT-TRIAL] Trial creation error:`, trialError);
      throw trialError;
    }

    console.log(`[START-PT-TRIAL] Trial started successfully:`, trialData);

    return new Response(JSON.stringify({
      success: true,
      message: "7-day trial started successfully",
      user_id: authData.user.id,
      trial_info: trialData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[START-PT-TRIAL] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});