// src/data/items.js

export const ItemDB = [
  {
    id: 'swift_bracelet',
    name: 'Swift Bracelet',
    desc: 'An ancient bracelet inscribed with wind runes. When worn, it grants the wearer extraordinary agility.',
    rarity: 'rare',
    icon: 'bracelet',
    statBonus: { agility: 10 },
    slot: 1,
    type: 'trinket',

  },
  {
    id: 'ring_of_strength',
    name: 'Ring of Strength',
    desc: 'A ring forged from ancient dragon bone that greatly enhances the wearer\'s strength.',
    rarity: 'rare',
    icon: 'ring_strength',
    statBonus: { strength: 15 },
    slot: 1,
    type: 'trinket',
  },
  {
    id: 'ring_of_intellect',
    name: 'Ring of Intellect',
    desc: 'Carefully carved from arcane crystal to enhance both wisdom and magical power.',
    rarity: 'rare',
    icon: 'ring_intellect',
    statBonus: { intellect: 15 },
    slot: 1,
    type: 'trinket',
  },
];

export function rollRandomItem() {
  const weights = ItemDB.map(item => {
    if (item.rarity === 'legendary') return 1;
    if (item.rarity === 'epic') return 2;
    if (item.rarity === 'rare') return 4;
    return 6;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < ItemDB.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return { ...ItemDB[i] };
  }
  return { ...ItemDB[0] };
}

export const RARITY_COLORS = {
  rare:      { main: '#3b82f6', glow: '#60a5fa', label: 'Rare' },
  epic:      { main: '#a855f7', glow: '#c084fc', label: 'Epic' },
  legendary: { main: '#ef4444', glow: '#f87171', label: 'Legendary' },
};

export function rollRandomWeapon() {
  const weapons = window.DataLoader?.getAllWeapons() ?? [];
  if (weapons.length === 0) return null;
  const weights = weapons.map(w => {
    if (w.rarity === 'epic')  return 2;
    if (w.rarity === 'rare')  return 5;
    return 3;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weapons.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return { ...weapons[i] };
  }
  return { ...weapons[0] };
}

export function rollRandomLoot() {
  if (Math.random() < 0.6) {
    return rollRandomItem();
  }
  return rollRandomWeapon() ?? rollRandomItem();
}
// ── 金币掉落 ──────────────────────────────────────────────────────
const GOLD_DROP = {
  legendary: [80, 150],
  epic:      [40, 80],
  rare:      [15, 35],
  common:    [5, 15],
};
export function rollGoldDrop(rarity = 'common') {
  const [min, max] = GOLD_DROP[rarity] ?? GOLD_DROP.common;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── 商店定价 ──────────────────────────────────────────────────────
const SHOP_PRICE = {
  legendary: 400,
  epic:      200,
  rare:      100,
  common:    40,
};
export function getShopPrice(item) {
  return SHOP_PRICE[item?.rarity] ?? 40;
}

// ── 随机生成商店货架 ──────────────────────────────────────────────
export function rollShopInventory(count = 3) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const isWeapon = Math.random() < 0.5;
    const item = isWeapon ? (rollRandomWeapon() ?? rollRandomItem()) : rollRandomItem();
    if (item) {
      item._shopPrice = getShopPrice(item);
      items.push(item);
    }
  }
  return items;
}