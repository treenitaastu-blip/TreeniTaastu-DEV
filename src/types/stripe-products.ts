// Stripe Products Configuration for TreeniTaastu
export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR';
  interval: 'month' | 'one_time';
  stripeProductId: string;
  stripePriceId: string;
  features: string[];
  isPopular?: boolean;
  category: 'subscription' | 'one_time';
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'monthly_subscription',
    name: 'Kuutellimus',
    description: 'Iga kuu tellimus - 19.99€',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    stripeProductId: 'prod_T7RQxRbcdrhhuC',
    stripePriceId: 'price_1SBCY0EOy7gy4lEEyRwBvuyw',
    features: [
      'Täielik ligipääs kõikidele harjutustele',
      'Personaalsed treeningprogrammid',
      'Progressi jälgimine',
      'Tervisetõed ja mindfulness',
      'Mobiilirakendus',
      'Email tugi'
    ],
    category: 'subscription'
  },
  {
    id: 'guided_monthly',
    name: 'Juhendatud kuutellimus',
    description: 'Guided Monthly - 49.99€',
    price: 49.99,
    currency: 'EUR',
    interval: 'month',
    stripeProductId: 'prod_T7RR0G1rUYqIim',
    stripePriceId: 'price_1SBCYgEOy7gy4lEEWJWNz8gW',
    features: [
      'Kõik Self-Guided funktsioonid',
      'Nädalased kontrollid',
      'Prioriteetne vastamine küsimustele',
      'Personaalsed soovitused',
      '24/7 chat tugi',
      'Täiendavad tervisetõed'
    ],
    isPopular: true,
    category: 'subscription'
  },
  {
    id: 'transformation_program',
    name: '1:1 Transformatsiooniprogramm',
    description: 'One-time - 199€',
    price: 199,
    currency: 'EUR',
    interval: 'one_time',
    stripeProductId: 'prod_T7RSLXmvhe6xwZ',
    stripePriceId: 'price_1SBCZeEOy7gy4lEEc3DwQzTu',
    features: [
      '5x privaatsed video konsultatsioonid',
      'Täielikult personaalne treeningprogramm',
      '24/7 email/chat tugi',
      'Eluaegne ligipääs personaalsele programmile',
      'Põhjalik progressi analüüs',
      'Toitumissoovitused',
      'Elustiili nõuanded'
    ],
    category: 'one_time'
  }
];

// Helper functions
export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.stripePriceId === priceId);
}

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.id === id);
}

export function getSubscriptionProducts(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter(product => product.category === 'subscription');
}

export function getOneTimeProducts(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter(product => product.category === 'one_time');
}








