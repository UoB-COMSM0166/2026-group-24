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
    tasks: {
      rescue_villagers: { 
        done: false, 
        label: '🚨 Rescue villager',
        completeWhen: 'reachCoord',  // Completion condition type
        targetQ: -8,                  // Target coordinate Q
        targetR: 7,                   // Target coordinate R
      },
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
    tasks: {
      seek_treasure: {
        done: false,
        label: '🧭 Head south to seek the true treasure',
      },
    }
  },
};

export class TaskList {
  constructor(onAllTasksComplete = null) {
    this._hudEl = null;
    this._debugBtn = null;
    this._onAllTasksComplete = onAllTasksComplete;
    this._currentMission = 'Novice Village';
    this._showDebugBtn = true;
    this._autoCleanupOnComplete = true;  // Auto-cleanup current mission set on completion
    this.tasks = {};
    
    // Initialize Novice Village tasks
    this._initializeTasks('Novice Village');
  }

  // ══════════════════════════════════════════════════════════════════
  // 初始化特定任务集
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
    this.tasks = JSON.parse(JSON.stringify(mission.tasks));  // 深拷贝，避免污染原定义
  }

  // ══════════════════════════════════════════════════════════════════
  // 注册新任务集（允许动态添加）
  // ══════════════════════════════════════════════════════════════════
  registerMission(missionName, taskDefinition, showDebugBtn = false) {
    MISSION_TASKS[missionName] = {
      showDebugBtn,
      tasks: taskDefinition
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // 切换任务集
  // ══════════════════════════════════════════════════════════════════
  switchToMission(missionName) {
    if (this._currentMission === missionName) return;
    
    this._initializeTasks(missionName);
    
    // 清理旧 HUD
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
    
    // 延迟创建新 HUD，确保旧 HUD 完全清理
    setTimeout(() => {
      this.initHUD();
    }, 300);
  }

  // ══════════════════════════════════════════════════════════════════
  // 公开：标记任务完成
  // ══════════════════════════════════════════════════════════════════
  complete(key) {
    if (!this.tasks[key] || this.tasks[key].done) return;
    this.tasks[key].done = true;
    this._updateHUD();
    this._checkAllDone();
  }

  // ══════════════════════════════════════════════════════════════════
  // 公开：从任务列表中移除一条任务
  // ══════════════════════════════════════════════════════════════════
  removeTask(key) {
    if (!this.tasks[key]) return;
    delete this.tasks[key];
    this._updateHUD();
    this._checkAllDone();
  }

  // ══════════════════════════════════════════════════════════════════
  // 公开：检查玩家位置，自动完成"到达坐标"的任务
  // ══════════════════════════════════════════════════════════════════
  checkPlayerPosition(playerQ, playerR) {
    Object.keys(this.tasks).forEach(key => {
      const task = this.tasks[key];
      // 检查是否是"到达坐标"类型的任务且未完成
      if (task.completeWhen === 'reachCoord' && !task.done) {
        // 如果玩家到达目标坐标，移除这个任务
        if (playerQ === task.targetQ && playerR === task.targetR) {
          this.removeTask(key);
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // 获取当前任务集名称
  // ══════════════════════════════════════════════════════════════════
  getCurrentMission() {
    return this._currentMission;
  }

  // ══════════════════════════════════════════════════════════════════
  // 检查是否所有任务都已完成
  // ══════════════════════════════════════════════════════════════════
  isAllTasksDone() {
    return Object.values(this.tasks).every(t => t.done);
  }

  // ══════════════════════════════════════════════════════════════════
  // 初始化 HUD 任务进度面板
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
      font-size: 12px; /* 字体稍微调大一点点更清晰 */
      min-width: 180px;
      z-index: 50;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.6);
    `;
    
    // 调试按钮：一键完成所有任务（仅在新手村显示）
    if (this._showDebugBtn) {
      const debugBtn = document.createElement('button');
      debugBtn.textContent = '🔧 完成所有任务';
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
    }
    
    document.body.appendChild(el);
    this._hudEl = el;
    this._updateHUD();
  }

  // ══════════════════════════════════════════════════════════════════
  // 更新 HUD 显示
  // ══════════════════════════════════════════════════════════════════
  _updateHUD() {
    if (!this._hudEl) return;
    const entries = Object.values(this.tasks);
    const done = entries.filter(t => t.done).length;
    const total = entries.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
        📋 任务栏
      </div>
      ${rows}
      <div style="margin-top:10px;background:rgba(255,255,255,0.08);border-radius:6px;height:5px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#f59e0b,#fbbf24);border-radius:6px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px;">${done} / ${total}</div>
    `;
  }

  // ══════════════════════════════════════════════════════════════════
  // 全部完成检查
  // ══════════════════════════════════════════════════════════════════
  _checkAllDone() {
    if (!Object.values(this.tasks).every(t => t.done)) return;
    
    // 检查是否有下一个任务集
    const currentMissionConfig = MISSION_TASKS[this._currentMission];
    if (currentMissionConfig && currentMissionConfig.nextMission) {
      // 延迟切换到下一个任务集，确保当前任务完全清理
      setTimeout(() => {
        this.switchToMission(currentMissionConfig.nextMission);
      }, 800);
      return;  // 提前返回，不触发完成回调
    }
    
    if (this._onAllTasksComplete) {
      this._onAllTasksComplete();
    }
    // 如果当前任务集设置了自动清理，则在完成后清理
    if (this._autoCleanupOnComplete) {
      setTimeout(() => {
        this.cleanup();
      }, 1500);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 清理 HUD（任务完成后调用）
  // ══════════════════════════════════════════════════════════════════
  cleanup() {
    if (this._hudEl) {
      this._hudEl.style.transition = 'opacity 0.8s ease';
      this._hudEl.style.opacity = '0';
      setTimeout(() => this._hudEl?.remove(), 900);
    }
    if (this._debugBtn) this._debugBtn.remove();
  }
}
