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

};

export class TutorialManager {
  constructor(gc) {
    this.gc = gc;
    this.allDone = false;

    // ── 任务清单 ──────────────────────────────────────────────────────
    this.tasks = {
      fought_enemy:     { done: false, label: '⚔️  击败一只怪物' },
      opened_chest:     { done: false, label: '🎁  打开宝箱' },
      visited_altar:    { done: false, label: '🔮  使用祭坛' },
     // visited_merchant: { done: false, label: '🛒  拜访商人' },
      opened_inventory: { done: false, label: '🎒  查看背包' },
    };

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
          setTimeout(() => {
            this.gc.ui.showEvent(
                '📋 新手训练任务',
                '完成以下所有训练，出口传送阵便会开启：\n\n⚔️  击败一只怪物\n🎁  打开一个宝箱\n🔮  在祭坛祈祷\n🛒  拜访村庄商人\n🎒  查看你的背包（按 B 键）\n\n全部完成后，地图中央会出现传送阵！',
                [{ text: '明白！', onClick: () => this._initHUD() }]
            );
          }, 100);
        }
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 公开：标记任务完成（InventoryUI 直接调用）
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    if (!this.tasks[key] || this.tasks[key].done) return;
    this.tasks[key].done = true;
    this._updateHUD();
    this._checkAllDone();
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

  // ══════════════════════════════════════════════════════════════════
  // 包装 fsm.transition：检测战斗胜利
  // ══════════════════════════════════════════════════════════════════
  _patchFsmTransition() {
    const fsm = this.gc.fsm;
    const original = fsm.transition.bind(fsm);
    const self = this;

    fsm.transition = function (newState, ...args) {
      const prevState = fsm.currentState;
      const wasWin = self.gc.combatManager?.phase === 'WIN';
      const result = original(newState, ...args);

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
  // 全部完成检查
  // ══════════════════════════════════════════════════════════════════
  _checkAllDone() {
    if (this.allDone) return;
    if (!Object.values(this.tasks).every(t => t.done)) return;

    this.allDone = true;
    this._unlockExitPortal();
    // 延迟一秒再弹，确保事件弹窗已经关闭
    setTimeout(() => {
      this._showCompletionMessage();
    }, 1000);
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
            if (this._hudEl) {
              this._hudEl.style.transition = 'opacity 0.8s ease';
              this._hudEl.style.opacity = '0';
              setTimeout(() => this._hudEl?.remove(), 900);
            }
            if (this._debugBtn) this._debugBtn.remove();
          }
      );
    }, 1000);
  }

  // ══════════════════════════════════════════════════════════════════
  // HUD 任务进度面板
  // ══════════════════════════════════════════════════════════════════
  _initHUD() {
    const el = document.createElement('div');
    el.id = 'tutorial-hud';
    el.style.cssText = `
      position: fixed;
      top: 80px;
      right: 16px;
      background: rgba(10,8,6,0.88);
      border: 1px solid rgba(251,191,36,0.4);
      border-radius: 12px;
      padding: 14px 16px;
      color: white;
      font-family: sans-serif;
      font-size: 11px;
      min-width: 160px;
      z-index: 500;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.6);
    `;
    // 调试按钮：一键完成所有任务
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔧 完成所有任务';
    debugBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(239,68,68,0.85);
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      color: white;
      font-family: sans-serif;
      font-size: 13px;
      cursor: pointer;
      z-index: 999;
    `;
    debugBtn.addEventListener('click', () => {
      Object.keys(this.tasks).forEach(key => this.complete(key));
    });
    document.body.appendChild(debugBtn);
    this._debugBtn = debugBtn;
    document.body.appendChild(el);
    this._hudEl = el;
    this._updateHUD();
  }

  _updateHUD() {
    if (!this._hudEl) return;
    const entries = Object.values(this.tasks);
    const done = entries.filter(t => t.done).length;
    const total = entries.length;
    const pct = Math.round((done / total) * 100);

    const rows = entries.map(t => `
      <div style="
        display:flex;align-items:center;gap:8px;margin-bottom:5px;
        opacity:${t.done ? '0.45' : '1'};
        text-decoration:${t.done ? 'line-through' : 'none'};
        color:${t.done ? '#9ca3af' : '#f3f4f6'};
        transition:all 0.3s;
      ">
        <span>${t.done ? '✅' : '⭕'}</span>
        <span>${t.label}</span>
      </div>
    `).join('');

    this._hudEl.innerHTML = `
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#fbbf24;letter-spacing:0.04em;">
        📋 新手教程
      </div>
      ${rows}
      <div style="margin-top:10px;background:rgba(255,255,255,0.08);border-radius:6px;height:5px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#f59e0b,#fbbf24);border-radius:6px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px;">${done} / ${total}</div>
    `;
  }
}
