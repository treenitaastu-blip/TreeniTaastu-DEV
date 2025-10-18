import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Key, CheckCircle, ArrowLeft } from "lucide-react";
import { passwordSchema, validateAndSanitize } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  // Check if user signed up with Google (no password set initially)
  const isGoogleUser = user.app_metadata?.provider === 'google';

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Uued paroolid ei kattu");
      return;
    }

    // Validate new password strength
    const validation = validateAndSanitize(passwordSchema, newPassword);
    if (!validation.success) {
      setError(validation.errors?.join(", ") || "Uus parool ei vasta nõuetele");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For Google users or users changing password while logged in, allow direct password update
      if (isGoogleUser || !currentPassword) {
        // Direct password update (Google users don't need current password)
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
      } else {
        // Regular users need to verify current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword
        });

        if (signInError) {
          setError("Praegune parool on vale");
          setLoading(false);
          return;
        }

        // Update password after verification
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
      }
      
      setSuccess(true);
      
      // Redirect back after 2 seconds
      setTimeout(() => {
        navigate(-1);
      }, 2000);

    } catch (err) {
      const e = err as Error;
      setError(e.message || "Parooli muutmine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 text-center">
            <div className="text-success mb-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Parool muudetud!</h2>
            <p className="text-muted-foreground mb-4">
              Sinu parool on edukalt muudetud. Suuname sind tagasi...
            </p>
            <Button 
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Tagasi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show Google password setup for Google users who want to set a password
  if (showGoogleSetup) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="mb-4">
          <Button
            onClick={() => setShowGoogleSetup(false)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Tagasi
          </Button>
        </div>
        <GooglePasswordSetup 
          onSuccess={() => setSuccess(true)}
          onCancel={() => setShowGoogleSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card className="border-0 shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {isGoogleUser ? "Seadista parool" : "Muuda parooli"}
          </CardTitle>
          <CardDescription>
            {isGoogleUser 
              ? "Sa oled Google kasutaja. Võid seadistada parooli otseseks sisselogimiseks." 
              : "Sisesta oma praegune parool ja uus parool"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Tagasi
            </Button>
          </div>

          {error && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {isGoogleUser && (
            <div className="mb-6">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-900">
                  Sa logisid sisse Google kaudu. Kui tahad seadistada parooli otseseks sisselogimiseks, 
                  kliki allolevat nuppu.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => setShowGoogleSetup(true)}
                variant="outline"
                className="w-full mt-3"
              >
                Seadista parool Google kontole
              </Button>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {!isGoogleUser && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Praegune parool</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Sisesta praegune parool"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showCurrentPassword ? "Peida parool" : "Näita parooli"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Uus parool</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Sisesta uus parool"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Peida parool" : "Näita parooli"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Parool peab olema vähemalt 8 tähemärki ja sisaldama väiketähte, suurtähte ja numbrit
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Kinnita uus parool</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Sisesta uus parool uuesti"
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

            <Button 
              type="submit" 
              className="w-full" 
              variant="hero" 
              size="lg" 
              disabled={loading || isGoogleUser}
            >
              {loading ? "Muudan parooli..." : "Muuda parool"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}