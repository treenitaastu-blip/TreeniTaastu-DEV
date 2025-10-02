import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { 
  Stethoscope, 
  UserCheck, 
  Calendar, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Loader2
} from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Price IDs from Stripe
const PRICES = {
  monthly: "price_1SBCokCirvfSO0IROfFuh6AK", // Monthly subscription
  yearly: "price_1SBJMJCirvfSO0IRAHXrGSzn", // Annual one-time payment
  counseling: "price_1SBCpECirvfSO0IRX4tqictw", // Online counseling
  training: "price_1SBCpbCirvfSO0IRC2wngkfL", // Personal training
  package1: "price_1SBCpmCirvfSO0IRb9di7fDz", // Package 1
  package2: "price_1SBCq4CirvfSO0IRTQZ5rCpr", // Package 2
  package3: "price_1SBCqJCirvfSO0IRInOfgvQw", // Package 3
};

type ProfileLite = {
  is_paid: boolean | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

/**
 * PersonalTrainingPage - Professional Health Services & Pricing
 * Merged page with all services, pricing, and booking functionality
 */
export default function PersonalTrainingPage() {
  const { user, isSubscriber } = useAuth() as {
    user: { id: string } | null;
    isSubscriber?: boolean;
  };
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    serviceType: 'initial_assessment' | 'personal_program' | 'monthly_support';
    serviceName: string;
  }>({
    isOpen: false,
    serviceType: 'initial_assessment',
    serviceName: ''
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        if (mounted) {
          setActivePlan(null);
          setLoading(false);
        }
        return;
      }

      const { data: raw } = await supabase
        .from("profiles")
        .select("is_paid, current_period_end, trial_ends_at")
        .eq("id", uid)
        .maybeSingle();

      const prof = (raw ?? null) as ProfileLite | null;

      if (mounted) {
        if (prof?.is_paid) {
          setActivePlan("paid");
        } else if (prof?.trial_ends_at && new Date(prof.trial_ends_at) > new Date()) {
          setActivePlan("trial");
        } else if (prof?.current_period_end && new Date(prof.current_period_end) > new Date()) {
          setActivePlan("active");
        } else {
          setActivePlan(null);
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers = sessionData.session ? {
        Authorization: `Bearer ${sessionData.session.access_token}`
      } : undefined;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode: 'subscription' },
        ...(headers && { headers })
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOneTimePayment = async (priceId: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers = sessionData.session ? {
        Authorization: `Bearer ${sessionData.session.access_token}`
      } : undefined;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode: 'payment' },
        ...(headers && { headers })
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openBooking = (serviceType: 'initial_assessment' | 'personal_program' | 'monthly_support', serviceName: string) => {
    setBookingModal({
      isOpen: true,
      serviceType,
      serviceName
    });
  };

  const closeBooking = () => {
    setBookingModal(prev => ({ ...prev, isOpen: false }));
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-6 leading-tight">
              Teenused ja Hinnakirjad
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Personaaltreening ja füsioteraapia individuaalse lähenemisega. Teaduspõhised meetodid sinu eesmärkide saavutamiseks.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 max-w-4xl mx-auto">
            {error}
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Treeningkavad</h2>
            <p className="text-muted-foreground">Chat tugi kaasas kõigis treeningkavades</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Monthly Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Kuutellimus</CardTitle>
                <div className="text-3xl font-bold text-primary">14,99 €/kuu</div>
                <CardDescription>Tühista igal ajal</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Kõik treeningkavad ja videojuhised</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Chat tugi kaasas</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Ligipääs igal seadmel</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleSubscribe(PRICES.monthly)}
                  disabled={loading || activePlan === "monthly"}
                  size="lg" 
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {activePlan === "monthly" ? "Aktiivne" : "Vali kuupakett"}
                </Button>
              </CardContent>
            </Card>

            {/* Annual Plan */}
            <Card className="relative border-2 border-primary/20">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-gradient-primary text-white">Parim valik</Badge>
                <CardTitle className="text-2xl">Aastamakse</CardTitle>
                <div className="text-3xl font-bold text-primary">119,88 €/aasta</div>
                <CardDescription>9,99€/kuus • Säästad 60€ võrreldes kuumaksega</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Kõik kuupaketi eelised</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Chat tugi kaasas</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Märkimisväärne kokkuhoid</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleOneTimePayment(PRICES.yearly)}
                  disabled={loading || activePlan === "yearly"}
                  size="lg" 
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {activePlan === "yearly" ? "Aktiivne" : "Vali aastapakett"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Online Counseling - With Booking */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Online Nõustamine</h2>
            <p className="text-muted-foreground">Personaalne videosessioon koos broneerimisvõimalusega</p>
          </div>
          
          <Card className="max-w-md mx-auto mb-16">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 rounded-2xl bg-primary/10 p-4 w-fit">
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Online Nõustamine</CardTitle>
              <div className="text-3xl font-bold text-primary">29,99 €</div>
              <CardDescription>30 minutit</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Individuaalne videovestlus</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Personaalsed soovitused</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Treeningplaani kohandamine</span>
                </li>
              </ul>
              <Button 
                onClick={() => openBooking('initial_assessment', 'Online Nõustamine')} 
                size="lg" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Broneeri nõustamine
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Personal Training Services */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Personaalsed Treeningud</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* Contact Training */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Kontaktne treening</CardTitle>
                <div className="text-3xl font-bold text-primary">45 €</div>
                <CardDescription>Tartu või Tallinn</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Spordiklubi pääse kaasas</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Individuaalne juhendamine</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Tehnika õpetamine</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleOneTimePayment(PRICES.training)} 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Osta treening
                </Button>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2 text-lg">Küsimused teenuste kohta?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Võta ühendust personaalse konsultatsiooni jaoks
                </p>
                <Button 
                  onClick={() => window.open("https://treenitaastu.ee/broneeri/", "_blank", "noopener,noreferrer")} 
                  variant="outline" 
                  className="w-full"
                >
                  Võta ühendust
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Personal Training Packages */}
          <h3 className="text-xl font-bold text-center mb-8">Personaalsete treeningute paketid</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Package 1 */}
            <Card className="relative">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">Soovitatud</Badge>
                <CardTitle className="text-lg">Pakett 1</CardTitle>
                <div className="text-2xl font-bold text-primary">59,99 €</div>
                <CardDescription>1 nädal, korratav</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Personaalne treeningplaan (2-4x/nädalas)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Üks videovestlus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Soovitatud täiendada 2 nädala järel</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleOneTimePayment(PRICES.package1)} 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Osta pakett 1
                </Button>
              </CardContent>
            </Card>

            {/* Package 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pakett 2</CardTitle>
                <div className="text-2xl font-bold text-primary">89,99 €</div>
                <CardDescription>1 kuu</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Personaalsed progressioonid 1 kuuks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Üks videovestlus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Detailsed juhised</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleOneTimePayment(PRICES.package2)} 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Osta pakett 2
                </Button>
              </CardContent>
            </Card>

            {/* Package 3 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pakett 3</CardTitle>
                <div className="text-2xl font-bold text-primary">249 €</div>
                <CardDescription>3 kuud</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Personaalsed progressioonid 3 kuuks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Kõige parem väärtus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Pikaajaline tugi</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handleOneTimePayment(PRICES.package3)} 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Osta pakett 3
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={closeBooking}
        serviceType={bookingModal.serviceType}
        serviceName={bookingModal.serviceName}
      />
    </div>
  );
}