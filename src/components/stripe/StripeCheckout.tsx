import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { StripeProduct } from '@/types/subscription';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface StripeCheckoutProps {
  product: StripeProduct;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripeCheckout({ product, onSuccess, onError }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Viga",
        description: "Palun logi sisse, et tellimust vormistada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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
        // Redirect to Stripe Checkout
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

      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Laen...
        </>
      ) : (
        <>
          {product.interval === 'one_time' ? 'Osta nüüd' : 'Alusta tellimust'}
        </>
      )}
    </Button>
  );
}
