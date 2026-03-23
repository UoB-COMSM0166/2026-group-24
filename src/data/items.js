// src/data/items.js

export const ItemDB = [
  {
    id: 'swift_bracelet',
    name: '极速脚镯',
    desc: '刻有风纹的古代脚镯，佩戴时如风附体，大幅提升行动敏捷',
    rarity: 'rare',
    icon: 'bracelet',
    statBonus: { agility: 10 },
    slot: 1,
    type: 'trinket',
  },
  {
    id: 'ring_of_strength',
    name: '力量之戒',
    desc: '以上古龙骨铸造而成的戒指，佩戴者力量得到大幅强化',
    rarity: 'rare',
    icon: 'ring_strength',
    statBonus: { strength: 15 },
    slot: 1,
    type: 'trinket',
  },
  {
    id: 'ring_of_intellect',
    name: '智慧之戒',
    desc: '由奥术水晶精心雕刻而成，佩戴者的智慧与法力均得到提升',
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