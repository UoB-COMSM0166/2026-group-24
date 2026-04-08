// src/data/EncounterTable.js

export const ENEMY_TYPES = {
  warrior: {
    name: 'Goblin Warrior',
    type: 'dungeon',
    statMod: { strength: 1.2 },
    desc: 'Melee fighter, high STR',
    skills: [
      { id: 'warrior_slash',  name: 'Slash',      type: 'attack', target: 'single', power: 100, statKey: 'strength' },
      { id: 'warrior_shield', name: 'Iron Guard', type: 'buff',   target: 'self',   statusEffect: 'rock_shield' },
    ],
  },

  mage: {
    name: 'Dark Mage',
    type: 'dungeon',
    statMod: { intellect: 1.4 },
    desc: 'Magic attacker, high INT',
    skills: [
      { id: 'mage_blast',    name: 'Dark Blast', type: 'attack', target: 'single', power: 110, statKey: 'intellect' },
      { id: 'mage_hellfire', name: 'Hellfire',   type: 'attack', target: 'aoe',    power: 80,  statKey: 'intellect', statusEffect: 'burn',   statusChance: 0.4 },
      { id: 'mage_blizzard', name: 'Blizzard',   type: 'attack', target: 'aoe',    power: 70,  statKey: 'intellect', statusEffect: 'frozen', statusChance: 0.4 },
    ],
  },
  healer: {
    name: 'Goblin Shaman',
    type: 'dungeon',
    statMod: { talent: 1.2 },
    desc: 'Support: heals allies, grants warcry',
    skills: [
      { id: 'shaman_strike', name: 'Spirit Strike', type: 'attack',    target: 'single', power: 80, statKey: 'talent' },
      { id: 'shaman_heal',   name: 'Mending Hex',   type: 'ally_heal', target: 'ally',   healAmount: 15 },
      { id: 'shaman_warcry', name: 'War Drum',       type: 'ally_buff', target: 'ally',   statusEffect: 'warcry' },
    ],
  },
  elite: {
    name: 'Orc Elite',
    type: 'dungeon',
    statMod: { strength: 1.5, vitality: 1.4 },
    desc: 'Tank, high STR and VIT',
    skills: [],
  },
  stone_golem: {
    name: 'Stone Golem',
    type: 'dungeon',
    statMod: {
      toughness: 28,   // 远高于普通值5，防御极高
      strength: 10,    // 攻击偏低
      agility: 4,      // 速度很慢
    },
    hpMulti: 2.0,      // 血量翻倍（在 GameController 里处理）
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
        type: 'self_restore',   // 自定义类型，handleAI 处理
        target: 'self',
        healPct: 0.10,          // 回复最大血量10%
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

  // ↓ 新增：迅捷刺客
  swift_assassin: {
    name: 'Swift Assassin',
    type: 'dungeon',
    statMod: {
      strength: 28,    // 攻击极高
      agility: 22,     // 速度极快
      toughness: 3,    // 防御很低
    },
    hpMulti: 1.2,      // 血量略高于普通
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
        statusEffect: 'anti_heal',   // 新状态：禁疗
        statusChance: 1.0,           // 命中必定附加
      },
      {
        id: 'assassin_freeze',
        name: 'Frost Blade',
        type: 'attack',
        target: 'single',
        power: 100,
        statKey: 'strength',
        statusEffect: 'frozen',
        statusChance: 0.6,           // 60% 概率冻结
      },
    ],
  },
  dark_overlord: {
    name: 'Dark Overlord',
    type: 'boss',
    hpMulti: 2.0,
    desc: 'Boss: overwhelming power, multi-status attacks, self-empowerment',
    skills: [
      // ① 单体高伤 + 100% 冻结
      {
        id:           'boss_glacial_judgment',
        name:         'Glacial Judgment',
        type:         'attack',
        target:       'single',
        power:        190,           // 普通小怪约 100，高伤定为 160
        statKey:      'strength',
        statusEffect: 'frozen',
        statusChance: 1.0,           // 100% 冻结
        desc:         '160% STR single strike — always Freezes target',
      },
      // ② 群体攻击 + 40% 概率同时附加感电+燃烧
      {
        id:                 'boss_infernal_storm',
        name:               'Infernal Storm',
        type:               'attack',
        target:             'aoe',
        power:              150,
        statKey:            'strength',
        multiStatusEffects: ['shock', 'burn'],  // 新字段：同时触发两个状态
        statusChance:       0.4,                 // 40% 概率
        desc:               '120% STR AOE — 40% to apply Shock + Burn to all',
      },
      // ③ 给自己附加全部正面效果
      {
        id:            'boss_dark_empowerment',
        name:          'Dark Empowerment',
        type:          'multi_buff',    // 新技能类型
        target:        'self',
        statusEffects: ['rock_shield', 'warcry', 'heal_aura'],
        desc:          'Grant self Rock Shield + Warcry + Heal Aura simultaneously',
      },
    ],
  },
};

export const ENCOUNTER_TABLE = {
  1: [
    { weight: 100, group: ['warrior'] },            // 原60，现在独占100%
  ],
  2: [
    { weight: 50, group: ['warrior', 'mage'] },     // 原warrior+archer改为warrior+mage
    { weight: 30, group: ['warrior', 'healer'] },   // 原warrior+archer+healer去掉archer
    { weight: 20, group: ['warrior', 'warrior'] },  // 新增：两个warrior凑数
  ],
  3: [
    { weight: 40, group: ['elite', 'warrior'] },
    { weight: 35, group: ['elite', 'mage', 'healer'] },
    { weight: 25, group: ['elite', 'warrior', 'warrior'] },
    { weight: 15, group: ['stone_golem'] },             // ← 新增
    { weight: 15, group: ['swift_assassin'] },
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