import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Users, Zap, Crown } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/types/subscription';

interface PricingCardsProps {
  onSelectPlan: (planId: string) => void;
  loading?: string | null;
  currentPlan?: string;
  showTrial?: boolean;
}

export function PricingCards({ onSelectPlan, loading, currentPlan, showTrial = true }: PricingCardsProps) {
  const plans = Object.values(SUBSCRIPTION_PLANS);
  
  const getIcon = (plan: SubscriptionPlan) => {
    switch (plan.tier) {
      case 'trial':
        return <Zap className="h-6 w-6" />;
      case 'self_guided':
        return <Users className="h-6 w-6" />;
      case 'guided':
        return <Star className="h-6 w-6" />;
      case 'transformation':
        return <Crown className="h-6 w-6" />;
      default:
        return <Users className="h-6 w-6" />;
    }
  };

  const getCardStyle = (plan: SubscriptionPlan) => {
    if (plan.isPopular) {
      return "border-2 border-primary shadow-lg scale-105";
    }
    if (plan.tier === 'trial') {
      return "border-2 border-green-200 shadow-md";
    }
    return "border shadow-sm";
  };

  const getButtonVariant = (plan: SubscriptionPlan) => {
    if (plan.isPopular) return "default";
    if (plan.tier === 'trial') return "secondary";
    return "outline";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto mb-20">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id;
        const isLoading = loading === plan.id;
        
        return (
          <Card key={plan.id} className={`relative ${getCardStyle(plan)} transition-all duration-300 hover:shadow-xl hover:scale-105`}>
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                  Populaarne
                </Badge>
              </div>
            )}

            {/* Trial Badge */}
            {plan.tier === 'trial' && showTrial && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-1 text-xs font-semibold">
                  Tasuta Proov
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                {getIcon(plan)}
                <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
              </div>
              
              <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                {plan.description}
              </CardDescription>

              {/* Price */}
              <div className="mt-6">
                <div className="text-3xl font-bold text-primary mb-1">
                  {plan.price === 0 ? 'Tasuta' : `${plan.price}€`}
                </div>
                {plan.interval === 'month' && plan.price > 0 && (
                  <div className="text-sm text-muted-foreground">kuus</div>
                )}
                {plan.interval === 'one_time' && plan.price > 0 && (
                  <div className="text-sm text-muted-foreground">ühekordne makse</div>
                )}
                {plan.trialDays && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    {plan.trialDays} päeva tasuta
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => {
                  const isExcluded = feature.startsWith('Ei sisalda');
                  
                  return (
                    <div key={index} className={`flex items-start gap-3 ${isExcluded ? 'opacity-60' : ''}`}>
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isExcluded ? 'text-muted-foreground/50' : 'text-green-500'}`} />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <Button 
                className="w-full h-10 text-sm font-semibold"
                variant={getButtonVariant(plan)}
                onClick={() => onSelectPlan(plan.id)}
                disabled={isLoading || isCurrentPlan}
              >
                {isCurrentPlan ? (
                  'Aktiivne plaan'
                ) : isLoading ? (
                  'Laen...'
                ) : plan.tier === 'trial' ? (
                  'Alusta tasuta proovi'
                ) : plan.price === 0 ? (
                  'Alusta'
                ) : (
                  `Vali ${plan.name}`
                )}
              </Button>

              {/* Current Plan Indicator */}
              {isCurrentPlan && (
                <div className="text-center text-sm text-green-600 font-medium">
                  ✓ Sinu praegune plaan
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
