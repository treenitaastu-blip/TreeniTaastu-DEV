// src/pages/SignupPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { signupSchema, validateAndSanitize } from "@/lib/validations";
import { UserFriendlyAuthError } from "@/components/UserFriendlyAuthError";

export default function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    // Validate input using Zod schema
    const validation = validateAndSanitize(signupSchema, { email, password, fullName });
    
    if (!validation.success) {
      setErr(validation.errors?.join(", ") || "Palun kontrolli sisestatud andmeid");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data!.email,
        password: validation.data!.password,
        options: {
          data: { full_name: validation.data!.fullName || undefined },
          emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
        },
      });
      if (error) throw error;

      // If no email confirmation required and a session is created immediately:
      if (data.session) {
        navigate("/home", { replace: true });
        return;
      }

      // If confirmation IS required (no immediate session):
      setInfo("Konto loodud edukalt! Saatsime sulle kinnituslingi e-postile. Palun kliki linki e-postis ja logi seejärel sisse.");
      
      // Don't redirect immediately - let user see the confirmation message
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 5000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Kontoloomine ebaõnnestus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-md">
          <Card className="border-0 shadow-soft">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Loo konto</CardTitle>
              <CardDescription>Alusta oma treeninguteekonda</CardDescription>
            </CardHeader>
            <CardContent>
              {err && (
                <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    <UserFriendlyAuthError error={err} />
                  </AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900">{info}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nimi (soovi korral)</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ees- ja perekonnanimi"
                    value={fullName}
                    onChange={(ev) => setFullName(ev.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sinu@email.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parool</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Loo tugev parool"
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      required
                      autoComplete="new-password"
                      className="pr-10"
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

                <Button type="submit" className="w-full" variant="hero" size="lg" disabled={loading}>
                  {loading ? "Loon kontot..." : "Loo konto"}
                </Button>
              </form>

              <div className="mt-4 text-sm text-center">
                <span className="text-muted-foreground">Juba konto olemas? </span>
                <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                  Logi sisse
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
