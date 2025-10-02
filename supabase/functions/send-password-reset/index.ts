import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    console.log("Password reset request for:", email);

    // Create Supabase client for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the origin from the request or default to production
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://treenitaastu.app';
    
    // Generate password reset link using Supabase admin
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/reset-password`
      }
    });

    if (error) {
      console.error("Error generating reset link:", error);
      throw error;
    }

    if (!data.properties?.action_link) {
      throw new Error("Failed to generate reset link");
    }

    console.log("Generated reset link for:", email);

    // Send custom email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Treenitaastu <noreply@treenitaastu.app>",
        to: [email],
        subject: "Parooli lähtestamine - Treenitaastu",
        html: createPasswordResetEmail({
          resetUrl: data.properties.action_link,
          email: email
        }),
        text: `Parooli lähtestamine: ${data.properties.action_link}`,
      }),
    });

    const emailResponse = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || 'Failed to send email');
    }

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function createPasswordResetEmail(data: { resetUrl: string; email: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Parooli lähtestamine</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Parooli lähtestamine</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Tere!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Saime taotluse oma Treenitaastu konto parooli lähtestamiseks kontole <strong>${data.email}</strong>.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Kliki allolevale nupule, et oma parool lähtestada:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    display: inline-block;
                    font-size: 16px;">
            Lähtesta parool
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          See link kehtib 24 tundi. Kui sa ei taotlenud parooli lähtestamist, võid selle kirja ignoreerida.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Kui nupp ei tööta, kopeeri ja kleebi see link oma brauserisse:<br>
          <a href="${data.resetUrl}" style="color: #667eea; word-break: break-all;">${data.resetUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          Tervitustega,<br>
          <strong>Treenitaastu meeskond</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);