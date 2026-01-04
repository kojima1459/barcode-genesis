export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // In JPY
  currency: string;
  image: string;
  amount: number; // Amount of coins/items given
  type: 'coin' | 'item' | 'subscription';
  stripePriceId?: string; // Stripe Price ID
}

export const PRODUCTS: Product[] = [
  {
    id: 'coin_pack_small',
    name: 'Credit Pouch',
    description: 'A small pouch of credits to get you started.',
    price: 120,
    currency: 'jpy',
    image: '/images/coin_small.png',
    amount: 100,
    type: 'coin',
    stripePriceId: 'price_1SjPcuRy3cnjpOGFNMSku9Op'
  },
  {
    id: 'coin_pack_medium',
    name: 'Credit Bag',
    description: 'A bag full of credits for serious battlers.',
    price: 500,
    currency: 'jpy',
    image: '/images/coin_medium.png',
    amount: 500,
    type: 'coin',
    stripePriceId: 'price_1SjPsxRy3cnjpOGFK5rCDh9q'
  },
  {
    id: 'coin_pack_large',
    name: 'Credit Chest',
    description: 'A treasure chest overflowing with credits!',
    price: 980,
    currency: 'jpy',
    image: '/images/coin_large.png',
    amount: 1200,
    type: 'coin',
    stripePriceId: 'price_1SjPqhRy3cnjpOGF1EIsZba4'
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    description: 'Monthly premium subscription with exclusive benefits.',
    price: 390,
    currency: 'jpy',
    image: '/images/premium.png',
    amount: 0, // Not applicable for subscriptions
    type: 'subscription',
    stripePriceId: 'price_1SkiWvRy3cnjpOGFW3lhDJSZ'
  }
];
