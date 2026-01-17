// src/pages/IndexPublic.tsx
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { PricingCards } from "@/components/subscription/PricingCards";
import { FeatureComparison } from "@/components/subscription/FeatureComparison";
import { FAQ } from "@/components/subscription/FAQ";
import { Testimonials } from "@/components/subscription/Testimonials";
import { Shield, Clock, Award, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Trial signup component
function TrialSignupCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTrialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Viga",
        description: "Palun sisesta email ja parool",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Viga", 
        description: "Parool peab olema vähemalt 6 tähemärki pikk",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Use standard signup flow (same as SignupPage.tsx) to ensure 7-day trial
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
        },
      });

      if (error) throw error;

      // If auto-confirmed and session created
      if (data.session) {
        toast({
          title: "Konto loodud!",
          description: "7-päevane tasuta proov on käivitatud!",
        });
        navigate("/home", { replace: true });
        return;
      }

      // Email confirmation required
      toast({
        title: "Konto loodud!",
        description: "7-päevane tasuta proov on käivitatud. Kontrolli oma emaili kinnituslingi saamiseks.",
      });
      
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);

    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Viga konto loomisel",
        description: error instanceof Error ? error.message : "Proovi hiljem uuesti",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-primary/20">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">7-päevane tasuta proov</h3>
          <p className="text-sm text-muted-foreground">
            Loo konto ja saa ligipääs programmidele
          </p>
        </div>
        <form onSubmit={handleTrialSignup} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Parool (min 6 tähemärki)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "Konto loomine..." : "Alusta tasuta proovi"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Sisaldab täieliku ligipääsu programmidele 7 päeva jooksul
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section - Matching marketing site style */}
        <div className="text-center mb-20">
          <h1 className="text-[60px] md:text-[85px] font-black uppercase tracking-[-3px] leading-[102px] mb-8 text-foreground">
            Muuda oma elu
            <br />
            <span className="text-[48px] md:text-[85px]">28 päevaga</span>
          </h1>
          <p className="text-lg font-bold text-[#212121] mb-12 max-w-4xl mx-auto leading-6">
            Professionaalsed treeningprogrammid, mis sobivad nii algajatele kui kogenud treenijatele. 
            Alusta tasuta prooviga ja kogeda erinevust.
          </p>
          
          {/* Enhanced Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-3 text-sm bg-green-50 dark:bg-green-950/20 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium">100% Turvaline</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm bg-blue-50 dark:bg-blue-950/20 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Tühista igal ajal</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm bg-purple-50 dark:bg-purple-950/20 px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-800">
              <Award className="h-5 w-5 text-purple-600" />
              <span className="font-medium">Füsioterapeudi koostatud</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm bg-orange-50 dark:bg-orange-950/20 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="font-medium">500+ treenijat</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <PricingCards 
          onSelectPlan={() => {}}
          loading={null}
          currentPlan={null}
          showTrial={true}
        />

        {/* Testimonials */}
        <Testimonials />

        {/* Feature Comparison */}
        <FeatureComparison />

        {/* FAQ Section */}
        <FAQ />

        {/* Enhanced CTA Section */}
        <div className="text-center mt-20">
          <div className="bg-gradient-to-r from-primary/5 to-primary-foreground/5 rounded-3xl p-12 max-w-4xl mx-auto border border-primary/20 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                Valmis alustama oma muutust?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Liitu üle 500 inimesega, kes on juba alustanud oma fitness-teekonda. 
                <span className="accent-handwriting text-[#00B6E5] text-[28px] md:text-[36px] block mt-2">Alusta tasuta prooviga</span>
              </p>
              
              {/* Urgency indicators */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">7 päeva tasuta</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Tühista igal ajal</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Krediitkaart ei ole vajalik</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <TrialSignupCard />
              <p className="text-sm text-muted-foreground">
                Kas sul on juba konto?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Logi sisse
                </Link>
              </p>
            </div>
          </div>
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
            © 2025 Treenitaastu. Kõik õigused kaitstud.
          </p>
        </div>
      </div>
    </div>
  );
}
