// src/data/EncounterTable.js

export const ENEMY_TYPES = {
  warrior: {
      name: 'Skeleton Soldier',
      type: 'dungeon',
      // statMod uses absolute values (overrides Enemy.js base formula).
      // Default base: STR = 24 + (level-1)*6  → Lv1=18, slightly nerfed for pacing
      statMod: { strength: 18 },
      desc: 'Melee fighter, high STR',
    skills: [
      { id: 'warrior_slash',  name: 'Slash',      type: 'attack', target: 'single', power: 100, statKey: 'strength' },
      { id: 'warrior_shield', name: 'Iron Guard', type: 'buff',   target: 'self',   statusEffect: 'rock_shield' },
    ],
  },

  mage: {
      name: 'Dark Mage',
      type: 'dungeon',
      // INT base = 22 → Dark Blast 110% vs Knight (DEF≈6): normal 18, perfect 38
      statMod: { intellect: 22 },
      desc: 'Magic attacker, high INT',
    skills: [
      { id: 'mage_blast',    name: 'Dark Blast', type: 'attack', target: 'single', power: 110, statKey: 'intellect' },
      { id: 'mage_hellfire', name: 'Hellfire',   type: 'attack', target: 'aoe',    power: 80,  statKey: 'intellect', statusEffect: 'burn',   statusChance: 0.4 },
      { id: 'mage_blizzard', name: 'Blizzard',   type: 'attack', target: 'aoe',    power: 70,  statKey: 'intellect', statusEffect: 'frozen', statusChance: 0.4 },
    ],
  },
  healer: {
      name: 'Azure Healer',
      type: 'dungeon',
      // TAL base = 16 → modest damage; her real threat is heal+warcry support
      statMod: { talent: 16 },
      desc: 'Support: heals allies, grants warcry',
    skills: [
      { id: 'shaman_strike', name: 'Spirit Strike', type: 'attack',    target: 'single', power: 80, statKey: 'talent' },
      { id: 'shaman_heal',   name: 'Mending Hex',   type: 'ally_heal', target: 'ally',   healAmount: 15 },
      { id: 'shaman_warcry', name: 'War Drum',       type: 'ally_buff', target: 'ally',   statusEffect: 'warcry' },
    ],
  },
  elite: {
      name: 'Barbarian Warrior',
      type: 'dungeon',
      // STR=28 (heavy hitter), toughness=14 (real defense — vitality is not read by Enemy.js)
      statMod: { strength: 28, toughness: 14 },
      desc: 'Tank, high STR and high DEF',
    skills: [],
  },
  stone_golem: {
    name: 'Infernal Demon',
    type: 'dungeon',
    statMod: {
      toughness: 28,   // Much higher than normal value 5, extremely high defense
      strength: 10,    // Low attack
      agility: 4,      // Very slow speed
    },
    hpMulti: 2.0,      // HP doubled (handled in GameController)
    desc: 'Elite: high DEF and HP, self-heal + shield',
    skills: [
      {
        id: 'golem_smash',
        name: 'Rock Smash',
        type: 'attack',
        target: 'single',
        power: 100,
        statKey: 'strength',
      },
      {
        id: 'golem_restore',
        name: 'Stone Mending',
        type: 'self_restore',   // Custom type, handled by handleAI
        target: 'self',
        healPct: 0.10,          // Restore 10% max HP
        statusEffect: 'rock_shield',
      },
      {
        id: 'golem_quake',
        name: 'Ground Quake',
        type: 'attack',
        target: 'aoe',
        power: 80,
        statKey: 'strength',
      },
    ],
  },

  // ↓ New: Swift Assassin
  swift_assassin: {
    name: 'Swift Assassin',
    type: 'dungeon',
    statMod: {
      strength: 28,    // Extremely high attack
      agility: 22,     // Extremely fast speed
      toughness: 3,    // Very low defense
    },
    hpMulti: 1.2,      // HP slightly higher than normal
    desc: 'Elite: high ATK and SPD, anti-heal debuff',
    skills: [
      {
        id: 'assassin_strike',
        name: 'Quick Strike',
        type: 'attack',
        target: 'single',
        power: 110,
        statKey: 'strength',
      },
      {
        id: 'assassin_wound',
        name: 'Venomous Wound',
        type: 'attack',
        target: 'single',
        power: 90,
        statKey: 'strength',
        statusEffect: 'anti_heal',   // New status: anti-heal
        statusChance: 1.0,           // Always applies on hit
      },
      {
        id: 'assassin_freeze',
        name: 'Frost Blade',
        type: 'attack',
        target: 'single',
        power: 100,
        statKey: 'strength',
        statusEffect: 'frozen',
        statusChance: 0.6,           // 60% chance to freeze
      },
    ],
  },
  dark_overlord: {
    name: 'Corfus, the Fallen Paladin',
    type: 'boss',
    hpMulti: 2.0,
    desc: 'Boss: overwhelming power, multi-status attacks, self-empowerment',
    skills: [
      // ① High single-target damage + 100% freeze
      {
        id:           'boss_glacial_judgment',
        name:         'Glacial Judgment',
        type:         'attack',
        target:       'single',
        power:        190,           // Normal mob about 100, high damage set to 160
        statKey:      'strength',
        statusEffect: 'frozen',
        statusChance: 1.0,           // 100% freeze
        desc:         '160% STR single strike — always Freezes target',
      },
      // ② AOE attack + 40% chance to apply Shock + Burn
      {
        id:                 'boss_infernal_storm',
        name:               'Infernal Storm',
        type:               'attack',
        target:             'aoe',
        power:              150,
        statKey:            'strength',
        multiStatusEffects: ['shock', 'burn'],  // New field: trigger two statuses at once
        statusChance:       0.4,                 // 40% chance
        desc:               '120% STR AOE — 40% to apply Shock + Burn to all',
      },
      // ③ Grant self all positive effects
      {
        id:            'boss_dark_empowerment',
        name:          'Dark Empowerment',
        type:          'multi_buff',    // New skill type
        target:        'self',
        statusEffects: ['rock_shield', 'warcry', 'heal_aura'],
        desc:          'Grant self Rock Shield + Warcry + Heal Aura simultaneously',
      },
      {
        id:      'boss_dark_recovery',
        name:    'Dark Recovery',
        type:    'self_heal',
        target:  'self',
        healPct: 0.15,
        desc:    'Recover 15% max HP',
      },
    ],
  },
};

export const ENCOUNTER_TABLE = {
  // Lv1: tutorial-friendly, mostly 1-2 enemies, occasional 3
  1: [
    { weight: 35, group: ['warrior'] },                          // single
    { weight: 35, group: ['warrior', 'warrior'] },               // pair
    { weight: 20, group: ['warrior', 'mage'] },                  // mixed pair
    { weight: 10, group: ['warrior', 'warrior', 'mage'] },       // trio
  ],
  // Lv2: mostly 2-3 enemies
  2: [
    { weight: 30, group: ['warrior', 'mage'] },
    { weight: 25, group: ['warrior', 'healer'] },
    { weight: 25, group: ['warrior', 'warrior', 'mage'] },
    { weight: 15, group: ['warrior', 'mage', 'healer'] },
    { weight: 5,  group: ['warrior', 'warrior', 'warrior'] },
  ],
  // Lv3: dangerous, 2-3 enemies, rare elite solo
  3: [
    { weight: 30, group: ['elite', 'warrior'] },
    { weight: 25, group: ['elite', 'mage', 'healer'] },
    { weight: 20, group: ['elite', 'warrior', 'warrior'] },
    { weight: 15, group: ['warrior', 'mage', 'healer'] },
    { weight: 5,  group: ['stone_golem'] },           // rare solo elite
    { weight: 5,  group: ['swift_assassin'] },        // rare solo elite
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
