// Subscription types and pricing configuration

export type SubscriptionTier = 'free' | 'trial' | 'self_guided' | 'guided' | 'transformation';

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR';
  interval: 'month' | 'year' | 'one_time';
  features: string[];
  trialDays?: number;
  stripePriceId?: string;
  isPopular?: boolean;
  tier: SubscriptionTier;
};

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  // Free Trial - 7 days for 19.99€ (feeds the funnel)
  trial_self_guided: {
    id: 'trial_self_guided',
    name: '7-päevane proov',
    description: 'Tasuta proov Self-Guided programmile',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    trialDays: 7,
    features: [
      'Täielik ligipääs kõikidele harjutustele',
      'Personaalsed treeningprogrammid',
      'Progressi jälgimine',
      'Tervisetõed ja mindfulness'
    ],
    tier: 'trial'
  },

  // Self-Guided Plan - 19.99€/month
  self_guided: {
    id: 'self_guided',
    name: 'Self-Guided',
    description: 'Isejuhtiv treeningprogramm',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Täielik ligipääs kõikidele harjutustele',
      'Personaalsed treeningprogrammid',
      'Progressi jälgimine',
      'Tervisetõed ja mindfulness',
      'Mobiilirakendus',
      'Email tugi'
    ],
    tier: 'self_guided'
  },

  // Guided Plan - 49.99€/month
  guided: {
    id: 'guided',
    name: 'Guided',
    description: 'Juhendatud treening koos eksperdiga',
    price: 49.99,
    currency: 'EUR',
    interval: 'month',
    isPopular: true,
    features: [
      'Kõik Self-Guided funktsioonid',
      'Nädalased kontrollid',
      'Prioriteetne vastamine küsimustele',
      'Personaalsed soovitused',
      '24/7 chat tugi',
      'Täiendavad tervisetõed'
    ],
    tier: 'guided'
  },

  // Transformation Package - 199€ one-time
  transformation: {
    id: 'transformation',
    name: 'Transformation',
    description: 'Täielik 1:1 personaalne transformatsioon',
    price: 199,
    currency: 'EUR',
    interval: 'one_time',
    features: [
      '5x privaatsed video konsultatsioonid',
      'Täielikult personaalne treeningprogramm',
      '24/7 email/chat tugi',
      'Eluaegne ligipääs personaalsele programmile',
      'Põhjalik progressi analüüs',
      'Toitumissoovitused',
      'Elustiili nõuanded'
    ],
    tier: 'transformation'
  }
};

export type UpgradePrompt = {
  id: string;
  trigger: 'trial_ending' | 'program_completion' | 'weekly_check';
  title: string;
  description: string;
  ctaText: string;
  targetPlan: string;
  showAfterDays?: number;
};

export const UPGRADE_PROMPTS: UpgradePrompt[] = [
  {
    id: 'trial_to_guided',
    trigger: 'trial_ending',
    title: 'Tahad nädalaseid tagasisideid?',
    description: 'Upgradeeri Guided plaanile ja saa personaalseid soovitusi eksperdilt.',
    ctaText: 'Upgradeeri Guided plaanile',
    targetPlan: 'guided',
    showAfterDays: 5 // Show 2 days before trial ends
  },
  {
    id: 'program_completion_transform',
    trigger: 'program_completion',
    title: 'Tahad personaalset plaanit?',
    description: 'Saa 1:1 transformatsioon pakett koos 5 privaatse konsultatsiooniga.',
    ctaText: 'Alusta 1:1 transformatsiooni',
    targetPlan: 'transformation'
  },
  {
    id: 'weekly_guided_prompt',
    trigger: 'weekly_check',
    title: 'Guided plaan annab sinule rohkem',
    description: 'Saada nädalaseid kontrollid ja prioriteetset tuge.',
    ctaText: 'Upgradeeri Guided plaanile',
    targetPlan: 'guided'
  }
];

export type UserSubscription = {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trial' | 'cancelled' | 'expired';
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function getTierFromPlan(planId: string): SubscriptionTier {
  const plan = SUBSCRIPTION_PLANS[planId];
  return plan?.tier || 'free';
}

export function getPlanFromTier(tier: SubscriptionTier): SubscriptionPlan | null {
  const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.tier === tier);
  return plan || null;
}
