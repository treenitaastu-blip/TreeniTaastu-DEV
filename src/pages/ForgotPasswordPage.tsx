import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { emailSchema, validateAndSanitize } from "@/lib/validations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateAndSanitize(emailSchema, email);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Palun sisesta kehtiv e-post");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        validation.data,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) throw resetError;

      // Always show the same response so the page does not reveal whether an
      // account with this address exists.
      setSuccess(true);
    } catch {
      setError("Taastamislingi saatmine ebaõnnestus. Palun proovi mõne aja pärast uuesti.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-soft">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
            <h1 className="text-xl font-semibold mb-2">Kontrolli oma postkasti</h1>
            <p className="text-muted-foreground mb-6">
              Kui selle e-postiga konto on olemas, saatsime sinna parooli taastamise lingi.
              Kontrolli ka rämpsposti kausta.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Tagasi sisselogimise juurde</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Unustasid parooli?</CardTitle>
          <CardDescription>
            Sisesta oma e-post ja saadame sulle turvalise taastamislingi
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-post</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="sinu@email.ee"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" variant="hero" size="lg" disabled={loading}>
              {loading ? "Saadan taastamislinki..." : "Saada taastamislink"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline font-medium">
              Tagasi sisselogimise juurde
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
