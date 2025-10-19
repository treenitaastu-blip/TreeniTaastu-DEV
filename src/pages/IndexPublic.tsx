// src/pages/IndexPublic.tsx
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function IndexPublic() {
  const { user } = useAuth();

  // Hide loading skeleton once React component mounts
  useEffect(() => {
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) {
      skeleton.style.display = 'none';
    }
  }, []);

  // ✅ Redirect if already logged in
  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section - Optimized for LCP */}
        <div className="hero-container text-center mb-12">
          <h1 className="hero-title text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent">
              Muuda oma elu
            </span>
            <br />
            <span className="text-5xl text-foreground font-bold">28 päevaga</span>
          </h1>
          <p className="hero-subtitle text-xl text-foreground/80 mb-8 max-w-2xl mx-auto font-medium">
            Personaalsed treeningkavad + ekspertide tugi. Tulemused garanteeritud.
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-12">
          <Link
            to="/pricing"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Vaata hinnakirja ja alusta
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Alusta tasuta prooviga • Tühista igal ajal
          </p>
        </div>

        {/* What's Included */}
        <div className="text-center mb-8">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-3 text-left">
              <div className="text-primary font-bold">✓</div>
              <span>Personaalsed treeningkavad igaks nädalaks</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-left">
              <div className="text-primary font-bold">✓</div>
              <span>Video juhendid iga harjutuse jaoks</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-left">
              <div className="text-primary font-bold">✓</div>
              <span>Progressi jälgimine ja analüütika</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6 max-w-md mx-auto">
            <strong>Personaaltreening, nõustamine ja individuaalplaanid</strong> saadaval pärast tellimust jaotises "Hinnad"
          </p>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 text-yellow-500 mb-2">
            {"★".repeat(5)}
          </div>
          <p className="text-muted-foreground">
            "Uskumatu muutus 4 nädalaga!" - Liis, 31
          </p>
        </div>

        {/* Login Section */}
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Juba liige?</h2>
            <p className="text-muted-foreground text-sm">Logi sisse ja jätka treeningut</p>
          </div>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <LoginForm redirectTo="/home" />
            </CardContent>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-12 pt-8 border-t border-muted">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privaatsuspoliitika
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">
              Kasutustingimused
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            © 2024 Treenitaastu. Kõik õigused kaitstud.
          </p>
        </div>
      </div>
    </div>
  );
}
