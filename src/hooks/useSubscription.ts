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

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current subscription
  const loadSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription({
          ...data,
          trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : undefined,
          currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

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

  // Subscribe to a plan
  const subscribe = useCallback(async (planId: string) => {
    if (!user) {
      toast({
        title: "Viga",
        description: "Palun logi sisse",
        variant: "destructive"
      });
      return;
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      toast({
        title: "Viga",
        description: "Valitud plaan ei ole leitud",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('subscribe-to-plan', {
        body: {
          planId,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Edukalt tellitud!",
          description: `Sinu ${plan.name} plaan on aktiveeritud.`
        });
        
        // Reload subscription
        await loadSubscription();
        
        return data;
      } else {
        throw new Error(data.error || 'Tellimine ebaõnnestus');
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
  }, [user, toast, loadSubscription]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!subscription) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: subscription.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Tellimus tühistatud",
          description: "Sinu tellimus on tühistatud."
        });
        
        // Reload subscription
        await loadSubscription();
      } else {
        throw new Error(data.error || 'Tühistamine ebaõnnestus');
      }
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
  }, [subscription, toast, loadSubscription]);

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
        prompts.push({
          ...UPGRADE_PROMPTS.find(p => p.id === 'trial_to_guided')!,
          daysUntilExpiry: daysUntilTrialEnds
        });
      }
    }

    // Program completion prompt (you can implement this based on your logic)
    // For now, we'll add it if user has been using the app for a while
    if (currentTier === 'self_guided' && subscription.createdAt) {
      const daysSinceJoined = Math.floor(
        (now.getTime() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceJoined >= 30) {
        prompts.push({
          ...UPGRADE_PROMPTS.find(p => p.id === 'program_completion_transform')!,
          daysSinceJoined
        });
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
