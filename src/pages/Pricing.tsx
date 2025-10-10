import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingCards } from "@/components/subscription/PricingCards";
import { FeatureComparison } from "@/components/subscription/FeatureComparison";
import { TrustIndicators } from "@/components/subscription/TrustIndicators";
import { Check, ArrowRight, Star } from "lucide-react";
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
      <CardHeader className="text-center">
        <CardTitle className="text-lg">7-päevane tasuta proov</CardTitle>
        <CardDescription>
          Loo konto ja saa ligipääs programmidele
        </CardDescription>
      </CardHeader>
      <CardContent>
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

const MONTHLY_PRICE_ID = "price_1SBCokCirvfSO0IROfFuh6AK";
const YEARLY_PRICE_ID = "price_1SBJMJCirvfSO0IRAHXrGSzn";

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, status } = useAuth();
  const { subscription, subscribe, getCurrentTier } = useSubscription();
  const navigate = useNavigate();

  const handleSelectPlan = async (planId: string) => {
    setLoading(planId);

    try {
      await subscribe(planId);
      
      // Redirect to dashboard after successful subscription
      navigate('/home');
    } catch (error) {
      console.error('Subscription error:', error);
      // Error is already handled in the subscribe function
    } finally {
      setLoading(null);
    }
  };

  const handleCheckout = async (priceId: string, planType: string) => {
    setLoading(priceId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        // Open checkout in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error("Checkout URL not received");
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Viga tellimuse vormistamisel",
        description: error instanceof Error ? error.message : "Proovi hiljem uuesti",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const features = [
    "Kontorikeha 20-päevane programm",
    "Uus nädal saadaval igal esmaspäeval",
    "Video juhised kõigile harjutustele",
    "Progressiooni jälgimine",
    "Ligipääs kõigil seadmetel",
    "Elektrooniline tugi"
  ];

  // Show trial signup if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Alusta tasuta prooviga</h1>
            <p className="text-lg text-muted-foreground">
              7 päeva tasuta ligipääsu kõikidele funktsioonidele
            </p>
          </div>
          
          <TrialSignupCard />
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Kas sul on juba konto?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Logi sisse
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold mb-4">Vali oma plaan</h1>
          <p className="text-xl text-muted-foreground mb-2">
            {subscription ? 'Uuenda oma tellimust' : 'Alusta 7-päevase tasuta prooviga'}
          </p>
          <p className="text-sm text-muted-foreground">
            Krediitkaart ei ole vajalik • Tühista igal ajal
          </p>
        </div>

        {/* Trust Indicators */}
        <TrustIndicators />

        {/* New Subscription Plans */}
        <PricingCards 
          onSelectPlan={handleSelectPlan}
          loading={loading}
          currentPlan={subscription?.planId}
          showTrial={!subscription}
        />

        {/* Feature Comparison Table */}
        <FeatureComparison />

        {/* Current Subscription Info */}
        {subscription && (
          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Sinu praegune tellimus
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <p className="text-lg font-medium">
                {subscription.planId === 'trial_self_guided' ? '7-päevane proov' : 
                 subscription.planId === 'self_guided' ? 'Self-Guided' :
                 subscription.planId === 'guided' ? 'Guided' :
                 subscription.planId === 'transformation' ? 'Transformation' : 'Teadmata'}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {subscription.status}
              </p>
              {subscription.trialEndsAt && (
                <p className="text-sm text-muted-foreground">
                  Proov lõpeb: {subscription.trialEndsAt.toLocaleDateString('et-EE')}
                </p>
              )}
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  Järgmine arve: {subscription.currentPeriodEnd.toLocaleDateString('et-EE')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            7-päevane tasuta prooviperiood • Tühista igal ajal • Turvaline makse
          </p>
          
          {status !== "signedIn" && (
            <div className="space-y-6">
              <TrialSignupCard />
              
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground mb-2">
                  Juba konto olemas?
                </p>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="w-full">
                    Logi sisse
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}