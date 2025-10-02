import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check } from "lucide-react";
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
      const { data, error } = await supabase.functions.invoke('start-pt-trial', {
        body: { email, password }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Konto loodud!",
          description: "3-päevane Personal Training proov on käivitatud. Logi nüüd sisse.",
        });
        
        // Redirect to auth page for login
        navigate("/auth?mode=login");
      } else {
        throw new Error(data?.error || "Konto loomine ebaõnnestus");
      }

    } catch (error) {
      console.error('Trial signup error:', error);
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
        <CardTitle className="text-lg">3-päevane tasuta proov</CardTitle>
        <CardDescription>
          Loo konto ja saa ligipääs Personal Training programmidele
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
            Sisaldab ligipääsu Personal Training programmidele 3 päeva jooksul
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
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Vali oma plaan</h1>
          <p className="text-xl text-muted-foreground">
            Alusta 3-päevase tasuta prooviperioodiga
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Monthly Plan */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Kuumakse</CardTitle>
              <CardDescription>
                Paindlik valik, tühista igal ajal
              </CardDescription>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">€14,99</span>
                <span className="text-muted-foreground">/kuu</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => handleCheckout(MONTHLY_PRICE_ID, "monthly")}
                disabled={loading === MONTHLY_PRICE_ID}
                className="w-full"
                size="lg"
              >
                {loading === MONTHLY_PRICE_ID ? "Ümbersuunamine..." : "Alusta kuumaksega"}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="border-2 border-primary relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Säästa €60
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Aastamakse</CardTitle>
              <CardDescription>
                Parim väärtus - märkimisväärne kokkuhoid
              </CardDescription>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">€119,88</span>
                <span className="text-muted-foreground">/aasta</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Võrreldes kuumaksega (€179,88)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => handleCheckout(YEARLY_PRICE_ID, "yearly")}
                disabled={loading === YEARLY_PRICE_ID}
                className="w-full"
                size="lg"
                variant="default"
              >
                {loading === YEARLY_PRICE_ID ? "Ümbersuunamine..." : "Alusta aastamaksega"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            3-päevane tasuta prooviperiood • Tühista igal ajal • Turvaline makse
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