import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.json();
    
    // Handle different types of email requests
    let subject = "";
    let html = "";
    let to = "";
    
    if (body.user && body.email_data) {
      // Auth emails (signup, recovery, etc.)
      const { user, email_data } = body;
      if (!user?.email || !email_data) {
        throw new Error('Missing required auth data');
      }

      const { token_hash, email_action_type, redirect_to } = email_data;
      const siteUrl = Deno.env.get('SUPABASE_URL') || 'https://your-site.com';
      to = user.email;

      if (email_action_type === "signup") {
        subject = "Tere tulemast Treenitaastu'sse! Kinnita oma konto";
        html = createSignupEmail(siteUrl, token_hash, email_action_type, redirect_to);
      } else if (email_action_type === "recovery") {
        subject = "Lähtesta oma Treenitaastu parool";
        html = createRecoveryEmail(siteUrl, token_hash, email_action_type, redirect_to);
      } else {
        subject = "Treenitaastu kinnitus";
        html = createGenericEmail(siteUrl, token_hash, email_action_type, redirect_to);
      }
    } else if (body.to && body.subject && body.html) {
      // Generic emails (booking notifications, etc.)
      to = body.to;
      subject = body.subject;
      html = body.html;
    } else {
      throw new Error('Invalid email request format');
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Treenitaastu <noreply@treenitaastu.ee>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse.data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      id: emailResponse.data?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in send-branded-email:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function createSignupEmail(siteUrl: string, tokenHash: string, actionType: string, redirectTo: string): string {
  const verificationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${actionType}&redirect_to=${redirectTo}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kinnita oma konto</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; line-height: 60px; font-size: 24px; font-weight: bold;">
            T
          </div>
          <h1 style="color: #1a202c; margin: 20px 0 10px; font-size: 28px;">Treenitaastu</h1>
          <p style="color: #718096; margin: 0; font-size: 16px;">Alusta oma treeninguteekonda</p>
        </div>
        
        <div style="background: #f7fafc; border-radius: 12px; padding: 30px; margin: 30px 0;">
          <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px;">Tere tulemast!</h2>
          <p style="color: #4a5568; margin: 0 0 20px; font-size: 16px;">
            Täname, et liitusid Treenitaastu'ga! Enne kui saad alustada oma treeninguteekonda, pead kinnitama oma e-posti aadressi.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
              Kinnita oma konto
            </a>
          </div>
          
          <p style="color: #718096; font-size: 14px; margin: 20px 0 0;">
            Kui nupp ei tööta, kopeeri ja kleebi see link oma brauserisse:<br>
            <span style="word-break: break-all; color: #4299e1;">${verificationUrl}</span>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 30px; text-align: center;">
          <p style="color: #718096; font-size: 14px; margin: 0;">
            Kui sa seda kontot ei loonud, võid selle e-kirja lihtsalt ignoreerida.
          </p>
          <p style="color: #a0aec0; font-size: 12px; margin: 20px 0 0;">
            © 2024 Treenitaastu. Kõik õigused kaitstud.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createRecoveryEmail(siteUrl: string, tokenHash: string, actionType: string, redirectTo: string): string {
  const verificationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${actionType}&redirect_to=${redirectTo}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lähtesta parool</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; line-height: 60px; font-size: 24px; font-weight: bold;">
            T
          </div>
          <h1 style="color: #1a202c; margin: 20px 0 10px; font-size: 28px;">Treenitaastu</h1>
          <p style="color: #718096; margin: 0; font-size: 16px;">Parooli lähtestamine</p>
        </div>
        
        <div style="background: #f7fafc; border-radius: 12px; padding: 30px; margin: 30px 0;">
          <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px;">Lähtesta oma parool</h2>
          <p style="color: #4a5568; margin: 0 0 20px; font-size: 16px;">
            Saime taotluse oma parooli lähtestamiseks. Kliki alloleval nupul, et seada uus parool.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
              Lähtesta parool
            </a>
          </div>
          
          <p style="color: #718096; font-size: 14px; margin: 20px 0 0;">
            Kui nupp ei tööta, kopeeri ja kleebi see link oma brauserisse:<br>
            <span style="word-break: break-all; color: #4299e1;">${verificationUrl}</span>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 30px; text-align: center;">
          <p style="color: #718096; font-size: 14px; margin: 0;">
            Kui sa seda taotlust ei teinud, võid selle e-kirja lihtsalt ignoreerida.
          </p>
          <p style="color: #a0aec0; font-size: 12px; margin: 20px 0 0;">
            © 2024 Treenitaastu. Kõik õigused kaitstud.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createGenericEmail(siteUrl: string, tokenHash: string, actionType: string, redirectTo: string): string {
  const verificationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${actionType}&redirect_to=${redirectTo}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kinnitus</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; line-height: 60px; font-size: 24px; font-weight: bold;">
            T
          </div>
          <h1 style="color: #1a202c; margin: 20px 0 10px; font-size: 28px;">Treenitaastu</h1>
        </div>
        
        <div style="background: #f7fafc; border-radius: 12px; padding: 30px; margin: 30px 0;">
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
              Kinnita
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 30px; text-align: center;">
          <p style="color: #a0aec0; font-size: 12px; margin: 20px 0 0;">
            © 2024 Treenitaastu. Kõik õigused kaitstud.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}