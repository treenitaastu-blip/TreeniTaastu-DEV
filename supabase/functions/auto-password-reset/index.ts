import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoPasswordResetRequest {
  email: string;
}

// Generate a secure random password
function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly (total 12 characters)
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: AutoPasswordResetRequest = await req.json();

    console.log("Auto password reset request for:", email);

    // Create Supabase client for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists by trying to generate a recovery link
    // This is a safer approach that doesn't reveal if user exists
    let userExists = false;
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });
      userExists = !linkError && !!linkData;
    } catch {
      userExists = false;
    }

    if (!userExists) {
      // Don't reveal if user exists or not for security - still return success
      console.log("User not found for email:", email);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user to update password
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("User not found in list for email:", email);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate new secure password
    const newPassword = generateSecurePassword();

    // Update user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw updateError;
    }

    console.log("Password updated successfully for:", email);

    let emailSent = false;
    let emailError = null;

    // Try to send new password via email
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.warn("RESEND_API_KEY not found, skipping email send");
        emailError = "Email service not configured";
      } else {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Treenitaastu <noreply@treenitaastu.ee>",
            to: [email],
            subject: "Uus parool - Treenitaastu",
            html: createNewPasswordEmail({
              email: email,
              newPassword: newPassword
            }),
            text: `Sinu uus Treenitaastu parool: ${newPassword}`,
          }),
        });

        const emailResponse = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error("Resend API error:", emailResponse);
          emailError = emailResponse.message || 'Failed to send email';
        } else {
          console.log("New password email sent successfully:", emailResponse);
          emailSent = true;
        }
      }
    } catch (emailErr) {
      console.error("Email sending failed, but password was updated:", emailErr);
      emailError = emailErr.message || "Email service error";
    }

    // For development/testing: return the new password in response
    const responseData: any = { 
      success: true,
      emailSent: emailSent,
      message: emailSent ? "New password sent to email" : "Password updated but email not sent"
    };

    // Include password in response for development (remove in production)
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development" || 
                         Deno.env.get("SUPABASE_URL")?.includes("dtxbrnrpzepwoxooqwlj");
    
    if (isDevelopment) {
      responseData.newPassword = newPassword;
      responseData.emailError = emailError;
      console.log("Development mode: returning new password in response");
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in auto-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function createNewPasswordEmail(data: { email: string; newPassword: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Uus parool - Treenitaastu</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Uus parool</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Tere!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Sinu Treenitaastu konto parool on edukalt lähtestatud kontole <strong>${data.email}</strong>.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Sinu <strong>uus parool</strong> on:
        </p>
        
        <div style="background: #e8f5e8; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #2E7D32; margin: 0; letter-spacing: 1px;">
            ${data.newPassword}
          </p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Palun kopeeri see parool hoolikalt ja kasuta seda oma järgmisel sisselogimisel.
        </p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="font-size: 14px; color: #856404; margin: 0;">
            <strong>Turvalisuse huvides soovitame teil:</strong><br>
            • Logida kohe sisse ja muuta see parool kontoseadetes<br>
            • Mitte jagada seda parooli teistega<br>
            • Kasutada tugevat, unikaalset parooli
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://treenitaastu.app/login" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    display: inline-block;
                    font-size: 16px;">
            Logi sisse
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Kui sa ei taotlenud parooli lähtestamist, palun võta meiega kohe ühendust.
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