import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Kept as a safe informational component for possible future admin onboarding.
// It intentionally contains no role-changing or diagnostic RPC calls.
export function AdminAccessHelper() {
  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Shield className="h-8 w-8 mx-auto text-primary" />
          <CardTitle>Administraatori ligipääs</CardTitle>
          <CardDescription>
            Administraatori õigusi hallatakse ainult turvaliselt andmebaasi rollide kaudu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/admin">Mine admini vaatesse</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
