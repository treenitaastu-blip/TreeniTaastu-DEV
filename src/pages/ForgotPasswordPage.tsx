import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { emailSchema, validateAndSanitize } from "@/lib/validations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate email
    const validation = validateAndSanitize(emailSchema, email);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Palun sisesta kehtiv e-mail");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call our auto password reset function
      const { data, error: functionError } = await supabase.functions.invoke('auto-password-reset', {
        body: { email: validation.data }
      });

      if (functionError) throw functionError;
      
      if (data.emailSent) {
        setSuccess(true);
      } else if (data.newPassword) {
        // Show the new password directly
        alert(`Uus parool genereeritud! Sinu uus parool on: ${data.newPassword}\n\nKopeeri see hoolikalt ja logi sisse.`);
        setSuccess(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Parooli lähtestamine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-soft">
          <CardContent className="p-6 text-center">
            <div className="text-success mb-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Uus parool saadetud!</h2>
            <p className="text-muted-foreground mb-4">
              Kui see e-mail on meie süsteemis olemas, saatsime sellele uue parooli. 
              Kontrolli oma postkasti (ka rämpsposti kausta).
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Soovitame kohe pärast sisselogimist parooli oma konto seadetes muuta.
            </p>
            <Link to="/login">
              <Button className="w-full">
                Tagasi sisselogimise juurde
              </Button>
            </Link>
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
            Sisesta oma e-mail ja saadame sulle uue parooli
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
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="sinu@email.ee"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="hero" 
              size="lg" 
              disabled={loading}
            >
              {loading ? "Saadan uut parooli..." : "Saada uus parool"}
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