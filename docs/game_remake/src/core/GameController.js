// src/core/GameController.js
import { GameState, MapConfig, TurnConfig, MapPresets } from './Constants.js';
import { HexMap, createMapByPreset } from '../world/HexMap.js';
import { Tile, TileContentType, makePortal, hexToPixel, makeBoss, TileType, makeNPC, makeVillage, makeMerchant, makeRuin, makeCorruptedDeer, makeInjuredVillager } from '../world/Tile.js';
import { NPC_LIST, VILLAGE_LIST, MERCHANT_LIST, RUIN_LIST, CORRUPTED_DEER_LIST, UNLOCK_CHAIN, MAIN_DUNGEON_LIST } from '../data/EventTable.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';
import { rollSpeed } from './Dice.js';
import { Renderer } from '../rendering/Renderer.js';
import { rollRandomItem, rollRandomLoot, rollGoldDrop, ItemDB } from '../data/items.js';
import { GameStory } from './GameStory.js';
import { EventTable } from '../data/EventTable.js';
import { findPath, getReachableTiles } from '../utils/Pathfinder.js';
import { rollEncounter, ENEMY_TYPES } from '../data/EncounterTable.js';
import { TutorialManager } from './TutorialManager.js';
import { TurnManager, PROGRESS_BAR_TEXTS } from './TurnManager.js';
import { NOVICE_DUNGEON_LIST, NOVICE_TREASURE_LIST, NOVICE_ALTAR_LIST, NOVICE_SHOP_LIST, MAIN_SHOP_LIST } from '../data/EventTable.js';
import { makeDungeon, makeTreasure, makeAltar, makeShop } from '../world/Tile.js';
export class GameController {
  constructor(map, player, ui, camera) {
    this.map = map;
    this.noviceVillage = null;
    this.currentMapName = 'Novice Village';
    this.player = player;
    this.ui = ui;
    this.camera = camera;
    this.selectedHeroes = [];
    this.combatManager = null;
    this.currentBossContent = null;
    
    // ── 使用 TurnManager 集中管理回合条、任务栏、进度显示 ────────────────
    this.turnManager = new TurnManager(ui, TurnConfig.MAX_TURNS);
    
    this.trapCooldown = 0;
    this.bossModePenaltyActive = false;
    this.bossModePenaltyWarned = false;
    this.merchantEncountered = false;
    this.villageQuestAccepted = false;  // ── 追踪村庄任务是否已被接受 ──
    this.villageRestUsed = false;  // ── 追踪村庄Rest是否已被使用 ──
    this._isMoving = false;
    this.isDevMode = false;
    this.rangeHighlight = null;
    this.gold = 0;
    // ── 两步移动新增状态 ──────────────────────────────────────────
    this.pendingPath = null;      // A* 算出的待确认路径
    this.pendingTarget = null;    // 待确认目标格 {q, r}
    this.pathHighlight = null;    // 路径格 Set<"q,r">，供 Renderer 绘制
    // ─────────────────────────────────────────────────────────────
    // ── 固定事件触发跟踪：防止重复触发 ────────────────────────────────
    this.triggeredFixedEvents = new Set();  // 存储已触发过的固定事件坐标，格式："q,r"
    // ── 特殊事件怪物战斗跟踪 ──────────────────────────────────────────
    this.hasDefeatedSpecialEventMonster = false;  // 是否击败过特殊事件怪物
    // ─────────────────────────────────────────────────────────────
    this.gameStory = new GameStory(ui);
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 向后兼容性代理：保留原属性名称指向 TurnManager
  // ─────────────────────────────────────────────────────────────────────
  get turnCount() { return this.turnManager.turnCount; }
  set turnCount(val) { this.turnManager.setTurnCount(val); }
  
  get currentMaxTurns() { return this.turnManager.currentMaxTurns; }
  set currentMaxTurns(val) { this.turnManager.setMaxTurns(val); }
  
  get bossMode() { return this.turnManager.bossMode; }
  set bossMode(val) { this.turnManager.bossMode = val; }
  
  get currentMissionName() { return this.turnManager.currentMissionName; }
  set currentMissionName(val) { this.turnManager.currentMissionName = val; }

  _setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect((heroes, difficulty) => {
        this.selectedHeroes = heroes.map(d => this._createHeroFromData(d));
        // 开发者模式跳过剧情，直接进地图生成
        if (this.isDevMode) {
          this.fsm.transition(GameState.MAP_GENERATION);
        } else {
          this.fsm.transition(GameState.STORY);
        }
      }),
      exit: () => this.ui.hideCharacterSelect(),
    });

    this.fsm.addState(GameState.STORY, {
      enter: () => this.gameStory.showStory('INTRO', () => this.fsm.transition(GameState.MAP_GENERATION)),
      exit: () => this.gameStory.hideStory(),
    });

    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => this.ui.showMapGeneration(this.selectedHeroes, () => {
        // 主地图 & 新手村
        this.map = createMapByPreset('main');
        this.noviceVillage = createMapByPreset('novice');

        // 出生地坐标
        const mainQ = -MapPresets.main.radius + 1;
        const mainR = MapPresets.main.radius - 1;
        const noviceQ = -MapPresets.novice.radius + 1;
        const noviceR = MapPresets.novice.radius - 1;

        // ── 强制出生格为草地，防止随机地形导致无法行走 ──────────────
        const mainSpawnTile = this.map.getTile(mainQ, mainR);
        if (mainSpawnTile) mainSpawnTile.type = TileType.GRASS;
        const noviceSpawnTile = this.noviceVillage.getTile(noviceQ, noviceR);
        if (noviceSpawnTile) noviceSpawnTile.type = TileType.GRASS;

        // ── 强制所有固定事件坐标为草地，防止被山脉/森林挤占 ─────────────
        const ensureGrass = (map, items) => {
          items?.forEach(item => {
            const targetMap = item.map === 'main' ? this.map : this.noviceVillage;
            const tile = targetMap.getTile(item.q, item.r);
            if (tile && tile.type !== TileType.GRASS) tile.type = TileType.GRASS;
          });
        };
        ensureGrass(this.map, NPC_LIST);
        ensureGrass(this.map, VILLAGE_LIST);
        ensureGrass(this.map, MERCHANT_LIST);
        ensureGrass(this.map, RUIN_LIST);
        ensureGrass(this.map, CORRUPTED_DEER_LIST);

        // 主地图传送阵指向新手村
        this.map.placeContent(mainQ, mainR, makePortal('Novice Village', noviceQ, noviceR), 0);
        // 新手村开局传送阵已删除，任务完成后会动态创建

        // 批量放置 NPC
        for (const npc of NPC_LIST) {
          const targetMap = npc.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(npc.q, npc.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件，这样 placeContent 中的 revealAround 不会揭示它
            let content;
            if (npc.name === 'INJURED VILLAGER') {
              content = makeInjuredVillager(npc.name, npc.dialogue);
            } else {
              content = makeNPC(npc.name, npc.dialogue, npc.options || {});
            }
            // 🎮 强制覆盖已有的随机事件
            tile.content = content;
            // ── 启用闪烁效果 ────────────────────────────────────────
            tile.isBlinking = true;
            tile.blinkStartTime = performance.now();
          }
        }

        // 批量放置村庄
        for (const village of VILLAGE_LIST) {
          const targetMap = village.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(village.q, village.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            // 🎮 强制覆盖已有的随机事件
            tile.content = makeVillage(village.name);
            // ── 启用闪烁效果 ────────────────────────────────────────
            tile.isBlinking = true;
            tile.blinkStartTime = performance.now();
          }
        }

        // 批量放置商人
        for (const merchant of MERCHANT_LIST) {
          const targetMap = merchant.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(merchant.q, merchant.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            // 🎮 强制覆盖已有的随机事件
            tile.content = makeMerchant(merchant.name);
            // ── 启用闪烁效果 ────────────────────────────────────────
            tile.isBlinking = true;
            tile.blinkStartTime = performance.now();
          }
        }

        // 批量放置遗迹
        for (const ruin of RUIN_LIST) {
          const targetMap = ruin.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(ruin.q, ruin.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            const content = makeRuin(ruin.name, ruin.enemyName);
            content.description = ruin.description;
            content.postCombatMessage = ruin.postCombatMessage;
            content.monsterType = ruin.monsterType;  // 🎮 Copy monster type for specific encounters
            if (ruin.contentImageType) {
              content.contentImageType = ruin.contentImageType;  // 🎮 自定义贴图类型
            }
            if (ruin.isEndGame) {
              content.isEndGame = ruin.isEndGame;  // 🎮 标记为结局事件
            }
            // 🎮 强制覆盖已有的随机事件
            tile.content = content;  // 直接覆盖，而不是用 placeContent
            // ── 启用闪烁效果 ────────────────────────────────────────
            tile.isBlinking = true;
            tile.blinkStartTime = performance.now();
          }
        }

        // 批量放置被腐化的鹿
        for (const deer of CORRUPTED_DEER_LIST) {
          const targetMap = deer.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(deer.q, deer.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            // 🎮 强制覆盖已有的随机事件
            tile.content = makeCorruptedDeer(deer.name, deer.monsterType);
            // ── 腐化鹿事件不闪烁 ────────────────────────────────────
          }
        }

        // 批量放置主世界地牢（确保地牢数量不少于10个）
        for (const dungeon of MAIN_DUNGEON_LIST) {
          const tile = this.map.getTile(dungeon.q, dungeon.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            // 🎮 强制覆盖已有的随机事件
            tile.content = makeDungeon(dungeon.name, dungeon.level, dungeon.difficulty);
            // ── 地牢事件不闪烁 ────────────────────────────────────
          }
        }

        // 🎮 锁定解锁链中的格子（除了第一个） - 在所有内容放置后进行此操作
        for (let i = 1; i < UNLOCK_CHAIN.length; i++) {
          const event = UNLOCK_CHAIN[i];
          const tile = this.map.getTile(event.q, event.r);
          if (tile) {
            // 改为山脉，使其无法到达
            tile.type = TileType.MOUNTAIN;
            tile.content = null;  // 清除事件内容
            console.log(`🎮 锁定事件格子 (${event.q}, ${event.r}) - ${event.name}`);
          }
        }

        // 玩家出生位置：dev 模式直接生成在主世界，否则在新手村
        if (this.isDevMode) {
          this.currentMapName = 'Main Map';
          this.player.setGridPos(mainQ, mainR, this.map);
          // Dev 模式：全屏视野
          this.map.revealAround(mainQ, mainR, 100);
        } else {
          this.currentMapName = 'Novice Village';
          this.player.setGridPos(noviceQ, noviceR, this.noviceVillage);
          this.noviceVillage.revealAround(noviceQ, noviceR, 5);
        }

        // ── Place Novice Village Dungeons ──────────────────────────────────
        for (const ev of NOVICE_DUNGEON_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            tile.isFixedEvent = true;  // Mark as fixed event to keep fog of war until explored
            this.noviceVillage.placeContent(ev.q, ev.r, makeDungeon(ev.name, ev.level, ev.difficulty), 0);
            // ── 新手村事件不闪烁 ────────────────────────────────────
          }
        }
        // ── Place Novice Village Treasures ──────────────────────────────────
        for (const ev of NOVICE_TREASURE_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            tile.isFixedEvent = true;  // Mark as fixed event to keep fog of war until explored
            this.noviceVillage.placeContent(ev.q, ev.r, makeTreasure(ev.lootTier), 0);
            // ── 新手村事件不闪烁 ────────────────────────────────────
          }
        }
        // ── Place Novice Village Altars ──────────────────────────────────
        for (const ev of NOVICE_ALTAR_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            tile.isFixedEvent = true;  // Mark as fixed event to keep fog of war until explored
            this.noviceVillage.placeContent(ev.q, ev.r, makeAltar(), 0);
            // ── 新手村事件不闪烁 ────────────────────────────────────
          }
        }
        // ── Place Novice Village Shops ──────────────────────────────────
        for (const ev of NOVICE_SHOP_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            tile.isFixedEvent = true;  // Mark as fixed event to keep fog of war until explored
            this.noviceVillage.placeContent(ev.q, ev.r, makeShop(), 0);
            // ── 新手村事件不闪烁 ────────────────────────────────────
          }
        }
        // ── Place Main Map Shops ──────────────────────────────────
        for (const ev of MAIN_SHOP_LIST) {
          const tile = this.map.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            tile.isFixedEvent = true;  // Mark as fixed event to keep fog of war (only works when approaching the shop)
            this.map.placeContent(ev.q, ev.r, makeShop(), 0);
            // ── 主地图商店事件不闪烁 ────────────────────────────────────────
          }
        }

        // ── 启动教程系统 ────────────────────────────────────────
        if (!this.isDevMode) {
          this.tutorial = new TutorialManager(this);
        }
        if (this.isDevMode) this._populateDevInventory();
        this.fsm.transition(GameState.MAP_EXPLORATION);
      }),
      exit: () => this.ui.hideMapGeneration(),
    });

    this.fsm.addState(GameState.MAP_EXPLORATION, {
      enter: () => {
        this.ui.showMapUI();
        
        // ── 只在首次进入地图或明确需要时才重置回合 ──────────────────────────
        // 从 COMBAT 返回时不应该重置（保持战前的回合数）
        const prevState = this.fsm._previousState;
        if (prevState !== GameState.COMBAT) {
          this.turnManager.resetTurnCount();
        }
        
        // 根据当前地图设置进度条标题
        // ── 如果有当前任务，不要重置标题 ──────────────────────────────
        if (!this.turnManager.currentMissionName) {
          if (this.currentMapName === 'Novice Village') {
            this.turnManager.restoreProgressBarTitle('novice');
          } else {
            this.turnManager.restoreProgressBarTitle('main');
          }
        }
        this._startTurn();
      },
    });

    this.fsm.addState(GameState.COMBAT, {
      enter: contentData => this._enterCombat(contentData),
      exit: () => {
        const won = this.combatManager?.phase === 'WIN';
        this._exitCombat();
        this.ui.updatePartyStatus(this.selectedHeroes);
        if (won) {
          // ── 检查是否在特殊事件坐标击败怪物 ────────────────────────────
          const SPECIAL_EVENT_COORDS = [
            { q: 6, r: 0 },
            { q: 6, r: 1 },
            { q: 5, r: -6 }
          ];
          const isSpecialEventCoord = SPECIAL_EVENT_COORDS.some(
            coord => coord.q === this.combatLocationQ && coord.r === this.combatLocationR
          );
          if (isSpecialEventCoord) {
            this.hasDefeatedSpecialEventMonster = true;
          }
          
          const loot = rollRandomLoot();
          const goldGained = rollGoldDrop(loot?.rarity ?? 'common');
          this.gold = (this.gold ?? 0) + goldGained;
          this.ui.updateGold?.(this.gold);

          // 先显示战斗后的故事对话（如果存在）
          if (this.currentBossContent?.postCombatMessage) {
            const msg = this.currentBossContent.postCombatMessage;
            // 🎮 保存 isEndGame 标志，因为回调执行时 currentBossContent 可能已被清空
            const isEndGame = this.currentBossContent?.isEndGame;
            console.log('🎮 战斗胜利，当前 isEndGame=', isEndGame, 'postCombatMessage=', msg);
            
            // 处理新的故事对话框格式（带图片）
            if (msg.type === 'storyDialogue' && msg.scenes) {
              this.ui.storyDialogueBox.show({ scenes: msg.scenes }, () => {
                console.log('🎮 故事对话完成，isEndGame=', isEndGame);
                // 🎮 如果是结局事件，故事对话后直接返回主界面
                if (isEndGame) {
                  console.log('🎮 执行返回主界面');
                  setTimeout(() => {
                    this.fsm.transition(GameState.CHARACTER_SELECT);
                  }, 300);
                } else {
                  setTimeout(() => {
                    console.log(`🎮 [storyDialogue] 显示宝箱奖励`);
                    this.ui.showChestReward(loot, () => {
                      console.log(`🎮 [storyDialogue] 宝箱关闭回调，调用解锁处理`);
                      this._handlePostCombatUnlock();  // 🎮 在宝箱关闭时调用
                      setTimeout(() => {
                        this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                          const hero = this.selectedHeroes?.[heroIndex];
                          if (!hero) return;
                          if (action === 'put') hero.inventory.push(loot);
                          else if (action === 'equip') {
                            const isWeapon = Array.isArray(loot.skills) && loot.skills.length > 0;
                            if (isWeapon) {
                              const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                              if (emptySlot !== -1) {
                                hero.weaponSlots[emptySlot] = loot;
                              } else {
                                const displaced = hero.weaponSlots[0];
                                hero.weaponSlots[0] = loot;
                                if (displaced) hero.inventory.push(displaced);
                              }
                            } else {
                              hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                              hero.equipSlots.push(loot);
                            }
                            hero.refreshDerivedStats?.();
                          }
                          this.ui.updatePartyStatus(this.selectedHeroes);
                        });
                      }, 100);
                    });
                  }, 300);
                }
              });
            } 
            // 处理传统的文字对话框格式
            else {
              console.log(`🎮 显示传统对话框格式的 postCombatMessage`);
              this.ui.showEvent(
                '📖 Story',
                typeof msg === 'string' ? msg : msg,
                [{
                  text: 'Continue', onClick: () => {
                    console.log(`🎮 战斗后对话 Continue 被点击，isEndGame=${isEndGame}`);
                    // 🎮 如果是结局事件，故事对话后直接返回主界面
                    if (isEndGame) {
                      setTimeout(() => {
                        this.fsm.transition(GameState.CHARACTER_SELECT);
                      }, 300);
                    } else {
                      setTimeout(() => {
                        console.log(`🎮 显示宝箱奖励`);
                        this.ui.showChestReward(loot, () => {
                          console.log(`🎮 宝箱关闭回调，调用解锁处理`);
                          // 🎮 宝箱关闭时处理解锁链
                          this._handlePostCombatUnlock();
                          setTimeout(() => {
                            this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                              const hero = this.selectedHeroes?.[heroIndex];
                              if (!hero) return;
                              if (action === 'put') hero.inventory.push(loot);
                             else if (action === 'equip') {
                               const isWeapon = Array.isArray(loot.skills) && loot.skills.length > 0;
                               if (isWeapon) {
                                 const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                                 if (emptySlot !== -1) {
                                   hero.weaponSlots[emptySlot] = loot;
                                 } else {
                                   const displaced = hero.weaponSlots[0];
                                   hero.weaponSlots[0] = loot;
                                   if (displaced) hero.inventory.push(displaced);
                                 }
                               } else {
                                 hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                                 hero.equipSlots.push(loot);
                               }
                               hero.refreshDerivedStats?.();
                             }
                              this.ui.updatePartyStatus(this.selectedHeroes);
                            });
                          }, 100);
                        });
                      }, 300);
                    }
                  }
                }]
              );
            }
            this.currentBossContent = null;
          } else {
            setTimeout(() => {
              this.ui.showChestReward(loot, () => {
                // 🎮 宝箱关闭时处理解锁链
                this._handlePostCombatUnlock();
                setTimeout(() => {
                  this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                    const hero = this.selectedHeroes?.[heroIndex];
                    if (!hero) return;
                    if (action === 'put') hero.inventory.push(loot);
                  else if (action === 'equip') {
                    const isWeapon = Array.isArray(loot.skills) && loot.skills.length > 0;
                    if (isWeapon) {
                      const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                      if (emptySlot !== -1) {
                        hero.weaponSlots[emptySlot] = loot;
                      } else {
                        const displaced = hero.weaponSlots[0];
                        hero.weaponSlots[0] = loot;
                        if (displaced) hero.inventory.push(displaced);
                      }
                    } else {
                      hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                      hero.equipSlots.push(loot);
                    }
                    hero.refreshDerivedStats?.();
                  }
                    this.ui.updatePartyStatus(this.selectedHeroes);
                  });
                }, 100);
              });
            }, 300);
          }
        } else {
          this.currentBossContent = null;
        }
      },
    });

    this.fsm.addState(GameState.GAME_OVER, {
      enter: () => this.ui.showGameOver(),
      exit: () => { },
    });
  }

  _enterCombat(contentData) {
    this.currentBossContent = contentData;
    // 🎮 保存战斗位置用于解锁链
    this.combatLocationQ = this.player.q;
    this.combatLocationR = this.player.r;
    console.log(`🎮 进入战斗，位置: (${this.combatLocationQ}, ${this.combatLocationR})`);
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;

    const buildEnemies = (typeKeys) => {
      const enemies = [];
      typeKeys.forEach((typeKey, i) => {
        const def = ENEMY_TYPES[typeKey];
        const e = new Enemy(def.name, def.type, level, def.statMod);
        e.id = `e${i + 1}_` + Date.now() + i;
        e.enemyKey = typeKey;
        e.enemyCategory = def.type;
        e.monsterType = typeKey;
        e.skills = def.skills || [];
        if (typeKey === 'dark_overlord') {
          e.maxHp = Math.floor(e.maxHp * 10);
        } else if (def.hpMulti && def.hpMulti !== 1) {
          e.maxHp = Math.floor(e.maxHp * def.hpMulti);
        }
        e.hp = e.maxHp;


        
        enemies.push(e);
      });
      return enemies;
    };

    const startCombat = (enemies) => {
      this.combatManager = new CombatManager(this.selectedHeroes, enemies, this.ui);
      this.combatManager.init();
      this.ui.showCombatOverlay(this.combatManager);
    };

    if (isBoss) {
      const def = ENEMY_TYPES.dark_overlord;

      // 数值 = 普通小怪同 level 基础值 × 2（普通公式见 Enemy.js 注释）
      const boss = new Enemy(
          contentData.name || def.name,
          'boss',
          level,
          {
            strength:  Math.floor((15 + (level - 1) * 4)   * 2),
            intellect: Math.floor((6  + (level - 1) * 2)   * 2),
            toughness: Math.floor((5  + (level - 1) * 1.5) * 2),
            awareness: Math.floor((8  + (level - 1) * 2)   * 2),
            talent:    Math.floor((5  + (level - 1) * 1)   * 2),
            agility:   Math.floor((8  + (level - 1) * 2)   * 2),
          }
      );


      
      boss.id     = 'e1_' + Date.now();
      boss.enemyKey = 'dark_overlord';
      boss.enemyCategory = def.type;
      boss.monsterType = 'boss';
      boss.skills = def.skills;

      // HP 也翻倍（Enemy 构造时已按 level 算好，再 ×2）
      boss.maxHp = Math.floor(boss.maxHp * 6);
      boss.hp    = boss.maxHp;

      startCombat([boss]);
      return;
    }

    // 🎮 如果事件配置了特定的敌人组，使用它
    if (contentData.enemyGroup && Array.isArray(contentData.enemyGroup)) {
      startCombat(buildEnemies(contentData.enemyGroup));
      return;
    }

    if (this.isDevMode) {
      const enemyKeys = Object.keys(ENEMY_TYPES);
      const selected = [];   // 已选中的 key 列表，最多3个

      // ── 创建 overlay 容器 ────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    z-index: 300; display: flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace;
  `;

      const panel = document.createElement('div');
      panel.style.cssText = `
    background: rgba(10,8,6,0.97); border: 1px solid rgba(251,191,36,0.4);
    border-radius: 14px; padding: 24px 28px; width: 520px; max-width: 94vw;
    max-height: 85vh; display: flex; flex-direction: column; gap: 14px;
    color: white;
  `;

      // 标题
      const title = document.createElement('div');
      title.style.cssText = 'font-size: 15px; font-weight: bold; color: #fbbf24; letter-spacing: 0.05em;';
      title.textContent = `🛠️ Dev：选择上场敌人（最多3个，Level ${level}）`;

      // 已选列表显示
      const selectedInfo = document.createElement('div');
      selectedInfo.style.cssText = 'font-size: 12px; color: #aaa; min-height: 18px;';
      const refreshInfo = () => {
        selectedInfo.textContent = selected.length === 0
            ? '尚未选择任何敌人'
            : '已选：' + selected.map(k => ENEMY_TYPES[k].name).join(' / ');
      };
      refreshInfo();

      // 敌人按钮列表（可滚动）
      const list = document.createElement('div');
      list.style.cssText = `
    display: flex; flex-direction: column; gap: 8px;
    overflow-y: auto; max-height: 340px; padding-right: 4px;
  `;

      const btnMap = {};  // key -> button element，方便刷新样式

      const refreshBtnStyle = (key) => {
        const btn = btnMap[key];
        const isSelected = selected.includes(key);
        btn.style.background = isSelected ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)';
        btn.style.borderColor = isSelected ? '#fbbf24' : 'rgba(255,255,255,0.15)';
        btn.style.color = isSelected ? '#fbbf24' : '#e5e7eb';
      };

      enemyKeys.forEach(key => {
        const def = ENEMY_TYPES[key];
        const btn = document.createElement('button');
        btn.style.cssText = `
      text-align: left; padding: 10px 14px; border-radius: 8px; cursor: pointer;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04);
      color: #e5e7eb; transition: all 0.15s; font-size: 13px;
    `;
        btn.innerHTML = `<span style="font-weight:bold;">${def.name}</span>
      <span style="font-size:11px; color:#9ca3af; margin-left:8px;">${def.desc ?? ''}</span>`;

        btn.onclick = () => {
          const idx = selected.indexOf(key);
          if (idx !== -1) {
            selected.splice(idx, 1);   // 取消选择
          } else if (selected.length < 3) {
            selected.push(key);        // 添加选择
          }
          refreshBtnStyle(key);
          refreshInfo();
          fightBtn.disabled = selected.length === 0;
        };

        btnMap[key] = btn;
        list.appendChild(btn);
      });

      // 底部按钮行
      const footer = document.createElement('div');
      footer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px;';

      const randomBtn = document.createElement('button');
      randomBtn.textContent = '🎲 随机';
      randomBtn.style.cssText = `
    padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;
    border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #d1d5db;
  `;
      randomBtn.onclick = () => {
        document.body.removeChild(overlay);
        startCombat(buildEnemies(rollEncounter(level)));
      };

      const fightBtn = document.createElement('button');
      fightBtn.textContent = '⚔️ Fight！';
      fightBtn.disabled = true;
      fightBtn.style.cssText = `
    padding: 8px 22px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;
    border: 1px solid #fbbf24; background: rgba(251,191,36,0.15); color: #fbbf24;
    opacity: 0.4; transition: opacity 0.15s;
  `;
      fightBtn.onclick = () => {
        if (selected.length === 0) return;
        document.body.removeChild(overlay);
        startCombat(buildEnemies(selected));
      };

      // disabled 时视觉反馈
      const observer = new MutationObserver(() => {
        fightBtn.style.opacity = fightBtn.disabled ? '0.4' : '1';
        fightBtn.style.cursor  = fightBtn.disabled ? 'not-allowed' : 'pointer';
      });
      observer.observe(fightBtn, { attributes: true, attributeFilter: ['disabled'] });

      footer.appendChild(randomBtn);
      footer.appendChild(fightBtn);

      panel.appendChild(title);
      panel.appendChild(selectedInfo);
      panel.appendChild(list);
      panel.appendChild(footer);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    } else {
      startCombat(buildEnemies(rollEncounter(level)));
    }
  }

  _exitCombat() {
    this.combatManager = null;
    this.ui.hideCombatOverlay();
  }

  // 🎮 战斗胜利后处理解锁链
  _handlePostCombatUnlock() {
    console.log(`🎮 战斗后解锁检查，位置: (${this.combatLocationQ}, ${this.combatLocationR})`);
    if (this.combatLocationQ !== undefined && this.combatLocationR !== undefined) {
      console.log(`🎮 触发 handleUnlockChain`);
      EventTable.handleUnlockChain(this, this.combatLocationQ, this.combatLocationR);
      // 🎮 清除战斗位置信息，防止重复调用
      this.combatLocationQ = undefined;
      this.combatLocationR = undefined;
    } else {
      console.warn(`❌ 战斗位置信息不完整: Q=${this.combatLocationQ}, R=${this.combatLocationR}`);
    }
  }

  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      this.player.update(dt);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      this.selectedHeroes.forEach(h => h.update(dt));
      this.combatManager?.enemies.forEach(e => e.update(dt));
    }
  }

  render(ctx, camera) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      const currentMap = this.currentMapName === 'Novice Village'
        ? this.noviceVillage : this.map;
      Renderer.renderExploration(ctx, camera, currentMap, this.player, this.rangeHighlight, this.pathHighlight);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
    }
  }

  _startTurn() {
    this.rangeHighlight = null;
    this.pendingPath = null;
    this.pendingTarget = null;
    this.pathHighlight = null;
    // \u2500\u2500 \u4f7f\u7528 TurnManager \u66f4\u65b0\u56de\u5408\u8ba1\u6570\u548c\u8fdb\u5ea6\u6761 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n    this.turnManager.incrementTurn();

    const roller = this.selectedHeroes.length > 0
      ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b))
      : this.player;

    let total = this.isDevMode ? 999 : rollSpeed(roller, 0.5, 20).gradeIndex + 1;


    const hasTravelerSet = this.selectedHeroes.some(hero =>
        (hero.equipSlots ?? []).some(item => item?.effect === 'movement_plus_2')
    );
    if (hasTravelerSet) total += 2;


    this.player.movementPoints = total;
    this.ui.updateMovementUI(total);
    this.ui.updatePartyStatus(this.selectedHeroes);

    if (this.trapCooldown > 0) this.trapCooldown--;

    // Boss 惩罚阶段：每回合扣除英雄最大血量的 5%
    if (this.bossModePenaltyActive) {
      let totalDamage = 0;
      for (const hero of this.selectedHeroes) {
        const damage = Math.max(1, Math.floor(hero.maxHp * 0.05));
        hero.hp = Math.max(0, hero.hp - damage);
        totalDamage += damage;
      }
      if (!this.bossModePenaltyWarned) {
        this.bossModePenaltyWarned = true;
        this.ui.showEvent(
          '⚠️ Threat',
          `Every moment of delay weakens your vitality!\nAll heroes lose 5% of their maximum health.`,
          [{ text: 'Continue', onClick: () => { } }]
        );
      }
      this.ui.updatePartyStatus(this.selectedHeroes);
    }

    if (!this.turnManager.bossMode && this.turnManager.isTurnLimitReached()) {
      // ── 使用 TurnManager 进入 Boss 模式 ──────────────────────────────────────────────
      this.turnManager.enterBossMode(10);
      this.bossModePenaltyActive = true;
      this.ui.setCritical();

      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);

      this.map.revealAround(20, 0, 10);

      for (const tile of this.map.tiles.values()) {
        const dq = tile.q - 20, dr = tile.r - 0, ds = -dq - dr;
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) <= 4) {
          tile.type = TileType.FOREST;
        }
      }
      const bossTile = this.map.getTile(20, 0);
      if (bossTile) this.map.placeContent(20, 0, makeBoss('Final Boss', 10));

    } else if (this.turnManager.bossMode && this.turnManager.isTurnLimitReached()) {
      this.fsm.transition(GameState.GAME_OVER);
    }
  }

  onEndTurnBtnClick() { this._startTurnFixed(); }

  // 新的 turnCount 增加方法
  _startTurnFixed() {
    this.rangeHighlight = null;
    this.pendingPath = null;
    this.pendingTarget = null;
    this.pathHighlight = null;
    
    // 移除End Turn按钮的闪烁效果
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
      endTurnBtn.classList.remove('blink');
    }
    
    // 直接处理 turnCount 增加
    this.turnManager.turnCount = this.turnManager.turnCount + 1;
    this.turnManager._updateProgressBar();

    const roller = this.selectedHeroes.length > 0
      ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b))
      : this.player;

    let total = this.isDevMode ? 999 : rollSpeed(roller, 0.5, 20).gradeIndex + 1;

    const hasTravelerSet = this.selectedHeroes.some(hero =>
        (hero.equipSlots ?? []).some(item => item?.effect === 'movement_plus_2')
    );
    if (hasTravelerSet) total += 2;

    this.player.movementPoints = total;
    this.ui.updateMovementUI(total);
    this.ui.updatePartyStatus(this.selectedHeroes);

    if (this.trapCooldown > 0) this.trapCooldown--;

    // Boss 惩罚阶段：每回合扣除英雄最大血量的 5%
    if (this.bossModePenaltyActive) {
      let totalDamage = 0;
      for (const hero of this.selectedHeroes) {
        const damage = Math.max(1, Math.floor(hero.maxHp * 0.05));
        hero.hp = Math.max(0, hero.hp - damage);
        totalDamage += damage;
      }
      if (!this.bossModePenaltyWarned) {
        this.bossModePenaltyWarned = true;
        this.ui.showEvent(
          '⚠️ Threat',
          `Every moment of delay weakens your vitality!\nAll heroes lose 5% of their maximum health.`,
          [{ text: 'Continue', onClick: () => { } }]
        );
      }
      this.ui.updatePartyStatus(this.selectedHeroes);
    }

    if (!this.turnManager.bossMode && this.turnManager.isTurnLimitReached()) {
      this.turnManager.enterBossMode(10);
      this.bossModePenaltyActive = true;
      this.ui.setCritical();

      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);

      this.map.revealAround(20, 0, 10);

      for (const tile of this.map.tiles.values()) {
        const dq = tile.q - 20, dr = tile.r - 0, ds = -dq - dr;
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) <= 4) {
          tile.type = TileType.FOREST;
        }
      }
      const bossTile = this.map.getTile(20, 0);
      if (bossTile) this.map.placeContent(20, 0, makeBoss('Final Boss', 10));

    } else if (this.turnManager.bossMode && this.turnManager.isTurnLimitReached()) {
      this.fsm.transition(GameState.GAME_OVER);
    }
  }

  // ── 两步移动：第一次点击显示路径，第二次点击执行移动 ──────────────

  /**
   * 第一次点击目标格 → A* 寻路，显示蓝色路径预览。
   * 第二次点击同一目标格 → 执行移动。
   * 点击其他格 → 切换路径预览到新目标。
   * 点击自身格 → 取消路径预览。
   *
   * 寻路规则：
   *   - moveCost = Infinity 的地形（森林/山脉/屏障）不可通行
   *   - 带事件内容的格子不能作为途经点，只能作为终点
   *   - 总路径代价不能超过当前移动力
   */
  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;
    if (this._isMoving) return;

    // 点击自身格：取消路径预览
    if (q === this.player.q && r === this.player.r) {
      this.pendingPath = null;
      this.pendingTarget = null;
      this.pathHighlight = null;
      this.rangeHighlight = null;
      return;
    }

    const curMap = this.currentMapName === 'Novice Village'
      ? this.noviceVillage : this.map;

    const tile = curMap.getTile(q, r);
    if (!tile || !isFinite(tile.type.moveCost)) return;

    // ── 二次点击同一目标格 → 执行移动 ──────────────────────────────
    if (this.pendingTarget && this.pendingTarget.q === q && this.pendingTarget.r === r) {
      const path = this.pendingPath;
      this.pendingPath = null;
      this.pendingTarget = null;
      this.pathHighlight = null;
      this.rangeHighlight = null;
      this._walkPath(path, curMap);
      return;
    }

    // ── 一次点击（或切换目标）→ A* 寻路并显示路径预览 ───────────────
    const result = findPath(
      curMap,
      this.player.q, this.player.r,
      q, r,
      this.player.movementPoints,
    );

    if (!result || result.path.length === 0) {
      // 不可达：清除路径预览，显示可达范围红线
      this.pendingPath = null;
      this.pendingTarget = null;
      this.pathHighlight = null;
      const canReachUnlimited = findPath(curMap, this.player.q, this.player.r, q, r, Infinity);
      if (canReachUnlimited) {
        this.rangeHighlight = getReachableTiles(
          curMap,
          this.player.q,
          this.player.r,
          this.player.movementPoints,
        );
      }
      return;
    }

    // 保存路径，构建路径格高亮集合
    this.pendingPath = result.path;
    this.pendingTarget = { q, r };
    this.rangeHighlight = null;

    this.pathHighlight = new Set();
    this.pathHighlight.add(`${this.player.q},${this.player.r}`);
    for (const step of result.path) {
      this.pathHighlight.add(`${step.q},${step.r}`);
    }
  }

  /**
   * 按路径逐格移动玩家，每步间隔 150ms（视觉动画）。
   * 只在抵达最后一格时触发 tile content 事件。
   *
   * @param {Array<{q:number, r:number}>} path  不含起点的路径格数组
   * @param {HexMap} curMap
   */
  _walkPath(path, curMap) {
    this._isMoving = true;
    this.rangeHighlight = null;
    this.pendingPath = null;
    this.pendingTarget = null;
    this.pathHighlight = null;
    
    // ── 记录玩家离开前所在的格子 ────────────────────────────────────
    const prevTile = curMap.getTile(this.player.q, this.player.r);
    
    let stepIndex = 0;

    const doStep = () => {
      if (stepIndex >= path.length) {
        this._isMoving = false;
        return;
      }

      const { q, r } = path[stepIndex];
      stepIndex++;

      const tile = curMap.getTile(q, r);
      if (!tile) { this._isMoving = false; return; }

      this.player.setGridPos(q, r, curMap);
      this.player.movementPoints -= tile.type.moveCost;
      this.ui.updateMovementUI(this.player.movementPoints);
      curMap.revealAround(q, r, 2);
      this.ui.updatePartyStatus(this.selectedHeroes);

      const isLast = stepIndex >= path.length;
      if (isLast) {
        this._isMoving = false;
        
        // ── 离开特定坐标的事件后，取消闪烁 ───────────────────────────
        const SPECIAL_EVENT_COORDS = [
          { q: 6, r: 0 },
          { q: 6, r: 1 },
          { q: 5, r: -6 }
        ];
        
        for (const coord of SPECIAL_EVENT_COORDS) {
          if (prevTile && prevTile.q === coord.q && prevTile.r === coord.r) {
            prevTile.isBlinking = false;
            break;
          }
        }
        
        // ── 离开村庄事件后，取消闪烁 ───────────────────────────────
        if (prevTile && prevTile.isFixedEvent && prevTile.content?.type === TileContentType.VILLAGE) {
          prevTile.isBlinking = false;
        }
        
        this._handleTileContent(tile);
      } else {
        setTimeout(doStep, 150);
      }
    };

    doStep();
  }

  // ── Tile 事件处理 ────────────────────────────────────────────────

  _handleTileContent(tile) {
    // ── 检查是否为固定事件且已触发过 ───────────────────────────────
    const eventKey = `${tile.q},${tile.r}`;
    // ── 注意：村庄（VILLAGE）和遗迹（RUIN）类型事件不受一次触发限制，可以重复访问 ──
    const isFixedEventAlreadyTriggered = tile.isFixedEvent && tile.content?.type !== TileContentType.VILLAGE && tile.content?.type !== TileContentType.RUIN && this.triggeredFixedEvents.has(eventKey);
    
    // 如果是固定事件且已触发过，则不处理任何事件
    if (isFixedEventAlreadyTriggered) {
      return;
    }
    
    // 特殊坐标：主世界(-8, 7)自动切换为寻找村庄（只在首次触发时）
    if (this.currentMapName !== 'Novice Village' && tile.q === -8 && tile.r === 7 && !isFixedEventAlreadyTriggered) {
      this.ui.updateProgressBarTitle(PROGRESS_BAR_TEXTS.FIND_VILLAGE);
    }

    if (!tile.content) {
      if (this.trapCooldown === 0 && Math.random() <= EventTable.getTrapSpawnChance()) {
        this.trapCooldown = 2;
        EventTable.handleTrap(this);
      }
      return;
    }
    
    // ── 标记固定事件为已触发（村庄和遗迹除外，可重复访问） ──────────────────
    if (tile.isFixedEvent && tile.content.type !== TileContentType.VILLAGE && tile.content.type !== TileContentType.RUIN) {
      this.triggeredFixedEvents.add(eventKey);
      // ── 触发后禁用闪烁效果 ────────────────────────────────────────
      tile.isBlinking = false;
    }
    
    const c = tile.content;
    if (c.type === TileContentType.DUNGEON || c.type === TileContentType.BOSS) {
      EventTable.handleCombat(this, tile, c);
    } else if (c.type === TileContentType.TREASURE) {
      EventTable.handleTreasure(this, tile, c);
    } else if (c.type === TileContentType.ALTAR) {
      EventTable.handleAltar(this, tile);
    } else if (c.type === TileContentType.LIGHTHOUSE) {
      EventTable.handleLighthouse(this, tile);
    } else if (c.type === TileContentType.PORTAL) {
      EventTable.handlePortal(this, tile, c);
    } else if (c.type === TileContentType.VILLAGE) {
      EventTable.handleVillage(this, tile, c);
    } else if (c.type === TileContentType.MERCHANT) {
      EventTable.handleMerchant(this, tile, c);
    } else if (c.type === TileContentType.RUIN) {
      EventTable.handleRuin(this, tile, c);
    } else if (c.type === TileContentType.CORRUPTED_DEER) {
      EventTable.handleCorruptedDeer(this, tile, c);
    } else if (c.type === TileContentType.NPC || c.type === TileContentType.INJURED_VILLAGER) {
      EventTable.handleNPC(this, tile, c);
    } else if (c.type === TileContentType.SHOP) {
           EventTable.handleShop(this, tile, c);
    }
  }

  // ── 切换地图 ─────────────────────────────────────────────────────

  _switchMap(targetMapName, q, r) {
    if (targetMapName === this.currentMapName) return;
    const targetMap = targetMapName === 'Novice Village'
      ? this.noviceVillage : this.map;
    if (!targetMap) return;
    this.currentMapName = targetMapName;
    this.player.setGridPos(q, r, targetMap);
    targetMap.revealAround(q, r, 5);
    if (this.camera) {
      const bottomLeft = hexToPixel(q, r, targetMap.tileSize);
      this.camera.x = MapConfig.PADDING - bottomLeft.x;
      this.camera.y = window.innerHeight - MapConfig.PADDING - bottomLeft.y;
    }
    this.ui.updatePartyStatus(this.selectedHeroes);
    // ── 重置回合计数并更新进度条标题 ────────────────────────────────────
    this.turnManager.resetTurnCount();
    // ── 如果有当前任务，不要重置标题 ──────────────────────────────
    if (!this.turnManager.currentMissionName) {
      if (targetMapName === 'Novice Village') {
        this.turnManager.restoreProgressBarTitle('novice');
      } else {
        this.turnManager.restoreProgressBarTitle('main');
      }
    }
    this.fsm.transition(GameState.MAP_EXPLORATION);
  }

  _startMission(missionName, maxTurns = 5) {
    // ── 使用 TurnManager 统一管理会战、回合、进度条 ──────────────────────────────────────
    this.turnManager.startMission(missionName, maxTurns);
    this.bossModePenaltyActive = false;
    this.bossModePenaltyWarned = false;
    this.turnManager.clearBossPenalty(this);  // ── 额外确保清除 ──
    document.body.classList.remove('screen-flare');
    this.turnManager.setNormal();
  }

  // ── 更新进度条标题（根据当前任务或地图） ──────────────────────
  _updateProgressBarTitle() {
    let title;
    if (this.turnManager.currentMissionName) {
      title = `🎯 ${this.turnManager.currentMissionName}`;
    } else if (this.currentMapName === 'Novice Village') {
      title = '🏘️ Novice Village';
    } else {
      title = 'Find Ruins';
    }
    this.turnManager.setProgressBarTitle(title);
  }

  _executeTrapRoll() {
    const val = Math.max(1, Math.min(6, Math.round(rollSpeed(this.selectedHeroes[0], 0.5, 20).sampleRoll / 20 * 6)));
    EventTable.handleTrapResult(this, val);
  }

  _revealDirection(dirQ, dirR) {
    const currentMap = this.currentMapName === 'Novice Village' ? this.noviceVillage : this.map;
    const radius = 6;
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) > radius) continue;
        const tile = currentMap.getTile(this.player.q + dq, this.player.r + dr);
        if (tile && (
          (dirQ === 1 && dirR === -1 && dq > 0 && dr < 0) ||
          (dirQ === 1 && dirR === 1 && dq > 0 && dr > 0) ||
          (dirQ === -1 && dirR === 1 && dq < 0 && dr > 0) ||
          (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0)
        )) {
          tile.isRevealed = true;
        }
      }
    }
  }

  // ── Hero creation — supports new weapon slots and legacy skill slots ──────
  _createHeroFromData(data) {
    const hero = new Player(data.name);
    hero.id = data.id;
    hero.maxHp = data.maxHp ?? data.hp ?? 100;
    hero.hp = hero.maxHp;
    hero.type = 'player';

    if (data.stats) {
      const s = data.stats;
      hero.strength = s.strength ?? hero.strength;
      hero.vitality = s.vitality ?? s.toughness ?? hero.vitality;
      hero.intellect = s.intellect ?? hero.intellect;
      hero.awareness = s.awareness ?? hero.awareness;
      hero.talent = s.talent ?? hero.talent;
      hero.agility = s.agility ?? hero.agility;
    }

    hero._baseStrength = hero.strength;
    hero._baseVitality = hero.vitality;
    hero._baseAgility = hero.agility;
    hero._baseIntellect = hero.intellect;
    hero._baseAwareness = hero.awareness;
    hero._baseTalent = hero.talent;

    // 【修复】：兼容完整对象或ID的读取方式
    if (data.weaponSlots && Array.isArray(data.weaponSlots)) {
      hero.weaponSlots = [null, null];
      data.weaponSlots.forEach((w, i) => {
        if (w) {
          // 如果存档里存的是完整对象则直接使用，如果是字符串则尝试通过DataLoader获取
          const weapon = typeof w === 'object' ? w : DataLoader.getWeapon?.(w);
          if (weapon) hero.weaponSlots[i] = weapon;
        }
      });
      hero.equippedWeaponIndex = data.equippedWeaponIndex ?? 0;
    } else if (data.skillSlots) {
      data.skillSlots.forEach((sid, i) => {
        if (sid) {
          const skill = DataLoader.getSkill(sid);
          if (skill) hero.equipSkill?.(skill, i);
        }
      });
    }

    hero.refreshDerivedStats();
    return hero;
  }

  _restoreStoredObject(entry) {
    if (!entry) return null;

    if (typeof entry === 'string') {
      const weapon = DataLoader.getWeapon?.(entry);
      if (weapon) return { ...weapon };

      const item = ItemDB.find(it => it.id === entry);
      return item ? { ...item } : null;
    }

    const weaponById = entry.id ? DataLoader.getWeapon?.(entry.id) : null;
    if (weaponById) return { ...weaponById, ...entry };

    const itemById = entry.id ? ItemDB.find(it => it.id === entry.id) : null;
    if (itemById) return { ...itemById, ...entry };

    return { ...entry };
  }

  _restoreStoredList(list) {
    return Array.isArray(list)
      ? list.map(entry => this._restoreStoredObject(entry)).filter(Boolean)
      : [];
  }

  saveGame() {
    try {
        const serializeMap = (m) => {
            const tiles = [];
            m.tiles.forEach(tile => {
                tiles.push({
                    q: tile.q, r: tile.r,
                    typeId: tile.type.id,
                    content: tile.content,
                    isRevealed: tile.isRevealed,
                    variant: tile.variant
                });
            });
            return { radius: m.radius, tileSize: m.tileSize, tiles };
        };
        const sharedStorage = this.ui.inventoryUI?.getStorage?.() ?? { weapons: [], items: [] };

        const data = {
            player: {
                q: this.player.q,
                r: this.player.r,
                movementPoints: this.player.movementPoints
            },
            heroes: this.selectedHeroes.map(h => ({
                id: h.id,
                name: h.name,
                maxHp: h.maxHp,
                hp: h.hp,
                stats: {
                    strength: h._baseStrength,
                    vitality: h._baseVitality,
                    agility: h._baseAgility,
                    intellect: h._baseIntellect,
                    awareness: h._baseAwareness,
                    talent: h._baseTalent
                },
                weaponSlots: h.weaponSlots,
                equippedWeaponIndex: h.equippedWeaponIndex,
                equipSlots: h.equipSlots,
                inventory: h.inventory
            })),
            sharedStorage: {
                weapons: [...(sharedStorage.weapons || [])],
                items: [...(sharedStorage.items || [])]
            },
            map: serializeMap(this.map),
            noviceVillage: serializeMap(this.noviceVillage),
            currentMapName: this.currentMapName,
            // ── 使用 TurnManager 序列化 ──────────────────────────────────────────────
            turnState: this.turnManager.serialize()
        };

        localStorage.setItem('for_the_treasure_save', JSON.stringify(data));
        alert("Game Saved Successfully!");
    } catch (e) {
        console.error("Save error:", e);
        alert("Failed to save game.");
    }
  }

  loadGame() {
    const saved = localStorage.getItem('for_the_treasure_save');
    if (!saved) return false;
    
    try {
        const data = JSON.parse(saved);

        // 1. 恢复英雄及背包装备
        this.selectedHeroes = data.heroes.map(hd => {
            const h = this._createHeroFromData(hd);
            h.hp = hd.hp;
            h.weaponSlots = Array.isArray(hd.weaponSlots)
              ? hd.weaponSlots.map(w => this._restoreStoredObject(w))
              : (h.weaponSlots || [null, null]);
            h.inventory = this._restoreStoredList(hd.inventory);
            h.equipSlots = this._restoreStoredList(hd.equipSlots);
            h.equippedWeaponIndex = hd.equippedWeaponIndex ?? 0;
            h.refreshDerivedStats();
            return h;
        });
        if (this.ui.inventoryUI) {
            this.ui.inventoryUI.sharedStorage = {
                weapons: this._restoreStoredList(data.sharedStorage?.weapons),
                items: this._restoreStoredList(data.sharedStorage?.items)
            };
        }

        // 2. 恢复地图与格子状态
        const restoreMap = (mapData) => {
            const m = new HexMap(mapData.radius, mapData.tileSize);
            m.tiles.clear(); // 清空随机生成的初始格子
            mapData.tiles.forEach(td => {
                const typeObj = Object.values(TileType).find(t => t.id === td.typeId) || TileType.GRASS;
                const tile = new Tile(td.q, td.r, typeObj);
                tile.content = td.content;
                tile.isRevealed = td.isRevealed;
                tile.variant = td.variant;
                m.setTile(td.q, td.r, tile);
            });
            m.worldBounds = m._computeWorldBounds();
            return m;
        };

        this.map = restoreMap(data.map);
        this.noviceVillage = restoreMap(data.noviceVillage);

        // 3. 恢复游戏进程 （使用 TurnManager）
        this.currentMapName = data.currentMapName;
        if (data.turnState) {
          this.turnManager.deserialize(data.turnState);
        } else {
          // 兼容旧保存文件
          this.turnCount = data.turnCount;
          this.currentMaxTurns = data.currentMaxTurns || 20;
          this.turnManager.bossMode = data.bossMode;
          this.bossModePenaltyActive = data.bossModePenaltyActive;
          // ── 恢复进度条UI ──
          this.turnManager._updateProgressBar();
          // ── 如果没有当前任务，才恢复默认标题 ──
          if (!this.turnManager.currentMissionName) {
            if (data.currentMapName === 'Novice Village') {
              this.turnManager.restoreProgressBarTitle('novice');
            } else {
              this.turnManager.restoreProgressBarTitle('main');
            }
          }
        }

        // 4. 恢复玩家位置和动作点
        const curMap = this.currentMapName === 'Novice Village' ? this.noviceVillage : this.map;
        this.player.setGridPos(data.player.q, data.player.r, curMap);
        this.player.movementPoints = data.player.movementPoints;

        // 5. 调整相机与复原UI状态（跳过重新生成的回调，直接强行切入探索状态）
        const bottomLeft = hexToPixel(this.player.q, this.player.r, curMap.tileSize);
        this.camera.x = MapConfig.PADDING - bottomLeft.x;
        this.camera.y = window.innerHeight - MapConfig.PADDING - bottomLeft.y;

        this.fsm.currentState = GameState.MAP_EXPLORATION;
        this.ui.showMapUI();
        this.ui.updateMovementUI(this.player.movementPoints);
        this.ui.updatePartyStatus(this.selectedHeroes);
        this.ui.inventoryUI?.update(this.selectedHeroes);
        // ── 使用 TurnManager 恢复进度条状态 ──────────────────────────────────────────────
        this.turnManager._updateProgressBar();
        this._updateProgressBarTitle();
        if (this.turnManager.bossMode) this.ui.updateBossMode();

        return true;
    } catch (e) {
        console.error("Save load error:", e);
        return false;
    }
  }
  startDevMode() {
    this.fsm.transition(GameState.CHARACTER_SELECT);
  }

  _populateDevInventory() {
    const storage = this.ui.inventoryUI;
    DataLoader.getAllWeapons().forEach(w => storage.addToStorage({ ...w }));
    ItemDB.forEach(it => storage.addToStorage({ ...it }));


  }
}
