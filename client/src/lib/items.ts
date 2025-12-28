export type ShopItem = {
  id: string;
  name: string;
  price: number;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "power_core", name: "Power Core", price: 100 },
  { id: "shield_plate", name: "Shield Plate", price: 80 },
  { id: "speed_chip", name: "Speed Chip", price: 60 }
];

export const getItemLabel = (itemId: string) => {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  return item?.name ?? itemId;
};
