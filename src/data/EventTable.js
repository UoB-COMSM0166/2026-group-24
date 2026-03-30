// src/data/EventTable.js
// 事件表管理 - 集中所有事件定义与事件处理逻辑
// 注意：地块生成相关逻辑（概率表、createContent、getDedupeKey）已迁移至 MapGenerator

import {
  TileContentType,
  makeDungeon, makeBoss, makeTreasure,
  makeAltar, makeLighthouse, makeNPC,
  makeVillage, makeMerchant, makeRuin, makeCorruptedDeer, makeInjuredVillager
} from '../world/Tile.js';
import { GameState } from '../core/Constants.js';
import { rollSpeed } from '../core/Dice.js';
import { rollRandomItem, rollRandomLoot, rollGoldDrop, rollShopInventory } from './items.js'; // ★ 新增 rollRandomLoot ★

// ── 静态配置列表 ────────────────────────────────────────────────────

// 集中管理所有 NPC 配置
export const NPC_LIST = [
  {
    map: 'main',
    q: -8,
    r: 7,
    name: 'INJURED VILLAGER',
    dialogue: ' Please help me……The forest has changed……the trees are bleeding……Monsters are crawling out of the ground.\nPlease take me to the village in the north.',
    iconType: 'redCircle'
  }
  // 后续可继续添加更多 NPC
];

// 集中管理所有村庄配置
export const VILLAGE_LIST = [
  {
    map: 'main',
    q: -6,
    r: 2,
    name: 'FOREST VILLAGE'
  }
  // 后续可继续添加更多村庄
];

// 集中管理所有商人配置
export const MERCHANT_LIST = [
  {
    map: 'main',
    q: -2,
    r: -5,
    name: 'TRAVELING MERCHANT'
  },
  {
    map: 'main',
    q: 4,
    r: 0,
    name: 'WANDERING MERCHANT'
  }
  // 后续可继续添加更多商人
];

// 集中管理所有遗迹配置
export const RUIN_LIST = [
  {
    map: 'main',
    q: 6,
    r: 1,
    name: 'ANCIENT RUINS ENTRANCE',
    enemyName: 'CORRUPTED GUARD',
    description: 'A massive stone gate stands in the forest.\n\nAncient runes are carved into the door.\n\nSuddenly, a corrupted figure emerges from the shadows...',
    postCombatMessage: 'You catch your breath, the old ruins return to silence.\n\nPerhaps heading east will lead to new discoveries.'
  },
  {
    map: 'main',
    q: 5,
    r: -6,
    name: 'ABYSSAL RUINS',
    enemyName: 'ABYSSAL GUARDIAN',
    description: 'Moss-covered stone steps descend into the depths.\n\nThe damp air carries a musty scent, as if this place has been dormant for centuries.\n\nRunes on the walls faintly glow, responding to your approach.\n\nIn the darkness, a pair of eyes slowly opens...',
    postCombatMessage: 'The enemy\'s body slowly collapses, and the ruins return to silence.\n\nYou search the surroundings briefly but find no additional entrances.\n\nAs you prepare to leave, you notice——\nA trail of fresh footprints seems to lead south.\n\nPerhaps the true treasure awaits you in the south.'
  }
  // 后续可继续添加更多遗迹
];

// 集中管理所有被腐化的鹿配置
export const CORRUPTED_DEER_LIST = [
  {
    map: 'main',
    q: 7,
    r: -7,
    name: 'CORRUPTED DEER'
  },
  {
    map: 'main',
    q: -5,
    r: -2,
    name: 'CORRUPTED DEER'
  }
  // 后续可继续添加更多被腐化的鹿


];

// 新手村固定事件列表
export const NOVICE_DUNGEON_LIST = [
  { q: 1, r: -2, name: '迷途哥布林', level: 1, difficulty: 'EASY' },
];

export const NOVICE_TREASURE_LIST = [
  { q: -2, r: 1, lootTier: 1 },
];

export const NOVICE_ALTAR_LIST = [
  { q: 2, r: 1 },
];
export const NOVICE_SHOP_LIST = [
  { q: 0, r: 2 },
];

export const MAIN_SHOP_LIST = [
  { map: 'main', q: -3, r: 3 },
  { map: 'main', q: 5,  r: -3 },
];
// ── EventTable 类 ───────────────────────────────────────────────────

export class EventTable {

  // ── 事件类型定义 ─────────────────────────────────────────────────
  static EVENTS = {
    TRAP: {
      id: 'trap',
      title: '🪤 Trap',
      spawnChance: 0.15,
      description: 'You triggered a trap! Ready to roll...',
      handler: 'handleTrap'
    },
    DUNGEON: {
      id: 'dungeon',
      title: '⚔️ Enemy',
      spawnChance: 0,
      description: 'Found enemy, engage?',
      tileContentType: TileContentType.DUNGEON,
      handler: 'handleCombat'
    },
    BOSS: {
      id: 'boss',
      title: '⚠️ Boss',
      spawnChance: 0,
      description: 'Found boss, engage?',
      tileContentType: TileContentType.BOSS,
      handler: 'handleCombat'
    },
    TREASURE: {
      id: 'treasure',
      title: '🎁 Treasure',
      spawnChance: 0,
      description: 'Found treasure, open it?',
      tileContentType: TileContentType.TREASURE,
      handler: 'handleTreasure'
    },
    ALTAR: {
      id: 'altar',
      title: '🔮 Altar',
      spawnChance: 0,
      description: 'Pray?',
      tileContentType: TileContentType.ALTAR,
      handler: 'handleAltar'
    },
    LIGHTHOUSE: {
      id: 'lighthouse',
      title: '🗼 Lighthouse',
      spawnChance: 0,
      description: 'Look into the distance',
      tileContentType: TileContentType.LIGHTHOUSE,
      handler: 'handleLighthouse'
    },
    PORTAL: {
      id: 'portal',
      title: '🌀 Teleportation array',
      spawnChance: 0,
      description: 'Teleport?',
      tileContentType: TileContentType.PORTAL,
      handler: 'handlePortal'
    },
    VILLAGE: {
      id: 'village',
      title: '🏘️ Village',
      spawnChance: 0,
      description: 'Welcome to the village.',
      tileContentType: 'village',
      handler: 'handleVillage'
    },
    NPC: {
      id: 'npc',
      title: '👤 Village NPC',
      spawnChance: 0,
      description: 'Talk to the villager',
      tileContentType: TileContentType.NPC,
      handler: 'handleNPC'
    }
  };

  // ── 概率查询（保留供外部兼容访问，实际生成已移至 MapGenerator）──
  /**
   * 获取陷阱生成概率
   * @returns {number} 概率 (0-1)
   */
  static getTrapSpawnChance() {
    return this.EVENTS.TRAP.spawnChance;
  }

  // ── 事件处理：陷阱 ───────────────────────────────────────────────

  /**
   * 处理陷阱事件
   * @param {Object} gameController
   */
  static handleTrap(gameController) {
    gameController.ui.showEvent(
      this.EVENTS.TRAP.title,
      this.EVENTS.TRAP.description,
      [{
        text: '🎲 Roll',
        onClick: () => gameController._executeTrapRoll()
      }]
    );
  }

  /**
   * 处理陷阱掷骰结果
   * @param {Object} gameController
   * @param {number} rollValue  掷骰结果 (1-6)
   */
  static handleTrapResult(gameController, rollValue) {
    gameController.ui.showEvent(
      '🎲 Roll Result',
      `You rolled a ${rollValue}!`,
      [{
        text: 'Continue',
        onClick: () => {
          if (rollValue <= 3) {
            this.handleTrapDamage(gameController);
          } else {
            gameController.ui.showEvent('✨ Evaded', 'You dodged the trap!', [{ text: 'Continue', onClick: () => { } }]);
          }
        }
      }]
    );
  }

  /**
   * 处理陷阱伤害
   * @param {Object} gameController
   */
  static handleTrapDamage(gameController) {
    let totalDmg = 0;
    for (const hero of gameController.selectedHeroes) {
      const dmg = Math.floor(hero.maxHp * 0.15);
      hero.hp = Math.max(0, hero.hp - dmg);
      totalDmg += dmg;
    }
    gameController.ui.updatePartyStatus(gameController.selectedHeroes);
    gameController.ui.showEvent('💥 Trap Sprung', `All heroes took damage!\nTotal damage: ${totalDmg} HP`, [{ text: 'OK' }]);
  }

  // ── 事件处理：战斗 ───────────────────────────────────────────────

  /**
   * 处理战斗事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleCombat(gameController, tile, content) {
    const isBoss = content.type === TileContentType.BOSS;
    gameController.ui.showEvent(
      isBoss ? this.EVENTS.BOSS.title : this.EVENTS.DUNGEON.title,
      `Found ${content.name}, engage?`,
      [
        {
          text: '⚔️ Fight',
          onClick: () => {
            tile.content = null;
            gameController.fsm.transition(GameState.COMBAT, content);
          }
        },
        {
          text: '🏃 Retreat',
          onClick: () => {
            gameController.player.movementPoints = 0;
            gameController.ui.updateMovementUI(0);
          }
        }
      ]
    );
  }

  // ── 事件处理：宝藏 ───────────────────────────────────────────────

  /**
   * 处理宝藏事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleTreasure(gameController, tile, content) {
    gameController.ui.showEvent(
      this.EVENTS.TREASURE.title,
      `Found ${content.name}, open it?`,
      [{
        text: '🎁 Open',
        onClick: () => {
          tile.content = null;

          let loot = rollRandomLoot();
          if (content.lootTier === 3) {
            let attempts = 0;
            while (loot.rarity !== 'epic' && attempts < 30) { loot = rollRandomLoot(); attempts++; }
          } else if (content.lootTier === 2) {
            let attempts = 0;
            while (loot.rarity === 'common' && attempts < 30) { loot = rollRandomLoot(); attempts++; }
          }

          const goldGained = rollGoldDrop(loot?.rarity ?? 'common');
          gameController.gold = (gameController.gold ?? 0) + goldGained;
          gameController.ui.updateGold?.(gameController.gold);

          gameController.ui.showChestReward(loot, () => {
            gameController.ui.showLootAssign(loot, gameController.selectedHeroes, ({ heroIndex, action }) => {
              const hero = gameController.selectedHeroes?.[heroIndex];
              if (hero) {
                if (action === 'put') {
                  gameController.ui.inventoryUI.addToStorage(loot);
                } else if (action === 'equip') {
                  const isWeapon = Array.isArray(loot.skills) && loot.skills.length > 0;
                  if (isWeapon) {
                    const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                    if (emptySlot !== -1) {
                      hero.weaponSlots[emptySlot] = loot;
                    } else {
                      const kicked = hero.weaponSlots[0];
                      hero.weaponSlots[0] = loot;
                      gameController.ui.inventoryUI.addToStorage(kicked);
                    }
                  } else {
                    hero.equip?.(loot, 0);
                  }
                  hero.refreshDerivedStats?.();
                }
                gameController.ui.updatePartyStatus(gameController.selectedHeroes);
              }
            });
          });
        }
        }]
    );
  }

  // ── 事件处理：祭坛 ───────────────────────────────────────────────

  /**
   * 处理祭坛事件
   * @param {Object} gameController
   * @param {Object} tile
   */
  static handleAltar(gameController, tile) {
    gameController.ui.showEvent(
      this.EVENTS.ALTAR.title,
      this.EVENTS.ALTAR.description,
      [
        {
          text: '🙏 Pray',
          onClick: () => {
            tile.content = null;
            this.applyAltarHealing(gameController);
          }
        },
        {
          text: '🚶 Leave',
          onClick: () => { }
        }
      ]
    );
  }

  /**
   * 应用祭坛治疗
   * @param {Object} gameController
   */
  static applyAltarHealing(gameController) {
    let totalHeal = 0;
    for (const hero of gameController.selectedHeroes) {
      const heal = Math.floor(hero.maxHp * 0.3);
      hero.hp = Math.min(hero.maxHp, hero.hp + heal);
      totalHeal += heal;
    }
    gameController.ui.updatePartyStatus(gameController.selectedHeroes);
    gameController.ui.showEvent('✨ Divine Light', `All heroes were healed by the divine light!\nTotal healing: ${totalHeal} HP`, [{ text: 'Continue', onClick: () => { } }]);
  }

  // ── 事件处理：灯塔 ───────────────────────────────────────────────

  /**
   * 处理灯塔事件
   * @param {Object} gameController
   * @param {Object} tile
   */
  static handleLighthouse(gameController, tile) {
    gameController.ui.showEvent(
      this.EVENTS.LIGHTHOUSE.title,
      this.EVENTS.LIGHTHOUSE.description,
      [
        { text: 'NE', onClick: () => { tile.content = null; gameController._revealDirection(1, -1); } },
        { text: 'SE', onClick: () => { tile.content = null; gameController._revealDirection(1, 1); } },
        { text: 'SW', onClick: () => { tile.content = null; gameController._revealDirection(-1, 1); } },
        { text: 'NW', onClick: () => { tile.content = null; gameController._revealDirection(-1, -1); } }
      ]
    );
  }

  // ── 事件处理：传送阵 ─────────────────────────────────────────────

  /**
   * 处理传送阵事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handlePortal(gameController, tile, content) {
    gameController.ui.showEvent(
      this.EVENTS.PORTAL.title,
      `Do you want to teleport to ${content.targetMap}?`,
      [
        {
          text: `Teleport to ${content.targetMap}`,
          onClick: () => {
            tile.content = content;
            gameController._switchMap(content.targetMap, content.targetQ, content.targetR);
          }
        },
        {
          text: 'Cancel',
          onClick: () => { }
        }
      ]
    );
  }

  // ── 事件处理：NPC ────────────────────────────────────────────────

  /**
   * 处理 NPC 事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleNPC(gameController, tile, content) {
    gameController.ui.showEvent(
      `👤 ${content.name}`,
      content.dialogue || 'Hello traveler!',
      [{ text: 'Continue', onClick: () => { } }]
    );
  }

  // ── 事件处理：村庄 ───────────────────────────────────────────────

  /**
   * 处理村庄事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleVillage(gameController, tile, content) {
    gameController.ui.showEvent(
      '🏘️ Village',
      'Welcome to the village.',
      [
        {
          text: 'Trade',
          onClick: () => {
            gameController.ui.showEvent(
              'Trade',
              '(Trading interface can be implemented here)',
              [{ text: 'Back', onClick: () => EventTable.handleVillage(gameController, tile, content) }]
            );
          }
        },
        {
          text: 'Quests',
          onClick: () => {
            gameController.ui.showEvent(
              '📋 Quests',
              'Rescue the Caravan\n\nThe village chief urgently tells you:\n"Adventurer, you came just in time."\n"A caravan passing through here, their guards are held up by monsters in the northeast direction of the village."\n"If they die, we will completely lose our supplies."',
              [
                {
                  text: 'Accept',
                  onClick: () => {
                    gameController._startMission('Rescue the Caravan', 5);
                    gameController.ui.showEvent(
                      '✓ Quest Accepted',
                      'You have accepted the quest [Rescue the Caravan]\nPlease head to the northeast direction of the village to rescue the caravan guards.\n\nTurn limit: 5',
                      [{ text: 'Back', onClick: () => EventTable.handleVillage(gameController, tile, content) }]
                    );
                  }
                },
                {
                  text: 'Back',
                  onClick: () => EventTable.handleVillage(gameController, tile, content)
                }
              ]
            );
          }
        },
        {
          text: 'Rest',
          onClick: () => {
            const hero = gameController.selectedHeroes[0] || gameController.player;
            const heal = Math.floor(hero.maxHp * 0.2);
            hero.hp = Math.min(hero.maxHp, hero.hp + heal);
            gameController.ui.updatePartyStatus(gameController.selectedHeroes);
            gameController.ui.showEvent(
              'Rest',
              `You rested for a while and recovered ${heal} HP.`,
              [{ text: 'Back', onClick: () => EventTable.handleVillage(gameController, tile, content) }]
            );
          }
        },
        {
          text: 'Leave',
          onClick: () => { }
        }
      ]
    );
  }

  // ── 事件处理：商人 ───────────────────────────────────────────────

  /**
   * 处理商人事件 - 多步骤对话
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleMerchant(gameController, tile, content) {
    const merchant = content.name || 'Traveling Merchant';

    // 再次遇到商人：交易模式
    if (gameController.merchantEncountered) {
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"Haven\'t found the treasure yet?"\n\n"If you come back alive, I\'ll buy any ancient relics at a high price."',
        [
          {
            text: 'Trade',
            onClick: () => {
              gameController.ui.showEvent(
                `👤 ${merchant}`,
                '(Trading interface can be implemented here)',
                [{ text: 'Leave', onClick: () => { } }]
              );
            }
          },
          {
            text: 'Leave',
            onClick: () => { }
          }
        ]
      );
      return;
    }

    // 第一次遇到商人：多步骤剧情对话
    const step1 = () => {
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"Oh! Thank the gods! You are the one who saved my guards?"\n\n"This forest has gone mad... the trees are rotting, and the animals have turned into monsters."\n\n"If it weren\'t for you, our goods would have been completely taken by those monsters."',
        [{ text: 'Continue', onClick: step2 }]
      );
    };

    const step2 = () => {
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"A few days ago, it wasn\'t like this."\n\n"But suddenly, a black mist began to appear deep in the forest."\n\n"All creatures near the Ancient Ruins have been corrupted."',
        [{ text: 'Continue', onClick: step3 }]
      );
    };

    const step3 = () => {
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"However... there is something you might be interested in."\n\n"Deep within the ruins, it is said that an ancient treasure is buried."\n\n"Many adventurers have come for it."\n\n"But few have returned alive."',
        [{ text: 'Continue', onClick: step4 }]
      );
    };

    const step4 = () => {
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"If you really want to find that treasure..."\n\n"It\'s probably to the east."\n\n"You will see an entrance to the ruins covered in vines."\n\n"That is the source of all trouble."',
        [{ text: 'Continue', onClick: step5 }]
      );
    };

    const step5 = () => {
      gameController.merchantEncountered = true;
      gameController.ui.showEvent(
        `👤 ${merchant}`,
        '"Here, take these as a token of my gratitude."\n\n(The merchant hands you a bag)\n\n📢 Tip: Next time you encounter the merchant, you can trade.',
        [{ text: 'Leave', onClick: () => { gameController._startMission('🎯 Search ruins', 10); } }]
      );
    };

    step1();
  }

static async handleShop(gameController, tile, content) {
  const { ShopUI } = await import('../ui/ShopUI.js');
  const { rollShopInventory } = await import('./items.js');
  const inventory = rollShopInventory(3);
  ShopUI.show(
    inventory,
    gameController.gold ?? 0,
    (item) => {
      gameController.gold = (gameController.gold ?? 0) - item._shopPrice;
      gameController.ui.updateGold?.(gameController.gold);
      gameController.ui.inventoryUI.addToStorage(item);
      gameController.ui.updatePartyStatus(gameController.selectedHeroes);
    },
    () => {}
  );
}

  // ── 事件处理：遗迹 ───────────────────────────────────────────────

  /**
   * 处理遗迹事件 - 古代遗迹入口
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleRuin(gameController, tile, content) {
    const ruinName = content.name || 'Ancient Ruins Entrance';
    const enemyName = content.enemyName || 'Corrupted Guardian';
    const description = content.description || 'A massive stone gate stands in the forest.\n\nAncient runes are carved on the gate.\n\nSuddenly, a corrupted figure emerges from the shadows...';
    const postCombatMessage = content.postCombatMessage;

    gameController.ui.showEvent(
      `📍 ${ruinName}`,
      description,
      [
        {
          text: '⚔️ Combat',
          onClick: () => {
            tile.content = null;
            const bossContent = makeBoss(enemyName, 3, 'HARD');
            // 保存战斗后的对话
            bossContent.postCombatMessage = postCombatMessage;
            gameController.fsm.transition(GameState.COMBAT, bossContent);
          }
        },
        {
          text: '🏃 Retreat',
          onClick: () => {
            gameController.player.movementPoints = 0;
            gameController.ui.updateMovementUI(0);
          }
        }
      ]
    );
  }

  // ── 事件处理：被腐化的鹿 ─────────────────────────────────────────

  /**
   * 处理被腐化的鹿事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleCorruptedDeer(gameController, tile, content) {
    const deerName = content.name || 'Corrupted Deer';

    gameController.ui.showEvent(
      '📍 Forest',
      'A massive deer stands in the forest.\n\nIts body is entwined with black vines.\n\nIt looks in pain, with a glimmer of rationality in its eyes...',
      [
        {
          text: '⚔️ Attack',
          onClick: () => {
            tile.content = null;
            const combatContent = makeBoss(deerName, 2, 'NORMAL');
            combatContent.isRareReward = true;
            gameController.fsm.transition(GameState.COMBAT, combatContent);
          }
        },
        {
          text: '🚶 Spare it',
          onClick: () => {
            gameController.ui.showEvent(
              '📍 Forest',
              'You lower your weapon.\n\nThe deer seems to understand your intention and turns to flee into the depths of the forest.\n\nThis event has ended.',
              [{ text: 'Continue', onClick: () => { } }]
            );
          }
        }
      ]
    );
  }
}