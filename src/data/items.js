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
  {
    id: 'traveler_set',
    name: "Traveler's Set",
    desc: 'Gear worn by seasoned explorers. Always grants +2 movement points at the start of each turn.',
    rarity: 'rare',
    icon: 'traveler_set',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'movement_plus_2',
  },
  {
    id: 'star_cloak',
    name: 'Star Cloak',
    desc: 'A cloak woven with the power of the stars. Grants immunity to the first two hits received in combat.',
    rarity: 'epic',
    icon: 'star_cloak',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'damage_immune_2',
  },
  {
    id: 'bloodthirst_mask',
    name: 'Bloodthirst Mask',
    desc: 'An ancient mask soaked in blood. Restores HP equal to 10% of damage dealt after each attack.',
    rarity: 'legendary',
    icon: 'bloodthirst_mask',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'lifesteal_10',
  },
  {
    id: 'lion_heart',
    name: 'Lion Heart',
    desc: 'The heart of a lion king. After taking damage, restores HP equal to 30% of the damage received.',
    rarity: 'legendary',
    icon: 'lion_heart',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'regen_on_hit_30',
  },
  {
    id: 'cursed_codex',
    name: 'Cursed Codex',
    desc: 'A tome cursed by dark magic. Increases damage dealt by 35%, but damage received is also increased by 15%.',
    rarity: 'epic',
    icon: 'cursed_codex',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'damage_amp_35_vulnerability_15',
  },
  {
    id: 'eagle_eye',
    name: 'Eagle Eye',
    desc: 'A mystical eye imbued with eagle sight. After attacking, grants a 60% chance to strike twice.',
    rarity: 'epic',
    icon: 'eagle_eye',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'double_strike_60',
  },
  {
    id: 'holy_spirit_heart',
    name: 'Holy Spirit Heart',
    desc: 'A sacred relic filled with divine grace. When you use a healing skill, it heals the entire party instead.',
    rarity: 'epic',
    icon: 'holy_spirit_heart',
    statBonus: {},
    slot: 1,
    type: 'trinket',
    effect: 'heal_to_aoe',
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


const GOLD_DROP = {
  legendary: [120, 200],
  epic:      [60,  110],
  rare:      [25,  50],
  common:    [8,   20],
};
export function rollGoldDrop(rarity = 'common') {
  const [min, max] = GOLD_DROP[rarity] ?? GOLD_DROP.common;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


const WEAPON_PRICE = {
  legendary: 300,
  epic:      150,
  rare:      80,
};

const ITEM_PRICE = {
  legendary: 180,
  epic:      90,
  rare:      45,
};

export function getShopPrice(item) {
  const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;
  const table = isWeapon ? WEAPON_PRICE : ITEM_PRICE;
  return table[item?.rarity] ?? (isWeapon ? 80 : 45);
}


export function rollShopInventory() {
  const items = [];


  const weapon = rollRandomWeapon();
  if (weapon) {
    weapon._shopPrice = getShopPrice(weapon);
    weapon._isWeapon = true;
    items.push(weapon);
  }


  for (let i = 0; i < 3; i++) {
    const item = rollRandomItem();
    if (item) {
      item._shopPrice = getShopPrice(item);
      items.push(item);
    }
  }

  return items;
}