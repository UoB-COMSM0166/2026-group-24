// src/data/EventTable.js
// 事件表管理 - 集中所有事件定义与事件处理逻辑
// 注意：地块生成相关逻辑（概率表、createContent、getDedupeKey）已迁移至 MapGenerator

import {
  TileType, TileContentType,
  makeDungeon, makeBoss, makeTreasure,
  makeAltar, makeLighthouse, makeNPC,
  makeVillage, makeMerchant, makeRuin, makeCorruptedDeer, makeInjuredVillager
} from '../world/Tile.js';
import { PROGRESS_BAR_TEXTS } from '../core/TurnManager.js';
import { GameState } from '../core/Constants.js';
import { rollSpeed } from '../core/Dice.js';
import { rollRandomItem, rollRandomLoot, rollGoldDrop, rollShopInventory } from './items.js';// ★ 新增 rollRandomLoot ★
import { ShopUI } from '../ui/ShopUI.js';

// ── 解锁链配置 ────────────────────────────────────────────────────
// 🎮 定义事件解锁的线性链
export const UNLOCK_CHAIN = [
  { q: -8, r: 7, name: 'INJURED VILLAGER', type: 'npc', unlocksNext: true },
  { q: -6, r: 2, name: 'FOREST VILLAGE', type: 'village', unlocksNext: true },
  { q: -2, r: -5, name: 'TRAVELING MERCHANT', type: 'merchant', unlocksNext: true },
  { q: 5, r: -6, name: 'ABYSSAL RUINS', type: 'ruin', unlocksNext: true },
  { q: 6, r: 0, name: 'ANCIENT PLAZA', type: 'ruin', unlocksNext: true },
  { q: 6, r: 1, name: 'ANCIENT RUINS ENTRANCE', type: 'ruin', unlocksNext: false },
];

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
    monsterType: 'dark_overlord',  // 🎮 Boss: Dark Overlord
    enemyName: 'CORFUS',
    contentImageType: 'boss',  // 🎮 使用 boss 贴图显示
    isEndGame: true,  // 🎮 故事对话后需要返回主界面
    description: 'A massive stone gate stands in the forest.\n\nAncient runes carved into the door pulse with dark energy.\n\nSuddenly, a legendary knight emerges from the shadows, his armor gleaming menacingly...',
    postCombatMessage: {
      type: 'storyDialogue',
      scenes: [
        {
          image: './resource/img/map/chapter1/end1.png',
          lines: [
            'As the massive creature collapses to the ground,',
            'the core of the Dark Tree begins to shatter.',
            'Fragments of dark energy scatter into the air,',
            'and the corrupted land slowly begins to recover its life.'
          ]
        },
        {
          image: './resource/img/map/chapter1/end2.png',
          lines: [
            'After the Dark Tree finally falls,',
            'beneath its withered roots,',
            'you discover a long-buried treasure.',
            'Shimmering gold coins and precious relics',
            'await the one who has claimed victory.'
          ]
        }
      ]
    }
  },
  {
    map: 'main',
    q: 5,
    r: -6,
    name: 'ABYSSAL RUINS',
    monsterType: 'stone_golem',  // 🎮 Elite: Stone Golem
    enemyName: 'STONE GOLEM',
    description: 'Moss-covered stone steps descend into the depths.\n\nThe damp air carries a musty scent, as if this place has been dormant for centuries.\n\nRunes on the walls faintly glow, responding to your approach.\n\nA massive stone figure slowly rises from the ground, ancient magic crackling around it...',
    postCombatMessage: 'The stone golem crumbles to dust, its ancient magic finally exhausted.\n\nYou search the surroundings briefly but find no additional entrances.\n\nAs you prepare to leave, you notice——\nA trail of fresh footprints seems to lead south.\n\nPerhaps the true treasure awaits you in the south.'
  },
  {
    map: 'main',
    q: 6,
    r: 0,
    name: 'ANCIENT PLAZA',
    monsterType: 'swift_assassin',  // 🎮 Elite: Swift Assassin
    enemyName: 'SWIFT ASSASSIN',
    description: 'An ancient plaza lies before the ruined relic.\n\nCracked stone tiles and broken pillars surround the silent square.\n\nSuddenly, a shadow flickers, and a swift figure appears—ready to strike...',
    postCombatMessage: 'The assassin falls, their swift form finally stilled.\n\nThe plaza falls silent once more, the ancient stones beginning to glow with a faint blue light.'
  }
  // 后续可继续添加更多遗迹
];

// 集中管理所有被腐化的鹿配置
export const CORRUPTED_DEER_LIST = [
  {
    map: 'main',
    q: 7,
    r: -7,
    name: 'CORRUPTED DEER',
    monsterType: 'elite'  // ← Orc Elite
  },
  {
    map: 'main',
    q: -5,
    r: -2,
    name: 'CORRUPTED DEER',
    monsterType: 'elite'  // ← Orc Elite
  }
  // 后续可继续添加更多被腐化的鹿


];

// 新手村固定事件列表
export const NOVICE_DUNGEON_LIST = [
  { q: 1, r: -2, name: 'Lost Goblin', level: 1, difficulty: 'EASY' },
];

export const NOVICE_TREASURE_LIST = [
  { q: -2, r: 1, lootTier: 1 },
];

export const NOVICE_ALTAR_LIST = [
  { q: 2, r: 1 },
];

export const NOVICE_SHOP_LIST = [
  { q: 0, r: 2, name: 'shop' },
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

  // ── 解锁机制 ─────────────────────────────────────────────────────
  /**
   * 处理链式解锁 - 当玩家进入某个事件时，解锁下一个被锁定的事件
   * @param {Object} gameController
   * @param {number} currentQ
   * @param {number} currentR
   */
  static handleUnlockChain(gameController, currentQ, currentR) {
    // 找到当前事件在解锁链中的位置
    const currentIndex = UNLOCK_CHAIN.findIndex(e => e.q === currentQ && e.r === currentR);
    
    console.log(`🎮 handleUnlockChain 调用: (${currentQ}, ${currentR}), 索引: ${currentIndex}`);
    
    if (currentIndex === -1 || !UNLOCK_CHAIN[currentIndex].unlocksNext) {
      console.log(`❌ 当前事件不在解锁链中或不会解锁下一个`);
      return;  // 当前事件不在解锁链中，或者不会解锁下一个
    }
    
    // 获取下一个要解锁的事件
    const nextEvent = UNLOCK_CHAIN[currentIndex + 1];
    if (!nextEvent) {
      console.log(`❌ 已经到达链的末尾`);
      return;  // 已经到达链的末尾
    }
    
    console.log(`🎮 解锁事件：(${nextEvent.q}, ${nextEvent.r}) - ${nextEvent.name} (${nextEvent.type})`);
    
    // 在地图上解锁该事件
    const targetMap = gameController.map;
    const tile = targetMap.getTile(nextEvent.q, nextEvent.r);
    
    console.log(`🎮 获取 Tile: ${tile ? '成功' : '失败'}`);
    
    if (tile) {
      // 🎮 恢复为草地（使其可通行）
      console.log(`🎮 改变 tile 类型为 GRASS (之前: ${tile.type?.id})`);
      tile.type = TileType.GRASS;
      tile.isFixedEvent = true;  // 🎮 标记为固定事件
      
      // 🎮 恢复事件内容
      let content = null;
      switch (nextEvent.type) {
        case 'npc':
          const npc = NPC_LIST.find(n => n.q === nextEvent.q && n.r === nextEvent.r);
          console.log(`🎮 寻找 NPC，结果: ${npc ? '找到' : '未找到'}`);
          if (npc) {
            // 🎮 使用 makeInjuredVillager 或 makeNPC 创建内容对象
            if (npc.name === 'INJURED VILLAGER') {
              content = makeInjuredVillager(npc.name, npc.dialogue);
            } else {
              content = makeNPC(npc.name, npc.dialogue, npc.options || {});
            }
            console.log(`🎮 创建 NPC 内容: ${JSON.stringify(content)}`);
          }
          break;
        case 'village':
          const village = VILLAGE_LIST.find(v => v.q === nextEvent.q && v.r === nextEvent.r);
          console.log(`🎮 寻找 Village，结果: ${village ? '找到' : '未找到'}`);
          if (village) {
            content = makeVillage(village.name);
            console.log(`🎮 创建 Village 内容: ${JSON.stringify(content)}`);
          }
          break;
        case 'merchant':
          const merchant = MERCHANT_LIST.find(m => m.q === nextEvent.q && m.r === nextEvent.r);
          console.log(`🎮 寻找 Merchant，结果: ${merchant ? '找到' : '未找到'}`);
          if (merchant) {
            content = makeMerchant(merchant.name);
            console.log(`🎮 创建 Merchant 内容: ${JSON.stringify(content)}`);
          }
          break;
        case 'ruin':
          const ruin = RUIN_LIST.find(r => r.q === nextEvent.q && r.r === nextEvent.r);
          console.log(`🎮 寻找 Ruin，结果: ${ruin ? '找到' : '未找到'}`);
          if (ruin) {
            content = makeRuin(ruin.name, ruin.enemyName);
            content.description = ruin.description;
            content.postCombatMessage = ruin.postCombatMessage;
            content.monsterType = ruin.monsterType;
            if (ruin.contentImageType) content.contentImageType = ruin.contentImageType;
            if (ruin.isEndGame) content.isEndGame = ruin.isEndGame;
            console.log(`🎮 创建 Ruin 内容: ${JSON.stringify(content)}`);
          }
          break;
      }
      
      if (content) {
        console.log(`🎮 设置 tile 内容: ${JSON.stringify(content)}`);
        tile.content = content;
      } else {
        console.log(`❌ 内容为空，未能恢复事件`);
      }
      
      // 🎮 消除迷雾使其可见
      console.log(`🎮 设置 isRevealed = true, 调用 revealAround`);
      tile.isRevealed = true;
      targetMap.revealAround(nextEvent.q, nextEvent.r, 1);
      
      console.log(`✅ 解锁完成`);
    }
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
      ],
      { hint: '※ Retreating will consume all action points.' }
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
      [{ 
        text: 'Continue', 
        onClick: () => {
          // 🎮 触发解锁链
          EventTable.handleUnlockChain(gameController, tile.q, tile.r);
        } 
      }]
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
          text: 'Quests',
          onClick: () => {
            gameController.ui.showEvent(
              '📋 Quests',
              'Rescue the Caravan\n\nThe village chief urgently tells you:\n"Adventurer, you came just in time."\n"A caravan passing through here, their guards are held up by monsters in the northeast direction of the village."\n"If they die, we will completely lose our supplies."',
              [
                {
                  text: 'Accept',
                  onClick: () => {
                    // 切换到救援车队任务集（仅在非 Dev 模式下）
                    if (gameController.tutorial) {
                      gameController.tutorial.taskList.switchToMission('Rescue the Caravan');
                      gameController._startMission('Rescue the Caravan', 10);
                    }
                    // 🎮 点击 Accept 后解锁下一个事件
                    EventTable.handleUnlockChain(gameController, tile.q, tile.r);
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
          onClick: () => {
            // 村庄只有接受 Quests 才能解锁下一个事件
          }
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
            onClick: () => {
              // 🎮 触发解锁链
              EventTable.handleUnlockChain(gameController, tile.q, tile.r);
            }
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
        [{ text: 'Leave', onClick: () => { tile.content = null; gameController._startMission(PROGRESS_BAR_TEXTS.SEARCH_RUINS.replace(PROGRESS_BAR_TEXTS.MISSION_PREFIX, ''), 10); EventTable.handleUnlockChain(gameController, tile.q, tile.r); } }]
      );
    };

    step1();
  }


static handleShop(gameController, tile, content) {
  if (!tile._shopInventory) {
    tile._shopInventory = rollShopInventory();
  }
  const shopName = content.name || 'Shop';

  const healOption = {
    name: 'Divine Blessing',
    desc: 'Restore 30% HP to all heroes.',
    rarity: 'common',
    icon: 'potion',
    _shopPrice: 30,
    _isHeal: true,
  };

  const refreshOption = {
    name: 'Refresh Stock',
    desc: 'Reroll all items in the shop.',
    rarity: 'common',
    icon: 'clover',
    _shopPrice: 80,
    _isRefresh: true,
  };

  const openShop = () => {
    const fullInventory = [...tile._shopInventory, healOption, refreshOption];
    ShopUI.show(
      shopName,
      fullInventory,
      gameController.gold ?? 0,
      (item) => {
        if (item._isRefresh) {
          tile._shopInventory = rollShopInventory();
          gameController.gold = (gameController.gold ?? 0) - item._shopPrice;
          gameController.ui.updateGold?.(gameController.gold);
          setTimeout(() => openShop(), 200);
          return gameController.gold;
        }
        if (item._isHeal) {
          EventTable.applyAltarHealing(gameController);
        }
        gameController.gold = (gameController.gold ?? 0) - item._shopPrice;
        gameController.ui.updateGold?.(gameController.gold);
        if (!item._isHeal) {
          gameController.ui.inventoryUI.addToStorage({ ...item });
        }
        gameController.ui.updatePartyStatus(gameController.selectedHeroes);
        return gameController.gold;
      },
      () => {}
    );
  };

  const tutorial = window._gameController?.tutorial;
  if (tutorial && !tutorial._introducedEvents?.has('shop')) {
    tutorial._introducedEvents?.add('shop');
    tutorial._dialogue?.show(
      { name: 'Elder Guide', avatar: '🧙', lines: [
        'Oh! A shop! The most important supply stop on any adventure.',
        'Every shop stocks one random weapon and three items!',
        'Shops also offer Divine Blessing, which restores HP to your whole party for a small fee. Don\'t forget this option when things get dire!',
        'Each shop\'s inventory is fixed once you visit — but you can spend gold to refresh the stock. Different shops are stocked independently, so it\'s worth checking multiple ones!',
        'Gold is precious, so prioritize wisely — weapons directly boost combat power, while items can save your life at a critical moment.',
      ]},
      () => openShop()
    );
  } else {
    openShop();
  }
}


  // ── 事件处理：遗迹 ───────────────────────────────────────────────

  /**
   * 处理遗迹事件 - 古代遗迹入口
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleRuin(gameController, tile, content) {
    const ruinName = content.name || 'Ancient Ruins ';
    const enemyName = content.enemyName || 'Corrupted Guardian';
    const monsterType = content.monsterType;  // 🎮 Support specific monster types
    const description = content.description || 'You step into the heart of the ancient relic.\n\nBroken pillars and glowing runes surround the silent chamber.\n\nAt the enter, the core of the Dark Tree pulses with dark energy.\n\nSuddenly, the final corrupted guardian awakens...';
    const postCombatMessage = content.postCombatMessage;
    const isEndGame = content.isEndGame;  // 🎮 提取 isEndGame 标志

    gameController.ui.showEvent(
      `📍 ${ruinName}`,
      description,
      [
        {
          text: '⚔️ Combat',
          onClick: () => {
            tile.content = null;
            let combatContent;
            
            // 🎮 If monster type is specified, create targeted encounter
            if (monsterType === 'dark_overlord') {
              combatContent = makeDungeon(enemyName, 5, 'EXTREME');
              combatContent.enemyGroup = ['dark_overlord'];
            } else if (monsterType === 'stone_golem') {
              combatContent = makeDungeon(enemyName, 3, 'HARD');
              combatContent.enemyGroup = ['stone_golem'];
            } else if (monsterType === 'swift_assassin') {
              combatContent = makeDungeon(enemyName, 3, 'HARD');
              combatContent.enemyGroup = ['swift_assassin'];
            } else {
              combatContent = makeBoss(enemyName, 3, 'HARD');
            }
            
            // 保存战斗后的对话
            combatContent.postCombatMessage = postCombatMessage;
            if (isEndGame) {
              combatContent.isEndGame = isEndGame;  // 🎮 复制 isEndGame 标志
            }
            gameController.fsm.transition(GameState.COMBAT, combatContent);
          }
        },
        {
          text: '🏃 Retreat',
          onClick: () => {
            gameController.player.movementPoints = 0;
            gameController.ui.updateMovementUI(0);
            EventTable.handleUnlockChain(gameController, tile.q, tile.r);
          }
        }
      ]
    );
  }

  // ── 事件处理：古代遗迹前的广场 ─────────────────────────────────────────

  /**
   * 处理古代遗迹前的广场事件
   * @param {Object} gameController
   * @param {Object} tile
   * @param {Object} content
   */
  static handleAncientPlaza(gameController, tile, content) {
    const ruinName = content.name || 'Ancient Plaza';
    const enemyName = content.enemyName || 'Corrupted Guardian';
    const monsterType = content.monsterType;  // 🎮 Support specific monster types
    const description = content.description || 'An ancient plaza lies before the ruined relic.\n\nCracked stone tiles and broken pillars surround the silent square.\n\nSuddenly, a corrupted guardian rises from the center of the plaza...';
    const postCombatMessage = content.postCombatMessage;
    const isEndGame = content.isEndGame;  // 🎮 提取 isEndGame 标志

    gameController.ui.showEvent(
      `📍 ${ruinName}`,
      description,
      [
        {
          text: '⚔️ Combat',
          onClick: () => {
            tile.content = null;
            let combatContent;
            
            // 🎮 If monster type is specified, create targeted encounter
            if (monsterType === 'dark_overlord') {
              combatContent = makeDungeon(enemyName, 5, 'EXTREME');
              combatContent.enemyGroup = ['dark_overlord'];
            } else if (monsterType === 'stone_golem') {
              combatContent = makeDungeon(enemyName, 3, 'HARD');
              combatContent.enemyGroup = ['stone_golem'];
            } else if (monsterType === 'swift_assassin') {
              combatContent = makeDungeon(enemyName, 3, 'HARD');
              combatContent.enemyGroup = ['swift_assassin'];
            } else {
              combatContent = makeBoss(enemyName, 3, 'HARD');
            }
            
            combatContent.postCombatMessage = postCombatMessage;
            if (isEndGame) {
              combatContent.isEndGame = isEndGame;  // 🎮 复制 isEndGame 标志
            }
            gameController.fsm.transition(GameState.COMBAT, combatContent);
          }
        },
        {
          text: '🏃 Retreat',
          onClick: () => {
            gameController.player.movementPoints = 0;
            gameController.ui.updateMovementUI(0);
            EventTable.handleUnlockChain(gameController, tile.q, tile.r);
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
    const monsterType = content.monsterType;  // ← 获取怪物类型

    gameController.ui.showEvent(
      '📍 Forest',
      'A massive deer stands in the forest.\n\nIts body is entwined with black vines.\n\nIt looks in pain, with a glimmer of rationality in its eyes...',
      [
        {
          text: '⚔️ Attack',
          onClick: () => {
            tile.content = null;
            // ── 根据 monsterType 创建不同的敌人 ──
            let combatContent;
            if (monsterType === 'elite') {
              combatContent = { type: 'dungeon', enemyGroup: ['elite'], reward: 'RARE' };
            } else {
              combatContent = makeBoss(deerName, 2, 'NORMAL');
              combatContent.isRareReward = true;
            }
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