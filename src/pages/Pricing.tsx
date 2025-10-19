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
import { FAQ } from "@/components/subscription/FAQ";
import { Testimonials } from "@/components/subscription/Testimonials";
import { Check, ArrowRight, Star, Shield, Clock, Award, Users } from "lucide-react";
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

  // Show comprehensive pricing page for non-logged in users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent leading-tight">
            Vali oma treeningplaan
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
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
            onSelectPlan={handleSelectPlan}
            loading={loading}
            currentPlan={subscription?.planId}
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
                  Alusta tasuta prooviga ja kogeda erinevust juba esimese nädala jooksul.
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            {subscription ? 'Uuenda oma tellimust' : 'Vali oma treeningplaan'}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {subscription 
              ? 'Uuenda oma plaan või vaata teisi võimalusi. Muudatused jõustuvad kohe.'
              : 'Alusta tasuta prooviga ja kogeda erinevust juba esimese nädala jooksul.'
            }
          </p>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-500" />
              <span>100% Turvaline</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Tühista igal ajal</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4 text-purple-500" />
              <span>Füsioterapeudi koostatud</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-orange-500" />
              <span>500+ treenijat</span>
            </div>
          </div>
        </div>

        {/* Current Subscription Info */}
        {subscription && (
          <Card className="max-w-2xl mx-auto mb-12 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Sinu praegune tellimus
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <p className="text-lg font-medium">
                {subscription.planId === 'trial_self_guided' ? '7-päevane proov' : 
                 subscription.planId === 'self_guided' ? 'Iseseisev treening' :
                 subscription.planId === 'guided' ? 'Juhendatud treening' :
                 subscription.planId === 'transformation' ? 'Transformatsioon' : 'Teadmata'}
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

        {/* Pricing Cards */}
        <PricingCards 
          onSelectPlan={handleSelectPlan}
          loading={loading}
          currentPlan={subscription?.planId}
          showTrial={!subscription}
        />

        {/* Testimonials */}
        <Testimonials />

        {/* Feature Comparison */}
        <FeatureComparison />

        {/* FAQ Section */}
        <FAQ />

        {/* Additional CTA */}
        <div className="text-center mt-16">
          <div className="bg-muted/50 rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Küsimused?</h2>
            <p className="text-muted-foreground mb-6">
              Võta ühendust meie tugimeeskonnaga, kui sul on küsimusi või vajad abi.
            </p>
            <Link to="/kontakt">
              <Button variant="outline" size="lg">
                Võta ühendust
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}