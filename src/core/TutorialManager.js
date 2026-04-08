// src/core/TutorialManager.js
// ══════════════════════════════════════════════════════════════════════
// 新手教程管理器（完整版）
//
// 功能：
//   1. 开局锁定操作 → NPC 讲解游戏规则 → 解锁操作 → 弹出任务 HUD
//   2. 每类事件触发前，NPC 先弹出介绍，介绍完再正常进入事件
//   3. 每类事件介绍只出现一次
//   4. 全部任务完成后解锁出口传送阵
// ══════════════════════════════════════════════════════════════════════

import {
  TileType,
  makeNPC, makeDungeon, makeTreasure, makeAltar, makeMerchant, makePortal
} from '../world/Tile.js';
import { MapPresets } from './Constants.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { TaskList } from './TaskList.js';

// ── 出口传送阵位置（新手村中心）────────────────────────────────────
const EXIT_Q = 0;
const EXIT_R = 0;

// ── 开局 NPC 讲解台词 ───────────────────────────────────────────────
const INTRO_LINES = [
  '欢迎来到新手村，年轻的冒险者！我是老向导，在你出发前让我带你熟悉这片世界。',
  '这个世界是回合制的。每回合开始时你会获得移动力，点击地图上的格子就可以移动过去。',
  '移动力用完后点击"End Turn"结束回合，下一回合会重新获得移动力。注意——总回合数有限制，不要浪费！',
  '地图上有各种事件格子：宝箱可以获得装备，祭坛可以恢复生命，商人可以交易，当然还有需要战斗的怪物。',
  '战斗时你可以使用技能攻击敌人，也可以使用道具。击败敌人会获得战利品，可以在背包里装备它们。',
  '按 B 键可以随时打开背包，查看和管理你的装备。',
  '好了，理论说够了！接下来我来告诉你具体要做什么...',
];

// ── 各事件类型的介绍台词（每类只触发一次）──────────────────────────
const EVENT_INTRO = {
  dungeon: {
    lines: [
      '前方有一只怪物！',
      '战斗开始后你可以选择技能攻击，也可以使用道具。',
      '击败怪物会获得战利品，记得在背包里装备它们！',
    ],
  },
  treasure: {
    lines: [
      '哦！一个宝箱！年轻人你的运气不错嘛！',
      '宝箱里可能有装备，也可能有道具。听我说说它们的区别——这很重要！',
      '装备嘛，就是武器之类的东西。每个角色只有两个装备槽，而且装备认主人的！Knight的大剑Wizard拿不动，Wizard的法杖Knight也看不上。',
      '道具就随和多了，药水啊什么的，不管是Knight、Wizard、Priest还是Ranger，人人都能用！',
      '还有一点——不同的装备会给角色带来不同的技能！装备选得好，战斗事半功倍！',
      '好了废话说完了，快去开箱子吧！',
    ],
  },
  altar: {
    lines: [
      '这是一座神秘的祭坛！',
      '在祭坛祈祷可以恢复一定量的生命值，非常有用。',
      '记得在血量低的时候多利用祭坛！',
    ],
  },
  merchant: {
    lines: [
      '这里有一位商人！',
      '商人可以出售各种道具和装备，也可以收购你不需要的物品。',
      '和商人好好打交道，他的货物对冒险很有帮助。',
    ],
  },

shop: {
  lines: [
    '哦！这是一家商店！冒险途中最重要的补给站。',
    '每家商店都有一把随机武器和三件道具，买之前看清楚适用的角色，好好搭配一下！',
    '商店还提供神圣祝福，花点金币就能给全队回血。血量告急的时候别忘了这个选项！',
    '每家商店的货物是固定的，不满意可以花金币刷新换一批。不同地方的商店货物互不影响，多跑几家也是个办法！',
    '金币来之不易，买东西前想清楚优先级——武器能直接提升战斗力，道具则是关键时刻的救命稻草。',
  ],
},
};

export class TutorialManager {
  constructor(gc) {
    this.gc = gc;
    this.allDone = false;

    // ── 任务清单管理 ───────────────────────────────────────────────
    this.taskList = new TaskList(() => this._onAllTasksComplete());

    // 记录哪些事件类型已经介绍过（每类只介绍一次）
    this._introducedEvents = new Set();
    this._inventoryIntroduced = false;
    this._lootIntroduced = false;
    // 对话框实例
    this._dialogue = new DialogueBox();

    // 锁定玩家操作（开局讲解期间）
    this._locked = true;

    // ── 初始化流程 ────────────────────────────────────────────────────
    this._showIntroDialogue();
  }

  // ══════════════════════════════════════════════════════════════════
  // 开局流程：显示讲解对话 → 解锁操作 → 显示 HUD
  // ══════════════════════════════════════════════════════════════════
  _showIntroDialogue() {
    // 锁定移动：包装 movePlayer，讲解期间点击无效
    const origMove = this.gc.movePlayer.bind(this.gc);
    const self = this;
    this.gc.movePlayer = function (...args) {
      if (self._locked) return;
      return origMove(...args);
    };

    this._dialogue.show(
        { name: '老向导', avatar: '🧙', lines: INTRO_LINES },
        () => {
          this._locked = false;
          this._patchShowEvent();
          this._patchFsmTransition();
          this._patchPlayerMovement();
          setTimeout(() => {
            this.gc.ui.showEvent(
                '📋 新手训练任务',
                '完成以下所有训练，出口传送阵便会开启：\n\n⚔️  击败一只怪物\n🎁  打开一个宝箱\n🔮  在祭坛祈祷\n🛒  拜访村庄商人\n🎒  查看你的背包（按 B 键）\n\n全部完成后，地图中央会出现传送阵！',
                [{ text: '明白！', onClick: () => this.taskList.initHUD() }]
            );
          }, 100);
        }
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 公开：标记任务完成（InventoryUI 直接调用）
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    this.taskList.complete(key);
  }

  // ══════════════════════════════════════════════════════════════════
  // 包装玩家移动：通知 TaskList 检查坐标相关任务
  // ══════════════════════════════════════════════════════════════════
  _patchPlayerMovement() {
    const origMovePlayer = this.gc.movePlayer.bind(this.gc);
    const self = this;

    this.gc.movePlayer = function (q, r, ...args) {
      const result = origMovePlayer(q, r, ...args);
      
      // 通知 TaskList 检查玩家是否到达了任何任务的目标坐标
      self.taskList.checkPlayerPosition(self.gc.player.q, self.gc.player.r);
      
      return result;
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // 包装 ui.showEvent：事件触发前先弹 NPC 介绍
  // ══════════════════════════════════════════════════════════════════
  _patchShowEvent() {
    const ui = this.gc.ui;
    const original = ui.showEvent.bind(ui);
    const self = this;

    ui.showEvent = function (title, desc, buttons = [], ...rest) {
      buttons = [...(buttons ?? [])];
      if (self.gc.currentMapName !== 'Novice Village' || self.allDone) {
        return original(title, desc, buttons, ...rest);
      }

      // 识别事件类型
      const t = String(title ?? '');
      // 新手村里地牢和祭坛移除离开选项，必须完成
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('🔮') || t.includes('Altar')) {
        buttons = buttons.filter(b =>
            !['🏃 Retreat', 'Retreat', '🚶 Leave', 'Leave', '离开'].includes(b.text)
        );
      }
      let eventType = null;
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('Boss'))  eventType = 'dungeon';
      if (t.includes('🎁') || t.includes('Treasure'))                      eventType = 'treasure';
      if (t.includes('🔮') || t.includes('Altar'))                         eventType = 'altar';
      if (t.includes('训练营商人'))                                         eventType = 'merchant';
     if (t.includes('🛒') || t.includes('Shop'))                          eventType = 'shop';
      if (t.includes('老向导'))                                             eventType = 'npc';

      // 识别任务完成

      if (t.includes('训练营商人'))  self.complete('visited_merchant');
      if (t.includes('🎁') || t.includes('Treasure')) self.complete('opened_chest');
      
      // 第一次获得战利品分配界面后，提示玩家去背包查看
      if ((t.includes('🎁') || t.includes('获得物品')) && !self._lootIntroduced) {
        self._lootIntroduced = true;
        const origButtons = buttons;
        buttons = buttons.map(b => ({
          ...b,
          onClick: () => {
            b.onClick?.();
            setTimeout(() => {
              self._dialogue.show(
                  { name: '老向导', avatar: '🧙', lines: [
                      '拿到装备了！记得可以按 B 键或者点击右上角图标打开背包哦，随时调整英雄装备击败敌人！',
                      '装备之后英雄的属性会提升，还会解锁新技能，战斗力大增！',
                    ]},
                  () => {}
              );
            }, 300);
          }
        }));
      }
      if (t.includes('🔮') || t.includes('Altar') || t.includes('Divine Light')) self.complete('visited_altar');

      // 如果这个事件类型还没介绍过，先弹 NPC 介绍，再触发原事件
      const intro = eventType ? EVENT_INTRO[eventType] : null;
      if (intro && !self._introducedEvents.has(eventType)) {
        self._introducedEvents.add(eventType);
        self._dialogue.show(
          { name: '老向导', avatar: '🧙', lines: intro.lines },
          () => original(title, desc, buttons, ...rest)  // 介绍完再触发原事件
        );
      } else {
        original(title, desc, buttons, ...rest);
      }
    };
  }

  _patchFsmTransition() {
    const fsm = this.gc.fsm;
    const original = fsm.transition.bind(fsm);
    const self = this;

    fsm.transition = function (newState, ...args) {
      const prevState = fsm.currentState;
      const wasWin = self.gc.combatManager?.phase === 'WIN';
      const result = original(newState, ...args);

      // ── 检测进入主地图时的任务切换 ────────────────────────────────────
      if (
          newState === 'MAP_EXPLORATION' &&
          self.gc.currentMapName !== 'Novice Village' &&
          self.taskList.getCurrentMission() === 'Novice Village'
      ) {
        setTimeout(() => {
          self.taskList.switchToMission('Main Map - Rescue Villagers');
        }, 100);
      }

      // 第一次进入战斗时介绍战斗系统
      if (
          newState === 'COMBAT' &&
          self.gc.currentMapName === 'Novice Village' &&
          !self._introducedEvents.has('combat')
      ) {
        self._introducedEvents.add('combat');
        setTimeout(() => {
          self._dialogue.show(
              { name: '老向导', avatar: '🧙', lines: [
                  '哎哎哎！别慌，老夫来给你讲讲怎么打！',
                  '战斗是回合制的，速度高的一方先出手——所以Ranger特别喜欢偷袭！',
                  '点击技能攻击敌人，不同装备带来不同技能，选对技能事半功倍！',
                  '实在不行还可以用道具，比如药水，危急时刻能救你一命！',
                  '击败怪物后会掉落战利品，记得装备到英雄身上！',
                  '好了，冲啊！老夫在旁边给你加油！',
                ]},
              () => {}
          );
        }, 500);
      }

      if (
          prevState === 'COMBAT' &&
          newState === 'MAP_EXPLORATION' &&
          self.gc.currentMapName === 'Novice Village' &&
          wasWin
      ) {
        self.complete('fought_enemy');
      }
      return result;
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // 全部任务完成时的回调
  // ══════════════════════════════════════════════════════════════════
  _onAllTasksComplete() {
    if (this.allDone) return;

    this.allDone = true;
    
    // 检查是否在新手村
    if (this.gc.currentMapName === 'Novice Village') {
      this._unlockExitPortal();
      // 延迟一秒再弹，确保事件弹窗已经关闭
      setTimeout(() => {
        this._showCompletionMessage();
      }, 1000);
    }
  }

  _unlockExitPortal() {
    const map = this.gc.noviceVillage;
    if (!map) return;

    // 找靠近中心的草地格子
    let targetQ = 0, targetR = 0;
    let found = false;
    for (let dist = 0; dist <= 3 && !found; dist++) {
      for (let q = -dist; q <= dist && !found; q++) {
        for (let r = -dist; r <= dist && !found; r++) {
          if (Math.abs(q + r) > dist) continue;
          const tile = map.getTile(q, r);
          if (tile && tile.type.moveCost === 1 && !tile.content) {
            targetQ = q;
            targetR = r;
            found = true;
          }
        }
      }
    }

    const tile = map.getTile(targetQ, targetR);
    if (!tile) return;
    tile.type = TileType.GRASS;

    const mainQ = -MapPresets.main.radius + 1;
    const mainR =  MapPresets.main.radius - 1;
    const portal = makePortal('主地图', mainQ, mainR);
    portal.name = '✨ 前往迷失森林';
    map.placeContent(targetQ, targetR, portal, 3);

    // 把坐标存起来，让向导告知玩家
    this._exitPortalPos = { q: targetQ, r: targetR };
  }

  _showCompletionMessage() {
    setTimeout(() => {
      this._dialogue.show(
          { name: '老向导', avatar: '🧙', lines: [
              '做得好，冒险者！你已经掌握了所有基本技能！',
              '我已经为你开启了前往迷失森林的传送阵，它就在新手村的中央！',
              '走上传送阵即可进入主世界，真正的冒险从现在开始，祝你好运！',
            ]},
          () => {
            // TaskList 会自动根据 autoCleanupOnComplete 标志处理清理逻辑
            // TutorialManager 不再需要管理这个
          }
      );
    }, 1000);
  }

}

