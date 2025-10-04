import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowRight } from 'lucide-react';
import { StripeProduct } from '@/types/subscription';

interface StripeProductCardProps {
  product: StripeProduct;
  onSelect: (product: StripeProduct) => void;
  loading?: boolean;
}

export function StripeProductCard({ product, onSelect, loading }: StripeProductCardProps) {
  return (
    <Card className={`relative ${product.isPopular ? 'border-2 border-primary shadow-lg scale-105' : 'border shadow-sm'}`}>
      {/* Popular Badge */}
      {product.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Populaarne
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <CardDescription className="text-sm">
          {product.description}
        </CardDescription>

        {/* Price */}
        <div className="mt-4">
          <div className="text-3xl font-bold text-primary">
            {product.price}€
          </div>
          {product.interval === 'month' && (
            <div className="text-sm text-muted-foreground">kuus</div>
          )}
          {product.interval === 'one_time' && (
            <div className="text-sm text-muted-foreground">ühekordne</div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features */}
        <div className="space-y-2">
          {product.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <Button 
          className="w-full"
          variant={product.isPopular ? "default" : "outline"}
          onClick={() => onSelect(product)}
          disabled={loading}
        >
          {loading ? (
            'Laen...'
          ) : product.interval === 'one_time' ? (
            'Osta nüüd'
          ) : (
            'Alusta tellimust'
          )}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
