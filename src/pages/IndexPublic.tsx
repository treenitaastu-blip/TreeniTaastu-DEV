// src/pages/IndexPublic.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { PricingCards } from "@/components/subscription/PricingCards";
import { FeatureComparison } from "@/components/subscription/FeatureComparison";
import { FAQ } from "@/components/subscription/FAQ";
import { Testimonials } from "@/components/subscription/Testimonials";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { Loader2 } from "lucide-react";
import "@/styles/public-auth.css";

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
    <Card className="tt-trial-card">
      <CardContent className="p-6">
        <div className="tt-trial-card__head">
          <h3>7-päevane tasuta proov</h3>
          <p>
            Loo konto ja saa ligipääs programmidele
          </p>
        </div>
        <form onSubmit={handleTrialSignup} className="tt-form-stack">
          <div className="tt-field-group">
            <label className="tt-field-label" htmlFor="trial-email">E-post</label>
            <Input
              id="trial-email"
              className="tt-field"
              type="email"
              inputMode="email"
              placeholder="sinu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="tt-field-group">
            <label className="tt-field-label" htmlFor="trial-password">Parool</label>
            <Input
              id="trial-password"
              className="tt-field"
              type="password"
              placeholder="Vähemalt 6 tähemärki"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <Button 
            type="submit" 
            className="tt-button tt-button--primary w-full"
            disabled={loading}
          >
            {loading ? "Konto loomine..." : "Alusta tasuta proovi"}
          </Button>
          <p className="tt-trial-card__note">
            Sisaldab täieliku ligipääsu programmidele 7 päeva jooksul
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function IndexPublic() {
  const { user, status, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Hide loading skeleton once React component mounts
  useEffect(() => {
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) {
      skeleton.style.display = 'none';
    }
  }, [user]);

  // Show loading state while auth is being checked
  if (loading || status === "loading") {
    return (
      <div className="tt-public-page tt-public-loading">
        <div className="tt-public-loading__content">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p>Laen...</p>
        </div>
      </div>
    );
  }

  // ✅ Redirect if already logged in
  if (user) return <Navigate to="/home" replace />;

  // Handle plan selection for non-logged-in users
  const handleSelectPlan = async (planId: string) => {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    if (!plan) {
      toast({
        title: "Viga",
        description: "Planeeti ei leitud",
        variant: "destructive",
      });
      return;
    }

    // For trial plan, redirect to signup
    if (plan.tier === 'trial' || plan.price === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d2dc5e69-0f61-4c4f-9e34-943daa1e22aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IndexPublic.tsx:handleSelectPlan',message:'Trial plan - redirecting to signup',data:{planId,planTier:plan.tier},timestamp:Date.now(),sessionId:'debug-session',runId:'prod-checkout',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      navigate('/signup');
      return;
    }

    // For paid plans, check if Stripe price ID exists
    if (!plan.stripePriceId) {
      toast({
        title: "Stripe seadistus vajalik",
        description: "See plaan pole veel Stripe'is seadistatud. Palun kontakteeru toega.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(planId);

    try {
      // For non-logged-in users, no auth token needed
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripePriceId }
      });

      if (error) {
        
        // Try to get more details from the error response
        let errorDetails = error.message;
        let errorResponseBody = null;
        
        // Try multiple ways to extract error details
        if (error.context?.response) {
          const response = error.context.response;
          try {
            // Clone the response before reading (in case it's already been read)
            const clonedResponse = response.clone ? response.clone() : response;
            errorResponseBody = await clonedResponse.text();
            try {
              const errorJson = JSON.parse(errorResponseBody);
              errorDetails = errorJson.error || errorJson.message || errorResponseBody || error.message;
            } catch (parseError) {
              // If not JSON, use the raw text
              errorDetails = errorResponseBody || error.message;
            }
          } catch (readError) {
            // Fallback: check if error has message or other details
            if (error.message) {
              errorDetails = error.message;
            }
          }
        }
        
        // Create a more informative error
        const detailedError = new Error(errorDetails || error.message || 'Unknown error from checkout function');
        throw detailedError;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL not received");
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Viga tellimuse vormistamisel",
        description: error instanceof Error ? error.message : "Proovi hiljem uuesti või loo konto",
        variant: "destructive",
      });
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="tt-public-page">
      <main className="tt-public-main">
        <section className="tt-public-hero" aria-labelledby="public-title">
          <div className="tt-public-hero__copy">
            <p className="tt-public-kicker">Personaalne treening · üks selge süsteem</p>
            <h1 id="public-title">Treeni targemalt. Taastu teadlikult.</h1>
            <p className="tt-public-hero__lead">
              Sinu treeningkava, harjutuste juhised ja areng ühes kohas — loodud selleks,
              et sa teaksid igal treeningul täpselt, mida ja miks teha.
            </p>
            <div className="tt-public-hero__actions">
              <Link to="/login" className="tt-button tt-button--primary">Logi kliendina sisse</Link>
              <a href="https://www.treenitaastu.ee/" className="tt-button tt-button--secondary">Vaata personaalset teenust</a>
            </div>
            <dl className="tt-public-hero__facts">
              <div><dt>Kava</dt><dd>Alati kaasas</dd></div>
              <div><dt>Tugi</dt><dd>Küsimused otse treenerile</dd></div>
              <div><dt>Areng</dt><dd>Mõõdetav ja nähtav</dd></div>
            </dl>
          </div>

          <aside className="tt-public-hero__proof" aria-label="Rakenduse põhifunktsioonid">
            <h2>Sinu kava elab siin.</h2>
            <ol className="tt-public-proof-list">
              <li><span>01</span>Treeningkava päevade kaupa</li>
              <li><span>02</span>Harjutuste selged juhised</li>
              <li><span>03</span>Raskuste ja arengu jälgimine</li>
              <li><span>04</span>Üks koht küsimustele ja tagasisidele</li>
            </ol>
          </aside>
        </section>

        <section className="tt-public-section tt-public-pricing" aria-labelledby="pricing-title">
          <header className="tt-public-section__head">
            <h2 id="pricing-title">Vali endale sobiv tugi.</h2>
            <p>Alusta iseseisvalt või vali juurde personaalne juhendamine ja kava kohandused.</p>
          </header>
          <PricingCards
            onSelectPlan={handleSelectPlan}
            loading={checkoutLoading}
            currentPlan={null}
            showTrial={true}
          />
        </section>

        <section className="tt-public-section tt-public-testimonials" aria-label="Klientide kogemused">
          <Testimonials />
        </section>

        <section className="tt-public-section tt-public-comparison" aria-label="Plaanide võrdlus">
          <FeatureComparison />
        </section>

        <section className="tt-public-section tt-public-faq" aria-label="Korduma kippuvad küsimused">
          <FAQ />
        </section>

        <section className="tt-public-signup" aria-labelledby="signup-title">
          <div className="tt-public-signup__copy">
            <p className="tt-public-kicker">Proovi enne otsustamist</p>
            <h2 id="signup-title">Alusta rahulikus tempos.</h2>
            <p>
              Loo konto ja tutvu rakendusega seitse päeva. Krediitkaarti ei ole alustamiseks vaja.
            </p>
          </div>
          <div>
            <TrialSignupCard />
            <p className="mt-4 text-sm">
              Kas sul on juba konto? <Link to="/login">Logi sisse</Link>
            </p>
          </div>
        </section>

        <footer className="tt-public-footer">
          <div className="tt-public-footer__masthead" aria-hidden="true">TreeniTaastu</div>
          <div className="tt-public-footer__meta">
            <div className="tt-public-footer__links">
              <Link to="/privacy-policy">Privaatsuspoliitika</Link>
              <Link to="/terms-of-service">Kasutustingimused</Link>
              <Link to="/login">Logi sisse</Link>
            </div>
            <p>© 2026 TreeniTaastu</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
