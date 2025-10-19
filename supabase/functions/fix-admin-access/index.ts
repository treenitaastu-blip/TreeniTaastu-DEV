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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Applying admin access policies...");

    // SQL statements to fix admin access
    const sqlStatements = [
      // Add policy for admins to view all profiles
      `DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
       CREATE POLICY "Admins can view all profiles"
       ON public.profiles
       FOR SELECT
       TO authenticated
       USING (public.is_admin_secure(auth.uid()));`,

      // Add policy for admins to view all subscribers
      `DROP POLICY IF EXISTS "Admins can view all subscribers" ON public.subscribers;
       CREATE POLICY "Admins can view all subscribers"
       ON public.subscribers
       FOR SELECT
       TO authenticated
       USING (public.is_admin_secure(auth.uid()));`,

      // Add policy for admins to manage subscribers
      `DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.subscribers;
       CREATE POLICY "Admins can manage subscribers"
       ON public.subscribers
       FOR ALL
       TO authenticated
       USING (public.is_admin_secure(auth.uid()))
       WITH CHECK (public.is_admin_secure(auth.uid()));`,

      // Add policy for admins to view all user roles
      `DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
       CREATE POLICY "Admins can view all user roles"
       ON public.user_roles
       FOR SELECT
       TO authenticated
       USING (public.is_admin_secure(auth.uid()));`,

      // Add policy for admins to manage user roles
      `DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
       CREATE POLICY "Admins can manage user roles"
       ON public.user_roles
       FOR ALL
       TO authenticated
       USING (public.is_admin_secure(auth.uid()))
       WITH CHECK (public.is_admin_secure(auth.uid()));`
    ];

    const results = [];
    for (const sql of sqlStatements) {
      try {
        const { data, error } = await supabase.rpc('exec', { sql });
        if (error) {
          console.error("SQL execution error:", error);
          results.push({ sql: sql.substring(0, 50) + "...", error: error.message });
        } else {
          console.log("SQL executed successfully");
          results.push({ sql: sql.substring(0, 50) + "...", success: true });
        }
      } catch (err) {
        console.error("Exception executing SQL:", err);
        results.push({ sql: sql.substring(0, 50) + "...", error: err.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin access policies applied",
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in fix-admin-access function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
