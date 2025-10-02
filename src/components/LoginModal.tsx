// src/components/LoginModal.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, UserPlus } from "lucide-react";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LocationState = { from?: { pathname?: string } } | null | undefined;

function getErrMessage(e: unknown, fallback = "Tundmatu viga."): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "object" && e !== null && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg || fallback;
  }
  return typeof e === "string" ? e : fallback;
}

export default function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Default to /home so users land on the dashboard after auth
  const fromPath =
    ((location.state as LocationState)?.from?.pathname as string | undefined) || "/home";

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // GOOGLE OAUTH
  const signInGoogle = async () => {
    setErr(null);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/home` },
      });
    } catch (e: unknown) {
      setErr(getErrMessage(e, "Google sisselogimine ebaõnnestus."));
    }
  };

  // EMAIL LOGIN
  const handleLogin = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data?.session) {
        onOpenChange(false);
        navigate(fromPath, { replace: true });
      } else {
        setMsg("Kontrolli oma e-posti, et lõpetada sisselogimine.");
      }
    } catch (e: unknown) {
      setErr(getErrMessage(e, "Sisselogimine ebaõnnestus."));
    } finally {
      setLoading(false);
    }
  };

  // EMAIL SIGNUP
  const handleSignUp = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const { error, data } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data?.session) {
        onOpenChange(false);
        navigate(fromPath, { replace: true });
      } else {
        setMsg("Konto loodud! Kui kinnitamine on nõutud, vaata oma e-posti.");
      }
    } catch (e: unknown) {
      setErr(getErrMessage(e, "Konto loomine ebaõnnestus."));
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleReset = async () => {
    if (!email) {
      setErr("Sisesta e-post parooli taastamiseks.");
      return;
    }
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      // Use our auto password reset function instead of Supabase's reset flow
      const { error } = await supabase.functions.invoke('auto-password-reset', {
        body: { email }
      });
      if (error) throw error;
      setMsg("Saatsime uue parooli sinu e-postile. Kontrolli postkasti (ka rämpsposti).");
    } catch (e: unknown) {
      setErr(getErrMessage(e, "Parooli lähtestamine ebaõnnestus."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 shadow-soft">
        <DialogHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            {tab === "login" ? (
              <LogIn className="w-6 h-6 text-white" />
            ) : (
              <UserPlus className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {tab === "login" ? "Logi sisse" : "Loo konto"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "login"
                ? "Jätka oma treeningprogrammiga"
                : "Alusta oma treeninguteekonda"}
            </p>
          </div>
        </DialogHeader>

        {err && (
          <Alert className="mb-3 border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive">{err}</AlertDescription>
          </Alert>
        )}
        {msg && (
          <Alert className="mb-3 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900">{msg}</AlertDescription>
          </Alert>
        )}

        {/* Google */}
        <Button
          onClick={signInGoogle}
          className="w-full"
          variant="hero"
          size="lg"
          disabled={loading}
        >
          Jätka Google’iga
        </Button>

        <div className="my-4">
          <Separator />
        </div>

        {/* Email form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              placeholder="sinu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Parool</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sinu parool"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={tab === "login" ? handleLogin : handleSignUp}
              className="flex-1"
              variant="hero"
              disabled={loading}
            >
              {tab === "login" ? "Logi sisse" : "Loo konto"}
            </Button>
            <Button type="button" onClick={handleReset} variant="outline" disabled={loading}>
              Unustasid parooli?
            </Button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mt-4 text-center text-sm">
          {tab === "login" ? (
            <button
              type="button"
              onClick={() => setTab("signup")}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Pole veel kontot? Loo konto
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTab("login")}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Juba on konto? Logi sisse
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
