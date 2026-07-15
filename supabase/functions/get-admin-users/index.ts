import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const allowedOrigins = new Set([
  "https://treenitaastu.app",
  "https://www.treenitaastu.ee",
  "https://treenitaastu.ee",
  "http://localhost:5173",
]);

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://treenitaastu.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
};

const jsonResponse = (req: Request, body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const authorization = req.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse(req, { error: "Authentication required" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server configuration is missing");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(req, { error: "Invalid session" }, 401);
    }

    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!adminRole) {
      return jsonResponse(req, { error: "Admin access required" }, 403);
    }

    const [authUsersResult, profilesResult, subscribersResult, userRolesResult] = await Promise.all([
      adminClient.auth.admin.listUsers(),
      adminClient.from("profiles").select("id, email, full_name, role, created_at"),
      adminClient.from("subscribers").select("user_id, status, plan, trial_ends_at, expires_at"),
      adminClient.from("user_roles").select("user_id, role"),
    ]);

    if (authUsersResult.error) throw authUsersResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (subscribersResult.error) throw subscribersResult.error;
    if (userRolesResult.error) throw userRolesResult.error;

    const profiles = profilesResult.data ?? [];
    const subscribers = subscribersResult.data ?? [];
    const userRoles = userRolesResult.data ?? [];
    const users = authUsersResult.data.users.map((authUser) => {
      const profile = profiles.find((item) => item.id === authUser.id);
      const subscriber = subscribers.find((item) => item.user_id === authUser.id);

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name ?? null,
        created_at: authUser.created_at,
        is_paid: subscriber?.status === "active",
        trial_ends_at: subscriber?.trial_ends_at ?? null,
        current_period_end: subscriber?.expires_at ?? null,
        subscriber_status: subscriber?.status ?? null,
        subscriber_plan: subscriber?.plan ?? null,
        roles: userRoles.filter((role) => role.user_id === authUser.id).map((role) => role.role),
      };
    });

    return jsonResponse(req, { success: true, users, total: users.length }, 200);
  } catch (error) {
    console.error("get-admin-users failed");
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      500,
    );
  }
});
