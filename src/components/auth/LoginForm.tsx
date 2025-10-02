// src/components/auth/LoginForm.tsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginSchema, validateAndSanitize } from "@/lib/validations";

type LoginFormProps = {
  heading?: string;
  description?: string;
  /** Where to send the user after successful login (default: "/home") */
  redirectTo?: string;
  borderless?: boolean;
};

type LocationState = {
  from?: { pathname?: string };
};

export default function LoginForm({
  heading = "Logi sisse",
  description = "Jätka oma treeningprogrammiga",
  redirectTo = "/home",
  borderless = false,
}: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState };
  const fromPath =
    location.state?.from?.pathname && location.state.from.pathname !== "/login"
      ? location.state.from.pathname
      : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const navigateAfterAuth = () => {
    const dest = fromPath || redirectTo;
    navigate(dest, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    
    // Validate input using Zod schema
    const validation = validateAndSanitize(loginSchema, { email, password });
    
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Palun kontrolli sisestatud andmeid");
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;
      navigateAfterAuth();
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Sisselogimine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      // Build an absolute redirect URL from the prop (defaults to /home)
      const oauthRedirect = new URL(redirectTo, window.location.origin).toString();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirect,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Google sisselogimine ebaõnnestus");
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError("Sisesta e-post parooli lähtestamiseks.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      // Use our custom email function instead of Supabase's default
      const { error } = await supabase.functions.invoke('auto-password-reset', {
        body: { email }
      });
      if (error) throw error;
      setInfo("Saatsime uue parooli sinu e-postile. Kontrolli postkasti (ka rämpsposti).");
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Parooli lähtestamine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  };

  const toggleResetMode = () => {
    setIsResetMode(!isResetMode);
    setError(null);
    setInfo(null);
  };

  return (
    <Card className={`${borderless ? "border-0 shadow-none" : "border-0 shadow-soft"} w-full max-w-xl`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
          <LogIn className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl">{isResetMode ? "Taasta parool" : heading}</CardTitle>
        <CardDescription>{isResetMode ? "Sisesta oma e-post ja saadame sulle uue parooli" : description}</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900">{info}</AlertDescription>
          </Alert>
        )}

        {!isResetMode && (
          <>
            {/* Google login */}
            <Button onClick={handleGoogleLogin} className="w-full mb-6" variant="hero" size="lg" disabled={loading}>
              Jätka Google'iga
            </Button>
          </>
        )}

        {/* Email form */}
        <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              placeholder="sinu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="transition-all duration-300 focus:shadow-soft"
              autoComplete="email"
            />
          </div>

          {!isResetMode && (
            <div className="space-y-2">
              <Label htmlFor="password">Parool</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sinu parool"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 transition-all duration-300 focus:shadow-soft"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Peida parool" : "Näita parooli"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" variant="hero" size="lg" disabled={loading}>
            {isResetMode 
              ? (loading ? "Saadan uut parooli..." : "Saada uus parool") 
              : (loading ? "Logime sisse..." : "Logi sisse")
            }
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
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
              <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Loo konto
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}