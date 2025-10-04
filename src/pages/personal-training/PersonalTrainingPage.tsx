import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STRIPE_PRODUCTS, StripeProduct } from '@/types/subscription';
import { StripeProductCard } from '@/components/stripe/StripeProductCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Shield, Clock, Users } from 'lucide-react';

/**
 * PersonalTrainingPage - Professional Health Services & Pricing
 * Updated with Stripe integration for test products
 */
export default function PersonalTrainingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, session } = useAuth();

  const handleCheckout = async (product: StripeProduct) => {
    if (!user) {
      toast({
        title: "Viga",
        description: "Palun logi sisse, et tellimust vormistada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(product.id);

    try {
      // Create checkout session via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: product.stripePriceId,
          productId: product.stripeProductId,
          mode: product.interval === 'one_time' ? 'payment' : 'subscription',
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/teenused`,
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout immediately
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Tundmatu viga';
      
      toast({
        title: "Viga tellimuse vormistamisel",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary">
            Professional Health Services
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-6">
            Teenused ja Hinnakirjad
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vali oma sobiv teenusepakett ja alusta personaalse tervise teekonda koos eksperdiga
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Kvaliteetne teenus</h3>
            <p className="text-muted-foreground">Kõik teenused põhinevad teaduslikul lähenemisel</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Turvaline</h3>
            <p className="text-muted-foreground">Kõik maksed on turvaliselt kaitstud</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Personaalne</h3>
            <p className="text-muted-foreground">Igale kliendile kohandatud lahendused</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {STRIPE_PRODUCTS.map((product) => (
            <StripeProductCard
              key={product.id}
              product={product}
              onCheckout={handleCheckout}
              loading={loading}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tugi ja abi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meie meeskond on alati valmis aitama. Võta ühendust e-posti või chati kaudu.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Tühista igal ajal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tellimuse saad tühistada igal ajal. Ühekordselt ostetud teenused on püsivad.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Testimise režiimis • Kõik maksed on testimaksed
          </p>
        </div>
      </div>
    </div>
  );
}