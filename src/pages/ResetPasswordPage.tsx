import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearPasswordRecoveryProof,
  hasPasswordRecoveryProof,
  storePasswordRecoveryProof,
  supabase,
} from "@/integrations/supabase/client";
import { passwordSchema, validateAndSanitize } from "@/lib/validations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, KeyRound } from "lucide-react";

type RecoveryStatus = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const acceptRecoverySession = (accessToken?: string | null) => {
      if (!active || !hasPasswordRecoveryProof(accessToken)) return false;
      window.history.replaceState({}, document.title, "/reset-password");
      setStatus("ready");
      return true;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        acceptRecoverySession(session?.access_token);
      }
    });

    const initializeRecovery = async () => {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type");

      if (tokenHash && type === "recovery") {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (!verifyError && data.session?.access_token) {
          // verifyOtp is itself the recovery proof for token-hash links.
          storePasswordRecoveryProof(data.session.access_token);
          if (acceptRecoverySession(data.session.access_token)) return;
        }
      } else if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError && data.session?.access_token) {
          const redirectType = (data as typeof data & { redirectType?: string | null }).redirectType;
          if (redirectType === "recovery") {
            storePasswordRecoveryProof(data.session.access_token);
          }
          if (acceptRecoverySession(data.session.access_token)) return;
        }
      }

      // Implicit-flow links are processed by the shared Supabase client before
      // this page renders. Only accept the resulting session when its token
      // matches the short-lived recovery proof captured by the client module.
      const { data } = await supabase.auth.getSession();
      if (acceptRecoverySession(data.session?.access_token)) return;

      if (active) setStatus("invalid");
    };

    void initializeRecovery();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Paroolid ei kattu");
      return;
    }

    const validation = validateAndSanitize(passwordSchema, password);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Parool ei vasta nõuetele");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!hasPasswordRecoveryProof(sessionData.session?.access_token)) {
      setStatus("invalid");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: validation.data,
      });
      if (updateError) throw updateError;

      clearPasswordRecoveryProof();
      await supabase.auth.signOut({ scope: "global" });
      setStatus("success");
    } catch {
      setError("Parooli muutmine ebaõnnestus. Taasta link uuesti või proovi mõne aja pärast.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-muted-foreground">
        Kontrollin taastamislinki…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-soft">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold mb-2">Taastamislink ei kehti</h1>
            <p className="text-muted-foreground mb-6">
              Link on aegunud, juba kasutatud või vigane. Küsi uus taastamislink.
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Küsi uus link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-soft">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
            <h1 className="text-xl font-semibold mb-2">Parool on muudetud</h1>
            <p className="text-muted-foreground mb-6">Kõik varasemad sisselogimisseansid on lõpetatud.</p>
            <Button asChild className="w-full">
              <Link to="/login">Logi uue parooliga sisse</Link>
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
          <KeyRound className="w-12 h-12 mx-auto mb-2 text-primary" />
          <CardTitle className="text-2xl">Määra uus parool</CardTitle>
          <CardDescription>Kasuta vähemalt 8 märki, suurtähte, väiketähte ja numbrit.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Uus parool</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Korda uut parooli</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" variant="hero" size="lg" disabled={loading}>
              {loading ? "Muudan parooli..." : "Muuda parool"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
