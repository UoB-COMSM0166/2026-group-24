// src/data/EncounterTable.js

export const ENEMY_TYPES = {
  warrior: {
    name: 'Goblin Warrior',
    type: 'dungeon',
    statMod: { strength: 1.2 },
    desc: 'Melee fighter, high STR'
  },
  archer: {
    name: 'Goblin Archer',
    type: 'dungeon',
    statMod: { awareness: 1.3 },
    desc: 'Ranged attacker, high AWR'
  },
  mage: {
    name: 'Dark Mage',
    type: 'dungeon',
    statMod: { intellect: 1.4 },
    desc: 'Magic attacker, high INT'
  },
  healer: {
    name: 'Goblin Shaman',
    type: 'dungeon',
    statMod: { talent: 1.2 },
    desc: 'Heals allies each turn'
  },
  elite: {
    name: 'Orc Elite',
    type: 'dungeon',
    statMod: { strength: 1.5, vitality: 1.4 },
    desc: 'Tank, high STR and VIT'
  },
};

export const ENCOUNTER_TABLE = {
  1: [
    { weight: 60, group: ['warrior'] },
    { weight: 40, group: ['warrior', 'archer'] },
  ],
  2: [
    { weight: 50, group: ['warrior', 'archer'] },
    { weight: 30, group: ['warrior', 'mage'] },
    { weight: 20, group: ['warrior', 'archer', 'healer'] },
  ],
  3: [
    { weight: 40, group: ['elite', 'warrior'] },
    { weight: 35, group: ['elite', 'mage', 'healer'] },
    { weight: 25, group: ['elite', 'warrior', 'archer'] },
  ],
};

export function rollEncounter(level) {
  const table = ENCOUNTER_TABLE[Math.min(level, 3)] || ENCOUNTER_TABLE[1];
  const total = table.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * total;
  for (const entry of table) {
    rand -= entry.weight;
    if (rand <= 0) return entry.group;
  }
  return table[0].group;
}