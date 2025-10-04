import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star, Users, MessageSquare } from 'lucide-react';
import { UpgradePrompt as UpgradePromptType } from '@/types/subscription';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

interface UpgradePromptProps {
  prompt: UpgradePromptType;
  onUpgrade: (planId: string) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function UpgradePrompt({ prompt, onUpgrade, onDismiss, loading }: UpgradePromptProps) {
  const targetPlan = SUBSCRIPTION_PLANS[prompt.targetPlan];
  
  if (!targetPlan) return null;

  const getIcon = () => {
    switch (prompt.targetPlan) {
      case 'guided':
        return <Users className="h-5 w-5" />;
      case 'transformation':
        return <Star className="h-5 w-5" />;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  };

  const getBadgeColor = () => {
    switch (prompt.targetPlan) {
      case 'guided':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transformation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-primary/20 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getIcon()}
          <CardTitle className="text-lg">{prompt.title}</CardTitle>
        </div>
        <CardDescription className="text-sm">
          {prompt.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Plan Preview */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{targetPlan.name}</span>
            <Badge className={getBadgeColor()}>
              {targetPlan.isPopular ? 'Populaarne' : 'Premium'}
            </Badge>
          </div>
          
          <div className="text-2xl font-bold text-primary">
            {targetPlan.price === 0 ? 'Tasuta' : `${targetPlan.price}€`}
            {targetPlan.interval === 'month' && targetPlan.price > 0 && (
              <span className="text-sm font-normal text-muted-foreground">/kuu</span>
            )}
            {targetPlan.interval === 'one_time' && targetPlan.price > 0 && (
              <span className="text-sm font-normal text-muted-foreground"> ühekordne</span>
            )}
          </div>

          {/* Key Features */}
          <div className="space-y-1">
            {targetPlan.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span>{feature}</span>
              </div>
            ))}
            {targetPlan.features.length > 3 && (
              <div className="text-xs text-muted-foreground">
                + {targetPlan.features.length - 3} muud funktsioonid
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => onUpgrade(prompt.targetPlan)}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Upgradeerin...' : prompt.ctaText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onDismiss}
            disabled={loading}
          >
            Hiljem
          </Button>
        </div>

        {/* Additional Context */}
        {prompt.trigger === 'trial_ending' && (
          <p className="text-xs text-center text-muted-foreground">
            Sinu proov lõpeb varsti. Ära jäta võimalust kasutada!
          </p>
        )}
        
        {prompt.trigger === 'program_completion' && (
          <p className="text-xs text-center text-muted-foreground">
            Suurepärane töö! Nüüd on aeg järgmise sammu astuda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
