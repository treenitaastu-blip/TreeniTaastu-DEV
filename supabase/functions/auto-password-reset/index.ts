import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

serve((req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  return new Response(
    JSON.stringify({ error: "This endpoint has been disabled." }),
    { status: 410, headers: { ...headers, "Content-Type": "application/json" } },
  );
});
