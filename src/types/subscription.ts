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
  // Free Trial - 7 days (no payment needed)
  trial_self_guided: {
    id: 'trial_self_guided',
    name: '7-päevane proov',
    description: 'Alusta tasuta ja vaata, kuidas su keha hakkab muutuma',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    trialDays: 7,
    features: [
      '✅ 7 päeva piiramatut ligipääsu',
      '✅ Kõik treeningprogrammid',
      '✅ Harjutuste videojuhised',
      '✅ Progressi jälgimine',
      '✅ Tervisetõed ja mindfulness',
      '❌ Ei sisalda personaalset juhendamist',
      '❌ Ei sisalda prioriteetset tuge'
    ],
    tier: 'trial'
  },

  // Self-Guided Plan - 19.99€/month
  self_guided: {
    id: 'self_guided',
    name: 'Self-Guided',
    description: 'Treeni omas tempos, kindla suuna ja struktuuriga',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_1SBCY0EOy7gy4lEEyRwBvuyw',
    features: [
      '✅ Kõik valmiskavad ja harjutused',
      '✅ Progressi jälgimine ja statistika',
      '✅ Tervisetõed ja mindfulness-õpped',
      '✅ Ligipääs igal seadmel',
      '✅ Uued programmid iga kuu',
      '✅ Email tugi 48h jooksul',
      '💡 Ideaalne, kui treenid iseseisvalt'
    ],
    tier: 'self_guided'
  },

  // Guided Plan - 49.99€/month
  guided: {
    id: 'guided',
    name: 'Guided',
    description: 'Isiklik juhendaja su taskus – ilma treeneritasu hirmsa hinnaga',
    price: 49.99,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_1SBCYgEOy7gy4lEEWJWNz8gW',
    isPopular: true,
    features: [
      '✅ Kõik Self-Guided funktsioonid',
      '💬 Iganädalased personaalsed tagasisided',
      '📊 Kava kohandused sinu progressi järgi',
      '⚡ Prioriteetne tugi 24h jooksul',
      '🎯 1:1 konsultatsioonid (email/chat)',
      '🏆 Eesmärkide seadmine ja saavutamine',
      '⭐ Ainult piiratud kliendiarvule',
      '💡 Ideaalne, kui vajad motivatsiooni ja kindlust'
    ],
    tier: 'guided'
  },

  // Transformation Package - 199€ one-time
  transformation: {
    id: 'transformation',
    name: 'Transformation',
    description: '6 nädalat, mis muudavad su elu – füsioterapeut ja treener su kõrval',
    price: 199,
    currency: 'EUR',
    interval: 'one_time',
    stripePriceId: 'price_1SBCZeEOy7gy4lEEc3DwQzTu',
    features: [
      '🎥 5× privaatsed videokonsultatsioonid',
      '📝 Täielikult personaalne treeningkava',
      '💬 24/7 tugi programmi vältel (WhatsApp/email)',
      '🍎 Toitumis- ja elustiilisoovitused',
      '♾️ Ligipääs oma programmile ka pärast 6 nädalat',
      '📊 Põhjalik progressi analüüs',
      '🔥 Kõige tulemuslikum viis luua püsiv muutus',
      '💎 Investeering, mis tasub end mitmekordselt ära'
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
