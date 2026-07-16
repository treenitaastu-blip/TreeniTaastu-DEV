// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { UserFriendlyAuthError } from "@/components/UserFriendlyAuthError";
import { emailSchema, validateAndSanitize } from "@/lib/validations";
import "@/styles/public-auth.css";

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
    const validation = validateAndSanitize(emailSchema, email);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Palun sisesta kehtiv e-post.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      setInfo("Kui selle e-postiga konto on olemas, saatsime sinna taastamislingi. Kontrolli ka rämpsposti.");
    } catch {
      setError("Taastamislingi saatmine ebaõnnestus. Palun proovi mõne aja pärast uuesti.");
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
    <div className="tt-auth-page">
      <Link to="/" className="tt-auth-back">← Avalehele</Link>
      <main className="tt-auth-layout">
        <aside className="tt-auth-story">
          <Link to="/" className="tt-auth-wordmark" aria-label="TreeniTaastu avaleht">
            <span className="tt-public-nav__mark">T</span>
            <span>TREENI &amp; TAASTU</span>
          </Link>
          <p className="tt-auth-kicker">Sinu personaalne treeninguruum</p>
          <h1>Treening, mis liigub sinuga kaasa.</h1>
          <p>
            Kava, juhised ja sinu areng on alati ühes kohas — telefonis või arvutis.
          </p>
          <ul>
            <li><span>01</span>Vaata tänast treeningut</li>
            <li><span>02</span>Märgi raskused ja kordused</li>
            <li><span>03</span>Jätka sealt, kus pooleli jäid</li>
          </ul>
        </aside>

        <section className="tt-auth-panel" aria-labelledby="auth-title">
          <header className="tt-auth-panel__head">
            <h2 id="auth-title">{isResetMode ? "Taasta parool" : "Tere tulemast tagasi"}</h2>
            <p>
              {isResetMode
                ? "Sisesta oma e-post ja saadame sulle turvalise taastamislingi."
                : "Logi sisse, et jätkata oma treeningprogrammiga."}
            </p>
          </header>

          {isExpired && (
            <Alert className="tt-auth-alert tt-auth-alert--expired" role="status">
              <AlertDescription>
                Sinu ligipääs on aegunud. Palun logi sisse uuesti.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="tt-auth-alert tt-auth-alert--error" role="alert">
              <AlertDescription>
                <UserFriendlyAuthError error={error} />
              </AlertDescription>
            </Alert>
          )}

          {info && (
            <Alert className="tt-auth-alert tt-auth-alert--info" role="status">
              <AlertDescription>
                {info}
              </AlertDescription>
            </Alert>
          )}

          {!isResetMode ? (
            <>
              <form onSubmit={handleLogin} className="tt-form-stack" noValidate>
                <div className="tt-field-group">
                  <Label htmlFor="email" className="tt-field-label">E-post</Label>
                  <Input
                    id="email"
                    className="tt-field"
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

                <div className="tt-field-group">
                  <Label htmlFor="password" className="tt-field-label">Parool</Label>
                  <div className="tt-password-field">
                    <Input
                      id="password"
                      className="tt-field"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sinu parool"
                      required
                      autoComplete="current-password"
                      aria-required="true"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="tt-password-toggle"
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
                  className="tt-button tt-button--primary w-full"
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
              <form onSubmit={handleResetPassword} className="tt-form-stack" noValidate>
                <div className="tt-field-group">
                  <Label htmlFor="reset-email" className="tt-field-label">E-post</Label>
                  <Input
                    id="reset-email"
                    className="tt-field"
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
                  className="tt-button tt-button--primary w-full"
                  size="lg"
                  disabled={submitting}
                  aria-disabled={submitting}
                >
                  {submitting ? "Saadan taastamislinki..." : "Saada taastamislink"}
                </Button>
              </form>
            </>
          )}

          <div className="tt-auth-actions">
            <button
              type="button"
              onClick={toggleResetMode}
            >
              {isResetMode ? "Tagasi sisselogimise juurde" : "Unustasid parooli?"}
            </button>
            {!isResetMode && (
              <div>
                <span>Pole veel kontot? </span>
                <Link to="/signup">
                  Loo konto
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
