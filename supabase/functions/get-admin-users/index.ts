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

    console.log("Fetching all users for admin interface...");

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");
    if (profilesError) throw profilesError;

    // Get all subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from("subscribers")
      .select("*");
    if (subscribersError) throw subscribersError;

    // Get all user roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from("user_roles")
      .select("*");
    if (userRolesError) throw userRolesError;

    // Combine the data
    const users = authUsers.users.map(authUser => {
      const profile = profiles.find(p => p.id === authUser.id);
      const subscriber = subscribers.find(s => s.user_id === authUser.id);
      const roles = userRoles.filter(ur => ur.user_id === authUser.id);

      return {
        id: authUser.id,
        email: authUser.email,
        role: profile?.role || 'user',
        created_at: authUser.created_at,
        is_paid: subscriber?.status === 'active',
        trial_ends_at: subscriber?.trial_ends_at,
        current_period_end: subscriber?.expires_at,
        subscriber_status: subscriber?.status,
        subscriber_plan: subscriber?.plan,
        roles: roles.map(r => r.role)
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      users,
      total: users.length,
      profiles: profiles.length,
      subscribers: subscribers.length,
      userRoles: userRoles.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in get-admin-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
