import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  SUBSCRIPTION_PLANS, 
  UPGRADE_PROMPTS, 
  UserSubscription, 
  SubscriptionTier,
  getTierFromPlan 
} from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

// Type for user entitlement from database
type UserEntitlement = {
  id: string;
  user_id: string;
  product: 'static' | 'pt';
  status: 'active' | 'trialing' | 'expired' | 'cancelled';
  started_at: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  paused: boolean;
  source: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

// Map entitlements to subscription-like object for backward compatibility
function mapEntitlementsToSubscription(
  userId: string, 
  entitlements: UserEntitlement[]
): UserSubscription | null {
  if (!entitlements || entitlements.length === 0) return null;

  // Determine the plan based on what entitlements user has
  const hasStatic = entitlements.some(e => e.product === 'static' && !e.paused);
  const hasPT = entitlements.some(e => e.product === 'pt' && !e.paused);
  
  // Determine if it's a trial
  const staticEnt = entitlements.find(e => e.product === 'static');
  const ptEnt = entitlements.find(e => e.product === 'pt');
  
  const isTrial = staticEnt?.status === 'trialing' || ptEnt?.status === 'trialing';
  const trialEndsAt = staticEnt?.trial_ends_at || ptEnt?.trial_ends_at;
  
  // Map to plan ID
  let planId = 'trial_self_guided'; // default
  if (isTrial) {
    planId = 'trial_self_guided';
  } else if (hasPT && hasStatic) {
    planId = 'guided'; // or 'transformation' if one-time
  } else if (hasStatic) {
    planId = 'self_guided';
  }

  // Get expiry dates
  const currentPeriodEnd = staticEnt?.expires_at || ptEnt?.expires_at;
  
  return {
    id: staticEnt?.id || ptEnt?.id || '',
    userId,
    planId,
    status: isTrial ? 'trial' : 'active',
    trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : undefined,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined,
    createdAt: new Date(staticEnt?.created_at || ptEnt?.created_at || new Date()),
    updatedAt: new Date(staticEnt?.updated_at || ptEnt?.updated_at || new Date())
  };
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current subscription from user_entitlements
  const loadSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      
      // Query active entitlements
      const { data, error } = await supabase
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .or(`trial_ends_at.gt.${now},expires_at.gt.${now},expires_at.is.null`);

      if (error) throw error;

      const mappedSubscription = mapEntitlementsToSubscription(user.id, data || []);
      setSubscription(mappedSubscription);
      
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [user]);

  // Get current tier
  const getCurrentTier = useCallback((): SubscriptionTier => {
    if (!subscription) return 'free';
    return getTierFromPlan(subscription.planId);
  }, [subscription]);

  // Check if user has access to a tier
  const hasAccess = useCallback((requiredTier: SubscriptionTier): boolean => {
    const currentTier = getCurrentTier();
    
    // Tier hierarchy: free < trial < self_guided < guided < transformation
    const tierLevels = {
      free: 0,
      trial: 1,
      self_guided: 2,
      guided: 3,
      transformation: 4
    };

    return tierLevels[currentTier] >= tierLevels[requiredTier];
  }, [getCurrentTier]);

  // Check if trial is active
  const isTrialActive = useCallback((): boolean => {
    if (!subscription || subscription.status !== 'trial') return false;
    if (!subscription.trialEndsAt) return false;
    return subscription.trialEndsAt > new Date();
  }, [subscription]);

  // Check if subscription is active
  const isActive = useCallback((): boolean => {
    if (!subscription) return false;
    
    if (subscription.status === 'trial') {
      return isTrialActive();
    }
    
    if (subscription.status === 'active') {
      if (!subscription.currentPeriodEnd) return true;
      return subscription.currentPeriodEnd > new Date();
    }
    
    return false;
  }, [subscription, isTrialActive]);

  // Subscribe to a plan - uses Stripe Checkout
  const subscribe = useCallback(async (planId: string) => {
    if (!user) {
      toast({
        title: "Viga",
        description: "Palun logi sisse",
        variant: "destructive"
      });
      throw new Error("User not logged in");
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      toast({
        title: "Viga",
        description: "Valitud plaan ei ole leitud",
        variant: "destructive"
      });
      throw new Error("Plan not found");
    }

    // Handle free trial (no payment needed)
    if (plan.price === 0 || plan.tier === 'trial') {
      toast({
        title: "Tasuta proov",
        description: "Tasuta proov aktiveeritakse automaatselt konto loomisel",
      });
      return;
    }

    // For paid plans, use Stripe checkout
    if (!plan.stripePriceId) {
      toast({
        title: "Viga",
        description: "Stripe Price ID puudub",
        variant: "destructive"
      });
      throw new Error("Stripe Price ID missing");
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripePriceId }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL not received");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tellimine ebaõnnestus';
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Cancel subscription - would need to track Stripe subscription ID
  const cancelSubscription = useCallback(async () => {
    if (!subscription) return;

    try {
      setLoading(true);
      setError(null);

      // For now, we'd need to call Stripe customer portal or manage via admin
      toast({
        title: "Tellimuse haldamine",
        description: "Kasuta 'Minu Konto' lehte tellimuse haldamiseks",
      });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tühistamine ebaõnnestus';
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [subscription, toast]);

  // Get upgrade prompts for current user
  const getUpgradePrompts = useCallback(() => {
    if (!subscription) return [];

    const prompts = [];
    const currentTier = getCurrentTier();
    const now = new Date();

    // Trial ending prompt
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const daysUntilTrialEnds = Math.ceil(
        (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilTrialEnds <= 2) {
        const prompt = UPGRADE_PROMPTS.find(p => p.id === 'trial_to_guided');
        if (prompt) {
          prompts.push({
            ...prompt,
            daysUntilExpiry: daysUntilTrialEnds
          });
        }
      }
    }

    // Program completion prompt
    if (currentTier === 'self_guided' && subscription.createdAt) {
      const daysSinceJoined = Math.floor(
        (now.getTime() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceJoined >= 30) {
        const prompt = UPGRADE_PROMPTS.find(p => p.id === 'program_completion_transform');
        if (prompt) {
          prompts.push({
            ...prompt,
            daysSinceJoined
          });
        }
      }
    }

    return prompts;
  }, [subscription, getCurrentTier]);

  return {
    subscription,
    loading,
    error,
    getCurrentTier,
    hasAccess,
    isTrialActive,
    isActive,
    subscribe,
    cancelSubscription,
    getUpgradePrompts,
    reload: loadSubscription
  };
}
