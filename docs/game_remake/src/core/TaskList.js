// src/core/TaskList.js
// ══════════════════════════════════════════════════════════════════════
// Task Manager - Responsible for all task-related logic
//
// Features:
//   1. Manage different mission sets (Novice Village, main map tasks, etc.)
//   2. Manage task list and completion status
//   3. Render task HUD
//   4. Handle task completion events
//   5. Provide callback mechanism for task completion
// ══════════════════════════════════════════════════════════════════════

// ── Mission Task Definitions ──────────────────────────────────────────────────
const MISSION_TASKS = {
  // Novice Village Tasks
  'Novice Village': {
    showDebugBtn: true,
    autoCleanupOnComplete: true,
    tasks: {
      fought_enemy:     { done: false, label: '⚔️  Defeat a monster' },
      opened_chest:     { done: false, label: '🎁  Open a chest' },
      visited_altar:    { done: false, label: '🔮  Pray at an altar' },
      opened_inventory: { done: false, label: '🎒  Open your inventory' },
    }
  },
  // Main Map - Rescue Villagers Tasks
  'Main Map - Rescue Villagers': {
    showDebugBtn: false,
    autoCleanupOnComplete: false,
    nextMission: 'Find the village',  // Auto-switch to next mission on completion
    tasks: {
      rescue_villagers: { 
        done: false, 
        label: '🚨 Rescue villager',
        completeWhen: 'reachCoord',  // Completion condition type
        targetQ: -8,                  // Target coordinate Q
        targetR: 7,                   // Target coordinate R
      },
    }
  },
  // Find the village Tasks
  'Find the village': {
    showDebugBtn: false,
    autoCleanupOnComplete: false,
    nextMission: 'Rescue the Caravan',  // Auto-switch to next mission on completion
    maxTurns: 10,  // ── Mission time limit ──
    tasks: {
      find_village: { 
        done: false, 
        label: '🏘️  Find village',
        completeWhen: 'reachCoord',
        targetQ: -6,
        targetR: 2,
      },
    }
  },
  // Rescue the Caravan Tasks
  'Rescue the Caravan': {
    showDebugBtn: false,
    autoCleanupOnComplete: false,
    nextMission: 'Search Ruins',  // Auto-switch to next mission on completion
    maxTurns: 10,  // ── Mission time limit ──
    tasks: {
      rescue_caravan: {
        done: false,
        label: '🚨 Rescue the Caravan',
        completeWhen: 'reachCoord',
        targetQ: -2,
        targetR: -5,
      },
    }
  },
  // Search Ruins Tasks
  'Search Ruins': {
    showDebugBtn: false,
    autoCleanupOnComplete: false,
    nextMission: 'Head south to seek the true treasure',
    maxTurns: 10,  // ── Mission time limit ──
    requiresSpecialEventCombat: true,  // ── Must defeat special event monster to switch mission ──
    tasks: {
      search_ruins: {
        done: false,
        label: '🏛️  Search ruins',
        completeWhen: 'reachCoord',
        targetQ: 5,
        targetR: -6,
      },
    }
  },
  // Seek the True Treasure Tasks
  'Head south to seek the true treasure': {
    showDebugBtn: false,
    autoCleanupOnComplete: false,
    maxTurns: 15,  // ── Mission time limit ──
    tasks: {
      seek_treasure: {
        done: false,
        label: '🧭 Head south to seek the true treasure',
      },
    }
  },
};

export class TaskList {
  constructor(onAllTasksComplete = null, onMissionSwitch = null) {
    this._hudEl = null;
    this._debugBtn = null;
    this._onAllTasksComplete = onAllTasksComplete;
    this._onMissionSwitch = onMissionSwitch;  // ── Mission switch callback ──
    this._currentMission = 'Novice Village';
    this._showDebugBtn = true;
    this._autoCleanupOnComplete = true;  // Auto-cleanup current mission set on completion
    this.tasks = {};
    this.gameController = null;  // ── GameController reference ──
    
    // Initialize Novice Village tasks
    this._initializeTasks('Novice Village');
  }

  // ══════════════════════════════════════════════════════════════════
  // Set GameController reference
  // ══════════════════════════════════════════════════════════════════
  setGameController(gameController) {
    this.gameController = gameController;
  }

  // ══════════════════════════════════════════════════════════════════
  // Initialize specific mission set
  // ══════════════════════════════════════════════════════════════════
  _initializeTasks(missionName) {
    const mission = MISSION_TASKS[missionName];
    if (!mission) {
      console.warn(`Mission "${missionName}" not found`);
      return;
    }
    
    this._currentMission = missionName;
    this._showDebugBtn = mission.showDebugBtn || false;
    this._autoCleanupOnComplete = mission.autoCleanupOnComplete !== false;  // 默认 true
    this.tasks = JSON.parse(JSON.stringify(mission.tasks));  // Deep copy to avoid polluting the original definition
  }

  // ══════════════════════════════════════════════════════════════════
  // Register new mission set (allow dynamic addition)
  // ══════════════════════════════════════════════════════════════════
  registerMission(missionName, taskDefinition, showDebugBtn = false) {
    MISSION_TASKS[missionName] = {
      showDebugBtn,
      tasks: taskDefinition
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Switch mission set
  // ══════════════════════════════════════════════════════════════════
  switchToMission(missionName) {
    if (this._currentMission === missionName) return;
    
    this._initializeTasks(missionName);
    
    // ── Call mission switch callback ──────────────────────────────────────
    if (this._onMissionSwitch) {
      this._onMissionSwitch(missionName);
    }
    
    // Clean up old HUD
    if (this._hudEl) {
      this._hudEl.style.transition = 'opacity 0.2s ease';
      this._hudEl.style.opacity = '0';
      const oldHudEl = this._hudEl;
      setTimeout(() => oldHudEl?.remove(), 250);
      this._hudEl = null;
    }
    if (this._debugBtn) {
      this._debugBtn.remove();
      this._debugBtn = null;
    }
    
    // Delay creating new HUD to ensure old HUD is fully cleaned up
    setTimeout(() => {
      this.initHUD();
    }, 300);
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: Mark task as complete
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    if (!this.tasks[key] || this.tasks[key].done) return;
    this.tasks[key].done = true;
    this._updateHUD();
    this._checkAllDone();
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: Remove a task from the task list
  // ══════════════════════════════════════════════════════════════════
  removeTask(key) {
    if (!this.tasks[key]) return;
    delete this.tasks[key];
    this._updateHUD();
    this._checkAllDone();
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: Check player position and auto-complete "reach coordinate" tasks
  // ══════════════════════════════════════════════════════════════════
  checkPlayerPosition(playerQ, playerR) {
    Object.keys(this.tasks).forEach(key => {
      const task = this.tasks[key];
      // Check if it is a "reach coordinate" type task and not completed
      if (task.completeWhen === 'reachCoord' && !task.done) {
        // If the player reaches the target coordinate, remove this task
        if (playerQ === task.targetQ && playerR === task.targetR) {
          this.removeTask(key);
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Get current mission set name
  // ══════════════════════════════════════════════════════════════════
  getCurrentMission() {
    return this._currentMission;
  }

  // ══════════════════════════════════════════════════════════════════
  // Get turn limit for current mission set
  // ══════════════════════════════════════════════════════════════════
  getMissionMaxTurns() {
    const mission = MISSION_TASKS[this._currentMission];
    return mission?.maxTurns || 10;  // Default 10 turns
  }

  // ══════════════════════════════════════════════════════════════════
  // Check if all tasks are completed
  // ══════════════════════════════════════════════════════════════════
  isAllTasksDone() {
    return Object.values(this.tasks).every(t => t.done);
  }

  // ══════════════════════════════════════════════════════════════════
  // Initialize HUD task progress panel
  // ══════════════════════════════════════════════════════════════════
  initHUD() {
    const el = document.createElement('div');
    el.id = 'tutorial-hud';
    el.style.cssText = `
      position: fixed;
      top: 80px;      /* 位于右上角背包的下方 */
      right: 20px;    /* 靠右对齐 */
      background: rgba(10,8,6,0.88);
      border: 1px solid rgba(251,191,36,0.4);
      border-radius: 12px;
      padding: 14px 16px;
      color: white;
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      width: 320px;    /* 固定宽度 */
      z-index: 50;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.6);
    `;
    
    // Debug button: complete all tasks with one click (only shown in Novice Village)
    if (this._showDebugBtn) {
      const debugBtn = document.createElement('button');
      debugBtn.textContent = '⏩ Skip Tutorial';
      debugBtn.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 20px;
        background: rgba(239,68,68,0.85);
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        color: white;
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        cursor: pointer;
        z-index: 999;
      `;
      debugBtn.addEventListener('click', () => {
        Object.keys(this.tasks).forEach(key => this.complete(key));
      });
      document.body.appendChild(debugBtn);
      this._debugBtn = debugBtn;

      const syncDebugBtn = () => {
        const inCombat = window._gameController?.fsm?.currentState === 'COMBAT';
        debugBtn.style.display = inCombat ? 'none' : 'block';
      };
      syncDebugBtn();
      this._debugBtnInterval = setInterval(syncDebugBtn, 300);
    }
    
    document.body.appendChild(el);
    this._hudEl = el;
    this._updateHUD();
  }

  // ══════════════════════════════════════════════════════════════════
  // Update HUD display
  // ══════════════════════════════════════════════════════════════════
  _updateHUD() {
    if (!this._hudEl) return;
    const entries = Object.values(this.tasks);
    const done = entries.filter(t => t.done).length;
    const total = entries.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const rows = entries.map(t => `
      <div style="
        display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;
        flex-wrap:wrap;
        opacity:${t.done ? '0.45' : '1'};
        text-decoration:${t.done ? 'line-through' : 'none'};
        color:${t.done ? '#9ca3af' : '#f3f4f6'};
        transition:all 0.3s;
        word-break:break-word;
      ">
        <span style="flex-shrink:0;margin-top:2px;">${t.done ? '✅' : '⭕'}</span>
        <span style="flex:1;">${t.label}</span>
      </div>
    `).join('');

    this._hudEl.innerHTML = `
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#fbbf24;letter-spacing:0.04em;">
       📋 Tasks
      </div>
      ${rows}
      <div style="margin-top:10px;background:rgba(255,255,255,0.08);border-radius:6px;height:5px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#f59e0b,#fbbf24);border-radius:6px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px;">${done} / ${total}</div>
    `;
  }

  // ══════════════════════════════════════════════════════════════════
  // Check all tasks completed
  // ══════════════════════════════════════════════════════════════════
  _checkAllDone() {
    if (!Object.values(this.tasks).every(t => t.done)) return;
    
    // Check if special event monster needs to be defeated
    const currentMissionConfig = MISSION_TASKS[this._currentMission];
    if (currentMissionConfig?.requiresSpecialEventCombat && this.gameController) {
      if (!this.gameController.hasDefeatedSpecialEventMonster) {
        // Special event monster not yet defeated, do not switch mission
        return;
      }
    }
    
    // Check if there is a next mission set
    if (currentMissionConfig && currentMissionConfig.nextMission) {
      // ── Clear Boss mode state (when switching missions) ──────────────────────────
      // Note: GameController reference is not available here, so handle externally
      
      // Delay switching to the next mission set to ensure current mission is fully cleaned up
      setTimeout(() => {
        this.switchToMission(currentMissionConfig.nextMission);
      }, 800);
      return;  // Return early, do not trigger completion callback
    }
    
    if (this._onAllTasksComplete) {
      this._onAllTasksComplete();
    }
    // If the current mission set is set to auto-cleanup, clean up after completion
    if (this._autoCleanupOnComplete) {
      setTimeout(() => {
        this.cleanup();
      }, 1500);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Clean up HUD (called after task completion)
  // ══════════════════════════════════════════════════════════════════
  cleanup() {
    if (this._hudEl) {
      this._hudEl.style.transition = 'opacity 0.8s ease';
      this._hudEl.style.opacity = '0';
      setTimeout(() => this._hudEl?.remove(), 900);
    }
    if (this._debugBtn) this._debugBtn.remove();
    if (this._debugBtnInterval) clearInterval(this._debugBtnInterval);
  }
}
