import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Use live publishable key - user needs to provide this
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_YOUR_LIVE_KEY_HERE"
);

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentFormContent({ onSuccess, onCancel }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe or elements not loaded');
      toast({
        title: "Viga",
        description: "Makse süsteem pole valmis. Palun proovige uuesti.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // First validate the form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Then confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Only proceed if payment is actually succeeded
      if (result.paymentIntent?.status === 'succeeded') {
        toast({
          title: "Makse õnnestus!",
          description: "Teie makse on edukalt sooritatud"
        });
        onSuccess();
      } else {
        throw new Error("Makse ei õnnestunud. Palun proovige uuesti.");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Makse ebaõnnestus",
        description: error.message || "Maksel tekkis viga. Palun proovige uuesti.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <PaymentElement />
      </div>
      
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Tagasi
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading ? "Töötleme..." : "Maksa ja broneeri"}
        </Button>
      </div>
    </form>
  );
}

export function PaymentForm({ clientSecret, onSuccess, onCancel }: PaymentFormProps) {
  if (!clientSecret) {
    console.error('PaymentForm: No clientSecret provided');
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Makseandmed puuduvad. Palun alustage uuesti.</p>
        <Button onClick={onCancel} variant="outline" className="mt-4">
          Tagasi
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: 'hsl(var(--primary))',
          }
        }
      }}
    >
      <PaymentFormContent onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

export default PaymentForm;