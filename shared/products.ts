export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // In JPY
  currency: string;
  image: string;
  amount: number; // Amount of coins/items given
  type: 'coin' | 'item';
}

export const PRODUCTS: Product[] = [
  {
    id: 'coin_pack_small',
    name: 'Coin Pouch',
    description: 'A small pouch of coins to get you started.',
    price: 100,
    currency: 'jpy',
    image: '/images/coin_small.png',
    amount: 100,
    type: 'coin'
  },
  {
    id: 'coin_pack_medium',
    name: 'Coin Bag',
    description: 'A bag full of coins for serious battlers.',
    price: 500,
    currency: 'jpy',
    image: '/images/coin_medium.png',
    amount: 550, // 10% bonus
    type: 'coin'
  },
  {
    id: 'coin_pack_large',
    name: 'Coin Chest',
    description: 'A treasure chest overflowing with coins!',
    price: 1000,
    currency: 'jpy',
    image: '/images/coin_large.png',
    amount: 1200, // 20% bonus
    type: 'coin'
  }
];
