// src/core/TutorialManager.js
// ══════════════════════════════════════════════════════════════════════
// Tutorial Manager (Full Version)
//
// Features:
//   1. Lock controls on start → NPC explains rules → Unlock → Show task HUD
//   2. Before each event type triggers, NPC gives an intro first
//   3. Each event type intro only appears once
//   4. Unlock exit portal after all tasks are complete
// ══════════════════════════════════════════════════════════════════════

import {
  TileType,
  makeNPC, makeDungeon, makeTreasure, makeAltar, makeMerchant, makePortal
} from '../world/Tile.js';
import { MapPresets } from './Constants.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { TaskList } from './TaskList.js';

// ── Exit portal position (center of Novice Village) ─────────────────
const EXIT_Q = 0;
const EXIT_R = 0;

// ── Opening NPC dialogue lines ───────────────────────────────────────
const INTRO_LINES = [
  'Welcome to the Novice Village, young adventurer! I am the Elder Guide. Let me show you the ropes before you set off.',
  'This world is turn-based. At the start of each turn you receive movement points — click any tile on the map to move there.',
  'Once your movement points run out, click "End Turn" to end your turn and recover points next round. Psst — you can also press Space to end your turn. Watch out, there is a total turn limit so don\'t waste them!',
  'The map is full of event tiles: chests give you gear, altars restore HP, shops sell supplies, and of course there are monsters to fight.',
  'In combat you can use skills to attack enemies or use items. Defeating enemies drops loot — equip it in your inventory to grow stronger.',
  'Press B at any time to open your inventory and manage your equipment.',
  'Enough theory! Let me tell you what to do next...',
];

// ── Event intro lines (each type only triggers once) ─────────────────
const EVENT_INTRO = {
  dungeon: {
    lines: [
      'A monster ahead!',
      'Once combat begins, you can choose a skill to attack or use an item.',
      'Defeating the monster drops loot — remember to equip it in your inventory!',
    ],
  },
  treasure: {
    lines: [
      'Oh! A treasure chest! You are in luck, young adventurer!',
      'Chests can contain weapons or items. Let me explain the difference — this is important!',
      'Weapons are class-specific. Each hero only has two weapon slots, and weapons are bound to their owner — a Knight\'s greatsword is useless to a Wizard, and vice versa.',
      'Items are much more flexible — potions and trinkets can be used by any hero, whether Knight, Wizard, Priest, or Ranger!',
      'One more thing — different weapons unlock different skills! Choosing the right gear makes a huge difference in combat.',
      'Also, each hero has different stat strengths — Knights rely on STR, Wizards on INT, Priests on TAL, and Rangers on AWR and AGI. Gear that boosts those stats will do far more for them than anything else!',
      'Always check the stat bonus before equipping something. The right item on the wrong hero is just wasted potential.',
      'Alright, enough talk — go open that chest!',
    ],
  },
  altar: {
    lines: [
      'A mysterious altar!',
      'Praying at an altar restores a portion of HP for your party — very useful.',
      'Remember to make use of altars when your HP is running low!',
    ],
  },
  merchant: {
    lines: [
      'A traveling merchant!',
      'Merchants can sell you items and gear, and buy items you no longer need.',
      'Stay on good terms with merchants — their stock can be a lifesaver on your journey.',
    ],
  },
  shop: {
    lines: [
      'Oh! A shop! The most important supply stop on any adventure.',
      'Every shop stocks one random weapon and three items. Check the required class before buying — gear is class-specific!',
      'Shops also offer Divine Blessing, which restores HP to your whole party for a small fee. Don\'t forget this option when things get dire!',
      'Each shop\'s inventory is fixed once you visit — but you can spend gold to refresh the stock. Different shops are stocked independently, so it\'s worth checking multiple ones!',
      'Gold is precious, so prioritize wisely — weapons directly boost combat power, while items can save your life at a critical moment.',
    ],
  },
};

export class TutorialManager {
  constructor(gc) {
    this.gc = gc;
    this.allDone = false;

    // ── Task list management ───────────────────────────────────────
    this.taskList = new TaskList(
      () => this._onAllTasksComplete(),
      (missionName) => this._onMissionSwitch(missionName)  // ── 任务切换回调 ──
    );

    // Track which event types have already been introduced
    this._introducedEvents = new Set();
    this._inventoryIntroduced = false;
    this._lootIntroduced = false;
    // Dialogue box instance
    this._dialogue = new DialogueBox();

    // Lock player controls during opening dialogue
    this._locked = true;

    // ── Init flow ─────────────────────────────────────────────────
    this._showIntroDialogue();
  }

  // ══════════════════════════════════════════════════════════════════
  // Opening flow: show intro dialogue → unlock controls → show HUD
  // ══════════════════════════════════════════════════════════════════
  _showIntroDialogue() {
    const origMove = this.gc.movePlayer.bind(this.gc);
    const self = this;
    this.gc.movePlayer = function (...args) {
      if (self._locked) return;
      return origMove(...args);
    };

    this._dialogue.show(
        { name: 'Elder Guide', avatar: '🧙', lines: INTRO_LINES },
        () => {
          this._locked = false;
          this._patchShowEvent();
          this._patchFsmTransition();
          this._patchPlayerMovement();
          setTimeout(() => {
            this.gc.ui.showEvent(
                '📋 Novice Training Tasks',
                'Complete all of the following tasks to unlock the exit portal:\n\n⚔️  Defeat a monster\n🎁  Open a treasure chest\n🔮  Pray at an altar\n🛒  Visit the village shop\n🎒  Open your inventory (press B)\n\nOnce all tasks are done, a portal will appear at the center of the map!',
                [{ text: 'Got it!', onClick: () => this.taskList.initHUD() }]
            );
          }, 100);
        }
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: mark a task complete (called by InventoryUI directly)
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    this.taskList.complete(key);
  }



  // ══════════════════════════════════════════════════════════════════
  // Wrap player movement: notify TaskList to check position-based tasks
  // ══════════════════════════════════════════════════════════════════
  _patchPlayerMovement() {
    const origMovePlayer = this.gc.movePlayer.bind(this.gc);
    const self = this;

    this.gc.movePlayer = function (q, r, ...args) {
      const result = origMovePlayer(q, r, ...args);
      self.taskList.checkPlayerPosition(self.gc.player.q, self.gc.player.r);
      return result;
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Wrap ui.showEvent: show NPC intro before each event type
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

      // Identify event type
      const t = String(title ?? '');

      // In Novice Village, remove retreat/leave options from dungeon and altar events
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('🔮') || t.includes('Altar')) {
        buttons = buttons.filter(b =>
            !['🏃 Retreat', 'Retreat', '🚶 Leave', 'Leave', '离开'].includes(b.text)
        );
      }

      let eventType = null;
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('Boss'))  eventType = 'dungeon';
      if (t.includes('🎁') || t.includes('Treasure'))                      eventType = 'treasure';
      if (t.includes('🔮') || t.includes('Altar'))                         eventType = 'altar';

      if (t.includes('🛒') || t.includes('Shop'))                          eventType = 'shop';
      if (t.includes('Elder Guide'))                                        eventType = 'npc';

      // Mark tasks complete

      if (t.includes('🎁') || t.includes('Treasure')) self.complete('opened_chest');

      // After first loot assignment, remind player to open inventory
      if ((t.includes('🎁') || t.includes('Loot') || t.includes('obtained')) && !self._lootIntroduced) {
        self._lootIntroduced = true;
        buttons = buttons.map(b => ({
          ...b,
          onClick: () => {
            b.onClick?.();
            setTimeout(() => {
              self._dialogue.show(
                  { name: 'Elder Guide', avatar: '🧙', lines: [
                      'You got some gear! Remember you can press B or click the backpack icon in the top right to open your inventory and equip it.',
                      'Equipping gear raises your heroes\' stats and unlocks new skills — a big boost in combat!',
                    ]},
                  () => {}
              );
            }, 300);
          }
        }));
      }

      if (t.includes('🔮') || t.includes('Altar') || t.includes('Divine Light')) self.complete('visited_altar');

      // If this event type hasn't been introduced yet, show NPC intro first
      const intro = eventType ? EVENT_INTRO[eventType] : null;
      if (intro && !self._introducedEvents.has(eventType)) {
        self._introducedEvents.add(eventType);
        self._dialogue.show(
          { name: 'Elder Guide', avatar: '🧙', lines: intro.lines },
          () => original(title, desc, buttons, ...rest)
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

      // Detect when entering the main map
      if (
          newState === 'MAP_EXPLORATION' &&
          self.gc.currentMapName !== 'Novice Village' &&
          self.taskList.getCurrentMission() === 'Novice Village'
      ) {
        setTimeout(() => {
          self.taskList.switchToMission('Main Map - Rescue Villagers');
        }, 100);
      }

      // First time entering combat: introduce the combat system
      if (
          newState === 'COMBAT' &&
          self.gc.currentMapName === 'Novice Village' &&
          !self._introducedEvents.has('combat')
      ) {
        self._introducedEvents.add('combat');
        setTimeout(() => {
          self._dialogue.show(
              { name: 'Elder Guide', avatar: '🧙', lines: [
                  'Hold on! Let me explain how combat works before you rush in!',
                  'Combat is turn-based. The unit with the highest speed goes first — that\'s why Rangers love to strike first!',
                  'Click a skill to attack the enemy. Different weapons unlock different skills, so choose wisely!',
                  'If things get tough, you can always use items like potions — they can save your life in a pinch!',
                  'Defeating a monster drops loot. Remember to equip it on your heroes afterwards!',
                  'Alright, charge! I\'ll be cheering you on from the sidelines!',
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
  // Callback when all tasks are complete
  // ══════════════════════════════════════════════════════════════════
  _onAllTasksComplete() {
    if (this.allDone) return;

    this.allDone = true;

    // ── 清除 Boss 模式惩罚状态（必须在 endMission 前清除） ──────────────────────────────────
    this.gc.bossModePenaltyActive = false;
    this.gc.bossModePenaltyWarned = false;
    this.gc.turnManager.clearBossPenalty(this.gc);  // ── 额外确保清除 ──
    this.gc.turnManager.endMission();

    if (this.gc.currentMapName === 'Novice Village') {
      this._unlockExitPortal();
      setTimeout(() => {
        this._showCompletionMessage();
      }, 1000);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Callback when mission is switched (auto transition)
  // ══════════════════════════════════════════════════════════════════
  _onMissionSwitch(missionName) {
    // ── 任务切换时，清除 Boss 模式惩罚状态 ──────────────────────────────
    this.gc.bossModePenaltyActive = false;
    this.gc.bossModePenaltyWarned = false;
    this.gc.turnManager.clearBossPenalty(this.gc);  // ── 额外确保清除 ──

    // ── 获取新任务的回合限制，并调用 _startMission 重置进度条 ────────────────
    const maxTurns = this.taskList.getMissionMaxTurns();
    this.gc._startMission(missionName, maxTurns);
  }

  _unlockExitPortal() {
    const map = this.gc.noviceVillage;
    if (!map) return;

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
    const portal = makePortal('Main World', mainQ, mainR);
    portal.name = '✨ Enter the Lost Forest';
    map.placeContent(targetQ, targetR, portal, 3);

    this._exitPortalPos = { q: targetQ, r: targetR };
  }

  _showCompletionMessage() {
    setTimeout(() => {
      this._dialogue.show(
          { name: 'Elder Guide', avatar: '🧙', lines: [
              'Well done, adventurer! You have mastered all the basic skills!',
              'I have opened the portal to the Lost Forest — it is right at the center of the Novice Village!',
              'Step onto the portal to enter the main world. The real adventure begins now — good luck!',
            ]},
          () => {}
      );
    }, 1000);
  }

}