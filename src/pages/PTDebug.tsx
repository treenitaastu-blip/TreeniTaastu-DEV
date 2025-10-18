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
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>PT Debug - Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Loading debug information...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PT System Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">User Information</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.user, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Access Information</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.access, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Programs ({debugData?.programs?.length || 0})</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.programs, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Entitlements ({debugData?.entitlements?.length || 0})</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.entitlements, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Access Matrix</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.accessMatrix, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Profile</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugData?.profile, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
