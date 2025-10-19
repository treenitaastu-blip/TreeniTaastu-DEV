// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { UserFriendlyAuthError } from "@/components/UserFriendlyAuthError";

type LocationState = { from?: { pathname?: string } } | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const isExpired = searchParams.get("expired") === "1";
  const isConfirmed = searchParams.get("confirmed") === "true";
  
  // Show success message after email confirmation
  useEffect(() => {
    if (isConfirmed) {
      setInfo("✅ E-post on kinnitatud! Nüüd saad sisse logida.");
    }
  }, [isConfirmed]);

  // Decide where to send the user after successful auth
  const postLoginPath = useMemo(() => {
    const state = (location.state as LocationState) ?? null;
    const fromState =
      state?.from?.pathname && state.from.pathname.startsWith("/")
        ? state.from.pathname
        : null;

    const fromQuery = searchParams.get("next");
    const nextFromQuery =
      fromQuery && fromQuery.startsWith("/") ? fromQuery : null;

    return fromState || nextFromQuery || "/home";
  }, [location.state, searchParams]);

  // If user is already logged in, bounce them to the intended page immediately
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session?.user) {
        navigate(postLoginPath, { replace: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate, postLoginPath]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      navigate(postLoginPath, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Sisselogimine ebaõnnestus";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError("Sisesta e-post parooli lähtestamiseks.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      // Use our custom email function instead of Supabase's default
      const { data, error } = await supabase.functions.invoke('auto-password-reset', {
        body: { email }
      });
      if (error) throw error;
      
      if (data.emailSent) {
        setInfo("Saatsime uue parooli sinu e-postile. Kontrolli postkasti (ka rämpsposti).");
      } else if (data.newPassword) {
        setInfo(`Uus parool genereeritud! Sinu uus parool on: ${data.newPassword} - Kopeeri see hoolikalt ja logi sisse.`);
      } else {
        setInfo("Parool lähtestatud, aga e-kiri ei saadetud. Palun võta ühendust toega.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Parooli lähtestamine ebaõnnestus";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleResetMode = () => {
    setIsResetMode(!isResetMode);
    setError(null);
    setInfo(null);
    setEmail(""); // Clear email when switching modes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">{isResetMode ? "Taasta parool" : "Tere tulemast tagasi"}</CardTitle>
          <CardDescription>
            {isResetMode ? "Sisesta oma e-post ja saadame sulle uue parooli" : "Logi sisse, et jätkata oma treeningprogrammiga"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isExpired && (
            <Alert className="mb-4 border-orange-200 bg-orange-50" role="status">
              <AlertDescription className="text-orange-800">
                Sinu ligipääs on aegunud. Palun logi sisse uuesti.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10" role="alert">
              <AlertDescription className="text-destructive">
                <UserFriendlyAuthError error={error} />
              </AlertDescription>
            </Alert>
          )}

          {info && (
            <Alert className="mb-4 border-blue-200 bg-blue-50" role="status">
              <AlertDescription className="text-blue-900">
                {info}
              </AlertDescription>
            </Alert>
          )}

          {!isResetMode ? (
            <>
              {/* Login form */}
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sinu@email.com"
                    required
                    autoComplete="email"
                    aria-required="true"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parool</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sinu parool"
                      required
                      className="pr-10"
                      autoComplete="current-password"
                      aria-required="true"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Peida parool" : "Näita parooli"}
                      disabled={submitting}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="hero"
                  size="lg"
                  disabled={submitting}
                  aria-disabled={submitting}
                >
                  {submitting ? "Logime sisse..." : "Logi sisse"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Reset password form */}
              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-post</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sinu@email.com"
                    required
                    autoComplete="email"
                    aria-required="true"
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="hero"
                  size="lg"
                  disabled={submitting}
                  aria-disabled={submitting}
                >
                  {submitting ? "Saadan uut parooli..." : "Saada uus parool"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={toggleResetMode}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isResetMode ? "Tagasi sisselogimise juurde" : "Unustasid parooli?"}
            </button>
            {!isResetMode && (
              <div className="text-right">
                <span className="text-muted-foreground">Pole veel kontot? </span>
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Loo konto
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}