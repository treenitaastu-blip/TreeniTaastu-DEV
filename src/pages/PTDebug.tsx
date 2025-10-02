// Debug page for Personal Training system
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PTDebug() {
  const { user } = useAuth();
  const access = useAccess();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDebugInfo = async () => {
      if (!user) return;
      
      try {
        // Get user's programs
        const { data: programs } = await supabase
          .from("client_programs")
          .select(`
            id, 
            title_override, 
            assigned_to, 
            assigned_by, 
            is_active, 
            status,
            client_days(
              id, 
              title, 
              day_order,
              client_items(id, exercise_name)
            )
          `)
          .eq("assigned_to", user.id);

        // Get user's entitlements
        const { data: entitlements } = await supabase
          .from("user_entitlements")
          .select("*")
          .eq("user_id", user.id);

        // Get access matrix
        const { data: accessMatrix } = await supabase
          .from("v_access_matrix")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setDebugData({
          user,
          access,
          programs,
          entitlements,
          accessMatrix,
          profile
        });
      } catch (error) {
        console.error("Debug load error:", error);
        setDebugData({ error: (error as Error).message || String(error) });
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [user, access]);

  if (loading) {
    return <div className="p-6">Loading debug info...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">PT System Debug</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Access Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Loading: <Badge variant={access.loading ? "destructive" : "default"}>{access.loading.toString()}</Badge></div>
            <div>Admin: <Badge variant={access.isAdmin ? "default" : "secondary"}>{access.isAdmin.toString()}</Badge></div>
            <div>Can PT: <Badge variant={access.canPT ? "default" : "secondary"}>{access.canPT.toString()}</Badge></div>
            <div>Can Static: <Badge variant={access.canStatic ? "default" : "secondary"}>{access.canStatic.toString()}</Badge></div>
            <div>Reason: {access.reason}</div>
            {access.error && <div className="text-red-500">Error: {access.error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programs ({debugData?.programs?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {debugData?.programs?.map((p: any) => (
              <div key={p.id} className="border-b pb-2 mb-2">
                <div className="font-semibold">{p.title_override || "Untitled"}</div>
                <div className="text-sm text-muted-foreground">
                  Status: {p.status} | Active: {p.is_active?.toString()} | Days: {p.client_days?.length || 0}
                </div>
                {p.client_days?.map((d: any) => (
                  <div key={d.id} className="ml-4 text-xs">
                    Day {d.day_order}: {d.title} ({d.client_items?.length || 0} exercises)
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entitlements</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugData?.entitlements, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugData?.accessMatrix, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => window.location.reload()}>
        Refresh Debug Data
      </Button>
    </div>
  );
}