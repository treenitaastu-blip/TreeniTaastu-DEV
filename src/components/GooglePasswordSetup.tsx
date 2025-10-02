import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, CheckCircle } from "lucide-react";
import { passwordSchema, validateAndSanitize } from "@/lib/validations";

interface GooglePasswordSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GooglePasswordSetup({ onSuccess, onCancel }: GooglePasswordSetupProps) {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Paroolid ei kattu");
      return;
    }

    // Validate password strength
    const validation = validateAndSanitize(passwordSchema, password);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Parool ei vasta nõuetele");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For Google users, we can set password directly without requiring current password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      onSuccess?.();
      
      // Redirect after success
      setTimeout(() => {
        navigate(-1);
      }, 2000);

    } catch (err) {
      const e = err as Error;
      setError(e.message || "Parooli seadistamine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 text-center">
          <div className="text-success mb-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Parool seatud!</h2>
          <p className="text-muted-foreground mb-4">
            Sinu parool on edukalt seadistatud. Nüüd saad seda kasutada sisselogimiseks.
          </p>
          <Button 
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Valmis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl">Seadista parool</CardTitle>
        <CardDescription>
          Sa oled sisse logitud Google kaudu. Seadista parool, et saaksid seda kasutada ka otseses sisselogimises.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Uus parool</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sisesta uus parool"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">
              Parool peab olema vähemalt 8 tähemärki ja sisaldama väiketähte, suurtähte ja numbrit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Kinnita parool</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Sisesta parool uuesti"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Peida parool" : "Näita parooli"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Tühista
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1" 
              variant="hero" 
              disabled={loading}
            >
              {loading ? "Seadistan..." : "Seadista parool"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}