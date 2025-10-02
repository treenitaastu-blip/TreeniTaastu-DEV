import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      serviceType, 
      preferredDate, 
      clientName, 
      clientEmail, 
      clientPhone, 
      preMeetingInfo 
    } = await req.json();

    // Validate required fields
    if (!serviceType || !clientName || !clientEmail) {
      throw new Error("Missing required fields: serviceType, clientName, or clientEmail");
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(clientEmail)) {
      throw new Error("Invalid email format");
    }

    // Create Supabase client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header for validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (authError || !user?.email) {
      throw new Error("User not authenticated");
    }
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Service pricing and duration map
    const servicePricing = {
      'initial_assessment': { price: 8000, name: 'Esmane hindamine' }, // 80€ in cents
      'personal_program': { price: 15000, name: 'Isiklik programm' },   // 150€ in cents
      'monthly_support': { price: 25000, name: 'Kuutugi' }             // 250€ in cents
    };

    const serviceDurations = {
      'initial_assessment': 30,
      'personal_program': 60, 
      'monthly_support': 45
    };

    const service = servicePricing[serviceType as keyof typeof servicePricing];
    if (!service) {
      throw new Error('Invalid service type');
    }

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: service.price,
      currency: 'eur',
      customer: customerId,
      metadata: {
        serviceType,
        preferredDate,
        clientName,
        clientEmail,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create booking request in database with proper error handling
    console.log(`Creating booking for user ${user.id}, service: ${serviceType}`);
    
    const { data: booking, error } = await supabaseClient
      .from('booking_requests')
      .insert({
        user_id: user.id,
        service_type: serviceType,
        preferred_date: preferredDate,
        client_name: clientName.trim(),
        client_email: clientEmail.trim().toLowerCase(),
        client_phone: clientPhone?.trim() || null,
        pre_meeting_info: preMeetingInfo || {},
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        duration_minutes: (serviceDurations as any)[serviceType] || 60
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("Booking created successfully:", booking.id);

    return new Response(JSON.stringify({ 
      booking,
      clientSecret: paymentIntent.client_secret,
      serviceName: service.name,
      amount: service.price 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-booking:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});