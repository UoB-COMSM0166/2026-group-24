// src/core/GameController.js
import { GameState, MapConfig, TurnConfig, MapPresets } from './Constants.js';
import { HexMap, createMapByPreset } from '../world/HexMap.js';
import { Tile, TileContentType, makePortal, hexToPixel, makeBoss, TileType, makeNPC, makeVillage, makeMerchant, makeRuin, makeCorruptedDeer, makeInjuredVillager } from '../world/Tile.js';
import { NPC_LIST, VILLAGE_LIST, MERCHANT_LIST, RUIN_LIST, CORRUPTED_DEER_LIST } from '../data/EventTable.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';
import { rollSpeed } from './Dice.js';
import { Renderer } from '../rendering/Renderer.js';
import { rollRandomItem, rollRandomLoot, ItemDB } from '../data/items.js';
import { GameStory } from './GameStory.js';
import { EventTable } from '../data/EventTable.js';
import { findPath, getReachableTiles } from '../utils/Pathfinder.js';
import { rollEncounter, ENEMY_TYPES } from '../data/EncounterTable.js';
import { TutorialManager } from './TutorialManager.js';
import { NOVICE_DUNGEON_LIST, NOVICE_TREASURE_LIST, NOVICE_ALTAR_LIST } from '../data/EventTable.js';
import { makeDungeon, makeTreasure, makeAltar } from '../world/Tile.js';

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
    this.turnCount = 0;
    this.trapCooldown = 0;
    this.bossMode = false;
    this.bossModePenaltyActive = false;
    this.bossModePenaltyWarned = false;
    this.currentMaxTurns = TurnConfig.MAX_TURNS;
    this.currentMissionName = null;
    this.merchantEncountered = false;
    this._isMoving = false;
    this.isDevMode = false;
    this._progressBarTitle = null;  // 保存进度条标题以便恢复
    this.rangeHighlight = null;
    // ── 两步移动新增状态 ──────────────────────────────────────────
    this.pendingPath = null;      // A* 算出的待确认路径
    this.pendingTarget = null;    // 待确认目标格 {q, r}
    this.pathHighlight = null;    // 路径格 Set<"q,r">，供 Renderer 绘制
    // ─────────────────────────────────────────────────────────────
    this.gameStory = new GameStory(ui);
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

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
            targetMap.placeContent(npc.q, npc.r, content, 0);
          }
        }

        // 批量放置村庄
        for (const village of VILLAGE_LIST) {
          const targetMap = village.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(village.q, village.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            targetMap.placeContent(village.q, village.r, makeVillage(village.name), 0);
          }
        }

        // 批量放置商人
        for (const merchant of MERCHANT_LIST) {
          const targetMap = merchant.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(merchant.q, merchant.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            targetMap.placeContent(merchant.q, merchant.r, makeMerchant(merchant.name), 0);
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
            targetMap.placeContent(ruin.q, ruin.r, content, 0);
          }
        }

        // 批量放置被腐化的鹿
        for (const deer of CORRUPTED_DEER_LIST) {
          const targetMap = deer.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(deer.q, deer.r);
          if (tile && tile.type === TileType.GRASS) {
            tile.isFixedEvent = true;  // 先标记为固定事件
            targetMap.placeContent(deer.q, deer.r, makeCorruptedDeer(deer.name), 0);
          }
        }

        // 玩家出生在新手村
        this.currentMapName = 'Novice Village';
        this.player.setGridPos(noviceQ, noviceR, this.noviceVillage);
        this.noviceVillage.revealAround(noviceQ, noviceR, 5);

        // ── 放置新手村怪物 ──────────────────────────────────────
        for (const ev of NOVICE_DUNGEON_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            this.noviceVillage.placeContent(ev.q, ev.r, makeDungeon(ev.name, ev.level, ev.difficulty), 0);
          }
        }
        // ── 放置新手村宝箱 ──────────────────────────────────────
        for (const ev of NOVICE_TREASURE_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            this.noviceVillage.placeContent(ev.q, ev.r, makeTreasure(ev.lootTier), 0);
          }
        }
        // ── 放置新手村祭坛 ──────────────────────────────────────
        for (const ev of NOVICE_ALTAR_LIST) {
          const tile = this.noviceVillage.getTile(ev.q, ev.r);
          if (tile) {
            tile.type = TileType.GRASS;
            this.noviceVillage.placeContent(ev.q, ev.r, makeAltar(), 0);
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
        this.turnCount = 0; 
        this.ui.showMapUI();
        // 根据当前地图设置进度条标题
        if (this.currentMapName === 'Novice Village') {
          this.ui.updateProgressBarTitle('🏘️ Novice Village');
        } else {
          this.ui.updateProgressBarTitle('🌍 Main World');
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
          const loot = rollRandomLoot();

          // 先显示战斗后的故事对话（如果存在）
          if (this.currentBossContent?.postCombatMessage) {
            this.ui.showEvent(
              '📖 Story',
              this.currentBossContent.postCombatMessage,
              [{
                text: 'Continue', onClick: () => {
                  setTimeout(() => {
                    this.ui.showChestReward(loot, () => {
                      this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                        const hero = this.selectedHeroes?.[heroIndex];
                        if (!hero) return;
                        if (action === 'put') hero.inventory.push(loot);
                        else if (action === 'equip') { hero.equip?.(loot, Math.max(0, Math.min(1, loot.slot ?? 0))); hero.refreshDerivedStats?.(); }
                        this.ui.updatePartyStatus(this.selectedHeroes);
                      });
                    });
                  }, 300);
                }
              }]
            );
            this.currentBossContent = null;
          } else {
            setTimeout(() => {
              this.ui.showChestReward(loot, () => {
                this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                  const hero = this.selectedHeroes?.[heroIndex];
                  if (!hero) return;
                  if (action === 'put') hero.inventory.push(loot);
                  else if (action === 'equip') { hero.equip?.(loot, Math.max(0, Math.min(1, loot.slot ?? 0))); hero.refreshDerivedStats?.(); }
                  this.ui.updatePartyStatus(this.selectedHeroes);
                });
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
        if (def.hpMulti && def.hpMulti !== 1) {
          e.maxHp = Math.floor(e.maxHp * def.hpMulti);
          e.hp = e.maxHp;
        }
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
      const enemy = new Enemy(
          contentData.name || 'Elite Boss', 'boss', level,
          { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 }
      );
      enemy.id = 'e1_' + Date.now();
      startCombat([enemy]);
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
    font-family: sans-serif;
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
    this.turnCount += 1;
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);

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

    if (!this.bossMode && this.turnCount === this.currentMaxTurns) {
      this.bossMode = true;
      this.bossModePenaltyActive = true;
      this.turnCount = 0;
      this.currentMaxTurns = 10;
      this.ui.updateBossMode();
      this.ui.setProgressBarCritical();

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

    } else if (this.bossMode && this.turnCount === this.currentMaxTurns) {
      this.fsm.transition(GameState.GAME_OVER);
    }
  }

  onEndTurnBtnClick() { this._startTurn(); }

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
        this._handleTileContent(tile);
      } else {
        setTimeout(doStep, 150);
      }
    };

    doStep();
  }

  // ── Tile 事件处理 ────────────────────────────────────────────────

  _handleTileContent(tile) {
    if (!tile.content) {
      if (this.trapCooldown === 0 && Math.random() <= EventTable.getTrapSpawnChance()) {
        this.trapCooldown = 2;
        EventTable.handleTrap(this);
      }
      return;
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
    this.fsm.transition(GameState.MAP_EXPLORATION);
  }

  _startMission(missionName, maxTurns = 5) {
    this.currentMissionName = missionName;
    this.currentMaxTurns = maxTurns;
    this.turnCount = 0;
    this.bossMode = false;
    this.bossModePenaltyActive = false;
    this.bossModePenaltyWarned = false;
    document.body.classList.remove('screen-flare');
    this.ui.setProgressBarNormal();
    this.ui.updateProgressBar(0, maxTurns);
    this.ui.updateProgressBarTitle(`🎯 ${missionName}`);
  }

  // ── 更新进度条标题（根据当前任务或地图） ──────────────────────
  _updateProgressBarTitle() {
    let title;
    if (this.currentMissionName) {
      title = `🎯 ${this.currentMissionName}`;
    } else if (this.currentMapName === 'Novice Village') {
      title = '🏘️ Novice Village';
    } else {
      title = '🌍 Main World';
    }
    this._progressBarTitle = title;
    this.ui.updateProgressBarTitle(title);
  }

  _executeTrapRoll() {
    const val = Math.max(1, Math.min(6, Math.round(rollSpeed(this.selectedHeroes[0], 0.5, 20).sampleRoll / 20 * 6)));
    EventTable.handleTrapResult(this, val);
  }

  _revealDirection(dirQ, dirR) {
    const radius = 6;
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) > radius) continue;
        const tile = this.map.getTile(this.player.q + dq, this.player.r + dr);
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
            turnCount: this.turnCount,
            currentMaxTurns: this.currentMaxTurns,
            bossMode: this.bossMode,
            bossModePenaltyActive: this.bossModePenaltyActive
        };

        localStorage.setItem('for_the_treasure_save', JSON.stringify(data));
        alert("游戏保存成功！(Game Saved Successfully!)");
    } catch (e) {
        console.error("Save error:", e);
        alert("保存失败！(Failed to save game.)");
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

        // 3. 恢复游戏进程
        this.currentMapName = data.currentMapName;
        this.turnCount = data.turnCount;
        this.currentMaxTurns = data.currentMaxTurns || 20;
        this.bossMode = data.bossMode;
        this.bossModePenaltyActive = data.bossModePenaltyActive;

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
        this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
        // 设置进度条标题
        if (this.currentMissionName) {
          this.ui.updateProgressBarTitle(`🎯 ${this.currentMissionName}`);
        } else if (this.currentMapName === 'Novice Village') {
          this.ui.updateProgressBarTitle('🏘️ Novice Village');
        } else {
          this.ui.updateProgressBarTitle('🌍 Main World');
        }
        if (this.bossMode) this.ui.updateBossMode();

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
