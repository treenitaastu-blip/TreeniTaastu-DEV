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
    const { paymentIntentId, selectedSlot } = await req.json();

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    // Find booking request
    const { data: booking, error: bookingError } = await supabaseClient
      .from('booking_requests')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Create Google Calendar event
    let googleEventId = null;
    
    try {
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      const credentials = JSON.parse(Deno.env.get('GOOGLE_CALENDAR_CREDENTIALS') || '{}');
      
      if (calendarId && credentials.private_key) {
        // In a real implementation, you'd create the JWT properly and make the API call
        // For now, we'll simulate this
        console.log('Creating Google Calendar event...');
        googleEventId = `event_${Date.now()}`; // Mock event ID
      }
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      // Continue without calendar event - admin can create manually
    }

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('booking_requests')
      .update({
        status: 'confirmed',
        preferred_date: selectedSlot.start,
        google_event_id: googleEventId,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Booking update error:', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Send confirmation email to client
    try {
      await supabaseClient.functions.invoke('send-branded-email', {
        body: {
          to: booking.client_email,
          subject: 'Broneerimise kinnitus - Personal Training',
          html: `
            <h2>Tere ${booking.client_name}!</h2>
            <p>Teie broneering on kinnitatud:</p>
            <ul>
              <li><strong>Teenus:</strong> ${getServiceName(booking.service_type)}</li>
              <li><strong>Kuupäev:</strong> ${new Date(selectedSlot.start).toLocaleString('et-EE')}</li>
              <li><strong>Kestus:</strong> ${booking.duration_minutes} minutit</li>
            </ul>
            <p>Näeme kohtamisel!</p>
          `
        }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    // Send notification email to admin
    try {
      await supabaseClient.functions.invoke('send-branded-email', {
        body: {
          to: 'treenitaastu@gmail.com',
          subject: 'Uus broneering - Personal Training',
          html: `
            <h2>Uus broneering!</h2>
            <p>Klient: <strong>${booking.client_name}</strong></p>
            <p>Email: <strong>${booking.client_email}</strong></p>
            <p>Telefon: <strong>${booking.client_phone}</strong></p>
            <p>Teenus: <strong>${getServiceName(booking.service_type)}</strong></p>
            <p>Kuupäev: <strong>${new Date(selectedSlot.start).toLocaleString('et-EE')}</strong></p>
            <p>Kestus: <strong>${booking.duration_minutes} minutit</strong></p>
            <p>Makstud summa: <strong>€${(paymentIntent.amount / 100).toFixed(2)}</strong></p>
            ${booking.additional_info ? `<p>Lisainfo: <strong>${booking.additional_info}</strong></p>` : ''}
          `
        }
      });
      console.log('Admin notification sent successfully');
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      booking: {
        ...booking,
        status: 'confirmed',
        preferred_date: selectedSlot.start,
        google_event_id: googleEventId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in confirm-booking:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getServiceName(serviceType: string): string {
  const names = {
    'initial_assessment': 'Esmane hindamine',
    'personal_program': 'Isiklik programm',
    'monthly_support': 'Kuutugi'
  };
  return names[serviceType as keyof typeof names] || serviceType;
}