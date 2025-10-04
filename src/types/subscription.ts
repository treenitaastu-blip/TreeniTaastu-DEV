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

// Stripe-specific types and configuration

export type StripeProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR';
  interval?: 'month' | 'year' | 'one_time';
  features: string[];
  isPopular?: boolean;
  stripePriceId: string;
  stripeProductId: string;
};

export type StripeConfig = {
  publishableKey: string;
  secretKey?: string; // Only for server-side operations
};

export const STRIPE_CONFIG: StripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SBCVDEOy7gy4lEEDkahTAWigfrlqwRM33ZVB9gCcqhZSj8kuM6fpGwO48Q47EVR9BaX61rBeRPt7rW1zI9ffXAg00El3QnEp2',
};

// Stripe Products Configuration
export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'kuutellimus',
    name: 'Kuutellimus',
    description: 'Ligipääs sisule Treenitaastu äpis',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Täielik ligipääs kõikidele treeningprogrammidele',
      'Progressi jälgimine ja analüüs',
      'Tervisetõed ja mindfulness sisu',
      'Mobiilirakendus kõigil seadmetel',
      'Email tugi'
    ],
    stripePriceId: 'price_1SBCY0EOy7gy4lEEyRwBvuyw',
    stripeProductId: 'prod_T7RQxRbcdrhhuC'
  },
  {
    id: 'juhendatud_kuutellimus',
    name: 'Juhendatud kuutellimus',
    description: 'Kõik kuutellimuse plaanis + personaalne juhendamine',
    price: 49.99,
    currency: 'EUR',
    interval: 'month',
    isPopular: true,
    features: [
      'Kõik kuutellimuse funktsioonid',
      '2x/kuus personaalne juhendamine videokõne teel',
      'Prioriteetsed vastused küsimustele',
      'Personaalsed soovitused ja kohandused',
      '24/7 chat tugi',
      'Põhjalikum progressi jälgimine'
    ],
    stripePriceId: 'price_1SEa2gEOy7gy4lEE8sdrZOS0',
    stripeProductId: 'prod_TAvuTZX5ePO2Il'
  },
  {
    id: 'transformatsiooniprogramm',
    name: '1:1 Transformatsiooniprogramm',
    description: 'Täiuslik lahendus kiirete ja kindlate tulemuste jaoks',
    price: 199,
    currency: 'EUR',
    interval: 'one_time',
    features: [
      '5x personaalsed videokonsultatsioonid',
      'Täielikult personaalne treeningprogramm',
      '24/7 e-posti ja vestluse tugi',
      'Püsiv ligipääs treeningkavale',
      'Põhjalik progressi analüüs ja kohandused',
      'Toitumissoovitused ja elustiili nõuanded',
      'Personaalne mentorlus'
    ],
    stripePriceId: 'price_1SBCZeEOy7gy4lEEc3DwQzTu',
    stripeProductId: 'prod_T7RSLXmvhe6xwZ'
  }
];