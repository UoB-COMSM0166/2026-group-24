// src/core/TutorialManager.js
// ══════════════════════════════════════════════════════════════════════
// Tutorial Manager (Full Version)
//
// Features:
//   1. Lock controls at start → NPC explains rules → Unlock → Show task HUD
//   2. Before each event type triggers, NPC gives an intro first
//   3. Each event type intro only appears once
//   4. Unlock exit portal after all tasks are completed
// ══════════════════════════════════════════════════════════════════════

import {
  TileType,
  makeNPC, makeDungeon, makeTreasure, makeAltar, makeMerchant, makePortal
} from '../world/Tile.js';
import { MapPresets } from './Constants.js';
import { DialogueBox } from '../ui/DialogueBox.js';

// ── Exit portal position (center of Novice Village) ──────────────────
const EXIT_Q = 0;
const EXIT_R = 0;

// ── Opening NPC dialogue lines ────────────────────────────────────────
const INTRO_LINES = [
  'Welcome to the Novice Village, young adventurer! I am the Old Guide. Let me help you get familiar with this world before you set off.',
  'This world is turn-based. At the start of each turn you receive movement points — click a tile on the map to move there.',
  'When your movement points run out, click "End Turn" to end your turn and recover points next round. Watch out — the total number of turns is limited, don\'t waste them!',
  'The map has various event tiles: chests give equipment, altars restore health, merchants let you trade, and of course there are monsters to fight.',
  'In combat you can use skills to attack enemies, or use items. Defeating enemies drops loot — equip it in your inventory.',
  'Press B at any time to open your inventory and manage your equipment.',
  'Enough theory! Let me tell you what to do next...',
];

// ── Event intro lines (each type triggers only once) ──────────────────
const EVENT_INTRO = {
  dungeon: {
    lines: [
      'There\'s a monster ahead!',
      'Once combat starts, you can choose skills to attack or use items.',
      'Defeating monsters drops loot — remember to equip it in your inventory!',
    ],
  },
  treasure: {
    lines: [
      'Oh! A treasure chest! You\'re in luck, young adventurer!',
      'Chests can contain equipment or items. Let me explain the difference — it\'s important!',
      'Equipment means weapons and such. Each hero only has two equipment slots, and weapons are class-specific! A Knight\'s greatsword is useless to a Wizard, and vice versa.',
      'Items are much more flexible — potions and the like can be used by any class: Knight, Wizard, Priest, or Ranger!',
      'One more thing — different weapons unlock different skills for your hero! Choose wisely for maximum effectiveness!',
      'Alright, enough talk — go open that chest!',
    ],
  },
  altar: {
    lines: [
      'This is a mysterious altar!',
      'Praying at the altar restores a portion of your HP — very useful.',
      'Remember to use the altar when your health is low!',
    ],
  },
  merchant: {
    lines: [
      'There\'s a merchant here!',
      'Merchants sell various items and equipment, and can also buy things you don\'t need.',
      'Build a good relationship with merchants — their goods can be very helpful on your adventure.',
    ],
  },
  shop: {
    lines: [
      'Oh! It\'s a mysterious shop!',
      'The shop\'s inventory refreshes every time you enter — grab something good when you see it!',
      'Buying items and equipment requires gold. Defeating monsters and opening chests both drop gold, so explore often!',
      'Purchased items go directly into the shared inventory — press B anytime to open your bag and equip them.',
    ],
  },
};

// ── Inventory tutorial lines ──────────────────────────────────────────
const INVENTORY_INTRO_LINES = [
  'Oh! You opened your inventory! Let me show you how it works!',
  'On the left is the Shared Storage — it holds all unequipped weapons and items. Anyone in the party can take from here.',
  'On the right is the currently selected hero. Click the portrait tabs at the top to switch between heroes.',
  'Weapon slots only accept weapons matching the hero\'s class — each hero can equip up to two! Equipping a weapon unlocks new skills and boosts power!',
  'Item slots hold consumables like potions — any class can use them, and they can be activated during combat.',
  'Drag items to slots to equip them, or double-click to equip quickly. Drag equipped items back to the left to unequip.',
  'Now go equip what you just found!',
];

export class TutorialManager {
  constructor(gc) {
    this.gc = gc;
    this.allDone = false;

    // ── Task list ─────────────────────────────────────────────────────
    this.tasks = {
      fought_enemy:     { done: false, label: '⚔️  Defeat a monster' },
      opened_chest:     { done: false, label: '🎁  Open a chest' },
      visited_altar:    { done: false, label: '🔮  Use an altar' },
      visited_shop:     { done: false, label: '🏪  Visit the shop' },
      opened_inventory: { done: false, label: '🎒  Open inventory' },
    };

    // Track which event types have already been introduced
    this._introducedEvents = new Set();
    this._inventoryIntroduced = false;
    this._shopIntroduced = false;
    this._lootIntroduced = false;
    // Dialogue box instance
    this._dialogue = new DialogueBox();

    // Lock player controls during opening dialogue
    this._locked = true;

    // ── Initialization ────────────────────────────────────────────────
    this._showIntroDialogue();
  }

  // ══════════════════════════════════════════════════════════════════
  // Opening flow: show dialogue → unlock controls → show HUD
  // ══════════════════════════════════════════════════════════════════
  _showIntroDialogue() {
    // Lock movement: wrap movePlayer so clicks are ignored during dialogue
    const origMove = this.gc.movePlayer.bind(this.gc);
    const self = this;
    this.gc.movePlayer = function (...args) {
      if (self._locked) return;
      return origMove(...args);
    };

    this._dialogue.show(
        { name: 'Old Guide', avatar: '🧙', lines: INTRO_LINES },
        () => {
          this._locked = false;
          this._patchShowEvent();
          this._patchFsmTransition();
          this._patchInventory();
          this._patchShop();
          setTimeout(() => {
            this.gc.ui.showEvent(
                '📋 Novice Training Tasks',
                'Complete all of the following tasks to unlock the exit portal:\n\n⚔️  Defeat a monster\n🎁  Open a chest\n🔮  Pray at an altar\n🏪  Visit the mysterious shop\n🎒  Open your inventory (press B)\n\nOnce all tasks are done, a portal will appear at the center of the map!',
                [{ text: 'Got it!', onClick: () => this._initHUD() }]
            );
          }, 100);
        }
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: mark a task as complete (called directly by InventoryUI)
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    if (!this.tasks[key] || this.tasks[key].done) return;
    this.tasks[key].done = true;
    this._updateHUD();
    this._checkAllDone();
  }

  // ══════════════════════════════════════════════════════════════════
  // Wrap ui.showEvent: show NPC intro before each event triggers
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
      // Remove retreat/leave options for dungeon and altar in Novice Village
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('🔮') || t.includes('Altar')) {
        buttons = buttons.filter(b =>
            !['🏃 Retreat', 'Retreat', '🚶 Leave', 'Leave'].includes(b.text)
        );
      }
      let eventType = null;
      if (t.includes('⚔️') || t.includes('Enemy') || t.includes('Boss'))  eventType = 'dungeon';
      if (t.includes('🎁') || t.includes('Treasure'))                      eventType = 'treasure';
      if (t.includes('🔮') || t.includes('Altar'))                         eventType = 'altar';
      if (t.includes('Old Guide'))                                          eventType = 'npc';
      if (t.includes('🏪') || t.includes('Mysterious Shop'))               eventType = 'shop';

      // Mark tasks complete
      if (t.includes('🎁') || t.includes('Treasure')) self.complete('opened_chest');
      // After first loot assignment, remind player to open inventory
      if ((t.includes('🎁') || t.includes('Item obtained')) && !self._lootIntroduced) {
        self._lootIntroduced = true;
        buttons = buttons.map(b => ({
          ...b,
          onClick: () => {
            b.onClick?.();
            setTimeout(() => {
              self._dialogue.show(
                  { name: 'Old Guide', avatar: '🧙', lines: [
                      'You got some loot! Remember to press B or click the icon in the top-right to open your inventory and equip it!',
                      'Equipping items boosts your hero\'s stats and unlocks new skills — a big power spike!',
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
          { name: 'Old Guide', avatar: '🧙', lines: intro.lines },
          () => original(title, desc, buttons, ...rest)
        );
      } else {
        original(title, desc, buttons, ...rest);
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Wrap fsm.transition: detect combat victory
  // ══════════════════════════════════════════════════════════════════
  _patchFsmTransition() {
    const fsm = this.gc.fsm;
    const original = fsm.transition.bind(fsm);
    const self = this;

    fsm.transition = function (newState, ...args) {
      const prevState = fsm.currentState;
      const wasWin = self.gc.combatManager?.phase === 'WIN';
      const result = original(newState, ...args);

      // Introduce combat system on first combat entry
      if (
          newState === 'COMBAT' &&
          self.gc.currentMapName === 'Novice Village' &&
          !self._introducedEvents.has('combat')
      ) {
        self._introducedEvents.add('combat');
        setTimeout(() => {
          self._dialogue.show(
              { name: 'Old Guide', avatar: '🧙', lines: [
                  'Whoa! Don\'t panic — let me explain how to fight!',
                  'Combat is turn-based. The unit with higher speed goes first — that\'s why Rangers love to ambush!',
                  'Click a skill to attack. Different weapons unlock different skills, so choose wisely!',
                  'You can also use items like potions in a pinch — they could save your life!',
                  'Defeating monsters drops loot — remember to equip it on your heroes!',
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
  // Wrap InventoryUI.toggle: show inventory tutorial on first open
  // ══════════════════════════════════════════════════════════════════
  _patchInventory() {
    const tryPatch = () => {
      const inv = this.gc.ui?.inventoryUI;
      if (!inv) {
        setTimeout(tryPatch, 200);
        return;
      }
      const origToggle = inv.toggle.bind(inv);
      const self = this;
      inv.toggle = function (...args) {
        const wasOpen = inv.isOpen;
        origToggle(...args);
        // First open (wasOpen was false → now true)
        if (!wasOpen && inv.isOpen && !self._inventoryIntroduced) {
          self._inventoryIntroduced = true;
          setTimeout(() => {
            self._dialogue.show(
              { name: 'Old Guide', avatar: '🧙', lines: INVENTORY_INTRO_LINES },
              () => {}
            );
          }, 150);
        }
      };
    };
    tryPatch();
  }

  // ══════════════════════════════════════════════════════════════════
  // Wrap _handleTileContent: show shop tutorial on first visit
  // ══════════════════════════════════════════════════════════════════
  _patchShop() {
    const self = this;
    const origHandleTile = this.gc._handleTileContent.bind(this.gc);
    this.gc._handleTileContent = function(tile) {
      const c = tile?.content;
      if (
        c?.type === 'shop' &&
        self.gc.currentMapName === 'Novice Village' &&
        !self._shopIntroduced
      ) {
        self._shopIntroduced = true;
        self._dialogue.show(
          { name: 'Old Guide', avatar: '🧙', lines: [
            'Oh! It\'s a mysterious shop!',
            'The shop\'s inventory refreshes every time you enter — grab something good when you see it!',
            'Buying items and equipment requires gold. Defeating monsters and opening chests both drop gold, so explore often!',
            'Purchased items go directly into the shared inventory — press B anytime to open your bag and equip them.',
          ]},
          () => {
            self.complete('visited_shop');
            origHandleTile(tile);
          }
        );
        return;
      }
      origHandleTile(tile);
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Check if all tasks are complete
  // ══════════════════════════════════════════════════════════════════
  _checkAllDone() {
    if (this.allDone) return;
    if (!Object.values(this.tasks).every(t => t.done)) return;

    this.allDone = true;
    this._unlockExitPortal();
    setTimeout(() => {
      this._showCompletionMessage();
    }, 1000);
  }

  _unlockExitPortal() {
    const map = this.gc.noviceVillage;
    if (!map) return;

    // Find a grass tile near the center
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
    const portal = makePortal('Main Map', mainQ, mainR);
    portal.name = '✨ Enter the Lost Forest';
    map.placeContent(targetQ, targetR, portal, 3);

    this._exitPortalPos = { q: targetQ, r: targetR };
  }

  _showCompletionMessage() {
    setTimeout(() => {
      this._dialogue.show(
          { name: 'Old Guide', avatar: '🧙', lines: [
              'Well done, adventurer! You have mastered all the basic skills!',
              'I have opened the portal to the Lost Forest — it\'s right at the center of the Novice Village!',
              'Step onto the portal to enter the main world. Your true adventure begins now — good luck!',
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
  // HUD task progress panel
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
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔧 Complete All Tasks';
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
        📋 Tutorial Tasks
      </div>
      ${rows}
      <div style="margin-top:10px;background:rgba(255,255,255,0.08);border-radius:6px;height:5px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#f59e0b,#fbbf24);border-radius:6px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px;">${done} / ${total}</div>
    `;
  }
}