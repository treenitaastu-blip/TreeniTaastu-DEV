import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STRIPE_PRODUCTS, StripeProduct } from '@/types/subscription';
import { StripeProductCard } from '@/components/stripe/StripeProductCard';
import { StripeCheckout } from '@/components/stripe/StripeCheckout';
import { StripeConfig } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Shield, Clock, Users } from 'lucide-react';

/**
 * PersonalTrainingPage - Professional Health Services & Pricing
 * Updated with Stripe integration for test products
 */
export default function PersonalTrainingPage() {
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleProductSelect = (product: StripeProduct) => {
    setSelectedProduct(product);
  };

  const handleCheckoutSuccess = () => {
    toast({
      title: "Edukas!",
      description: "Suunatakse makselehele...",
    });
  };

  const handleCheckoutError = (error: string) => {
    console.error('Checkout error:', error);
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
              onSelect={handleProductSelect}
              loading={loading}
            />
          ))}
        </div>

        {/* Selected Product Checkout */}
        {selectedProduct && (
          <div className="max-w-md mx-auto">
            <Card className="border-primary">
              <CardHeader className="text-center">
                <CardTitle>Valitud teenus: {selectedProduct.name}</CardTitle>
                <CardDescription>
                  {selectedProduct.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeCheckout
                  product={selectedProduct}
                  onSuccess={handleCheckoutSuccess}
                  onError={handleCheckoutError}
                />
              </CardContent>
            </Card>
          </div>
        )}

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