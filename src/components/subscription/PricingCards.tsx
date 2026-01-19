import React, { useEffect } from 'react';
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
  console.log('[PricingCards] Component rendering', { hasOnSelectPlan: typeof onSelectPlan === 'function', loading, currentPlan });
  
  useEffect(() => {
    console.log('[PricingCards] Component mounted/updated', { 
      hasOnSelectPlan: typeof onSelectPlan === 'function',
      loading, 
      currentPlan,
      planCount: Object.values(SUBSCRIPTION_PLANS).length,
      planIds: Object.keys(SUBSCRIPTION_PLANS)
    });
    
    // Test: Try to find buttons after mount
    setTimeout(() => {
      const buttons = document.querySelectorAll('[data-testid^="pricing-button-"]');
      console.log('[PricingCards] Found buttons in DOM', { count: buttons.length });
      buttons.forEach((btn, idx) => {
        const planId = btn.getAttribute('data-plan-id');
        const disabled = btn.getAttribute('data-disabled') === 'true';
        console.log(`[PricingCards] Button ${idx}`, { planId, disabled, element: btn });
      });
    }, 1000);
  }, [onSelectPlan, loading, currentPlan]);
  
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
              {(() => {
                const buttonDisabled = isLoading || isCurrentPlan;
                console.log('[PricingCards] Button state', { planId: plan.id, isLoading, isCurrentPlan, buttonDisabled, hasOnSelectPlan: typeof onSelectPlan === 'function' });
                if (buttonDisabled) {
                  console.warn('[PricingCards] Button is DISABLED', { planId: plan.id, reason: isLoading ? 'loading' : 'currentPlan' });
                }
                return null;
              })()}
              <Button 
                className="w-full h-10 text-sm font-semibold"
                variant={getButtonVariant(plan)}
                onMouseDown={(e) => {
                  console.log('[PricingCards] onMouseDown FIRED', { planId: plan.id, planName: plan.name, disabled: isLoading || isCurrentPlan });
                  alert('MOUSE DOWN: ' + plan.name + ' (disabled: ' + (isLoading || isCurrentPlan) + ')');
                  e.preventDefault();
                }}
                onMouseEnter={() => {
                  console.log('[PricingCards] Mouse entered button', { planId: plan.id });
                }}
                onClick={(e) => {
                  console.log('[PricingCards] onClick FIRED', { planId: plan.id, planName: plan.name, isLoading, isCurrentPlan, hasOnSelectPlan: typeof onSelectPlan === 'function' });
                  alert('CLICK FIRED: ' + plan.name + ' - Calling handler...');
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof onSelectPlan !== 'function') {
                    console.error('[PricingCards] onSelectPlan is not a function!', { onSelectPlan, type: typeof onSelectPlan });
                    alert('ERROR: onSelectPlan handler not found!');
                    return;
                  }
                  try {
                    console.log('[PricingCards] Calling onSelectPlan with', { planId: plan.id });
                    onSelectPlan(plan.id);
                    alert('Handler called successfully for: ' + plan.name);
                  } catch (error) {
                    console.error('[PricingCards] Error in onClick handler:', error);
                    alert('ERROR calling onSelectPlan: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                disabled={isLoading || isCurrentPlan}
                type="button"
                style={{ 
                  pointerEvents: (isLoading || isCurrentPlan) ? 'none' : 'auto', 
                  zIndex: 9999, 
                  position: 'relative',
                  cursor: (isLoading || isCurrentPlan) ? 'not-allowed' : 'pointer'
                } as React.CSSProperties}
                data-testid={`pricing-button-${plan.id}`}
                data-plan-id={plan.id}
                data-disabled={String(isLoading || isCurrentPlan)}
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
