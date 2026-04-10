// src/core/TurnManager.js
// ══════════════════════════════════════════════════════════════════════════════
// 回合管理器 - 集中管理回合计数和进度条
//
// 职责：
//   1. 管理回合计数器 (turnCount, currentMaxTurns)
//   2. 管理进度条UI (宽度、标题、危险状态)
//   3. 处理任务开始/结束逻辑
//   4. 提供存档/读档支持
//   5. 与UI和GameController协调
// 
// 设计模式：关注点分离
//   - GameController 调用 TurnManager 方法
//   - TurnManager 通过传入的 UI 引用调用 UI 方法
//   - TaskList 保持独立处理任务特定的逻辑
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 回合条 UI 文本常量 - 统一管理所有进度条相关文本
 */
export const PROGRESS_BAR_TEXTS = {
  // 地图标题
  NOVICE_VILLAGE: '🏘️ Novice Village',
  MAIN_MAP: '🗺️ Explore the map',
  FIND_VILLAGE: 'Find Village',
  
  // 任务/特殊标题格式
  MISSION_PREFIX: '🎯 ',
  SEARCH_RUINS: '🎯 Search ruins',
  
  // Boss 模式
  BOSS_MODE_TITLE: 'Warning',
  BOSS_MODE_DESC: 'Complete the task as soon as possible!',
};

export class TurnManager {
  /**
   * 构造函数
   * @param {UIManager} ui - UIManager 的引用，用于更新进度条
   * @param {number} initialMaxTurns - 初始回合上限
   */
  constructor(ui, initialMaxTurns = 20) {
    this.ui = ui;
    this.turnCount = 0;
    this.currentMaxTurns = initialMaxTurns;
    this.currentMissionName = null;
    this._progressBarTitle = null;
    this.bossMode = false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 回合计数管理
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 回合计数加 1 并更新进度条
   */
  incrementTurn() {
    this.turnCount += 1;
    this._updateProgressBar();
  }

  /**
   * 重置回合计数为 0
   */
  resetTurnCount() {
    this.turnCount = 0;
    this._updateProgressBar();
  }

  /**
   * 设置回合计数为指定值
   * @param {number} value - 新的回合计数
   */
  setTurnCount(value) {
    this.turnCount = Math.max(0, value);
    this._updateProgressBar();
  }

  /**
   * 检查是否达到回合上限
   * @returns {boolean} 如果 turnCount >= currentMaxTurns 返回 true
   */
  isTurnLimitReached() {
    return this.turnCount >= this.currentMaxTurns;
  }

  /**
   * 获取剩余回合数
   * @returns {number} currentMaxTurns - turnCount
   */
  getRemainingTurns() {
    return Math.max(0, this.currentMaxTurns - this.turnCount);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 回合上限管理
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 设置最大回合上限
   * @param {number} maxTurns - 新的最大回合数
   */
  setMaxTurns(maxTurns) {
    this.currentMaxTurns = Math.max(1, maxTurns);
    this._updateProgressBar();
  }

  /**
   * 进入 Boss 模式（特殊的UI状态）
   * @param {number} maxTurns - Boss 战斗的回合上限（默认 10）
   */
  enterBossMode(maxTurns = 10) {
    this.bossMode = true;
    this.currentMaxTurns = maxTurns;
    this.turnCount = 0;
    this.ui.updateBossMode();
    this._updateProgressBar();
  }

  /**
   * 退出 Boss 模式
   */
  exitBossMode() {
    this.bossMode = false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 任务管理
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 启动新任务并设置自定义回合上限
   * @param {string} missionName - 任务名称
   * @param {number} maxTurns - 该任务的回合上限
   */
  startMission(missionName, maxTurns = 5) {
    this.currentMissionName = missionName;
    this.turnCount = 0;
    this.currentMaxTurns = maxTurns;
    this.bossMode = false;

    // ──更新UI──
    this.ui.updateProgressBar(0, maxTurns);
    this.setProgressBarTitle(PROGRESS_BAR_TEXTS.MISSION_PREFIX + missionName);
  }

  /**
   * 结束当前任务并恢复视图
   */
  endMission() {
    this.currentMissionName = null;
    this._restoreProgressBarTitle();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 进度条UI控制
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 内部方法：更新进度条视觉效果
   */
  _updateProgressBar() {
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
    
    // ──只在达到回合上限时触发临界状态──
    if (this.turnCount >= this.currentMaxTurns && !this.bossMode) {
      this.ui.setProgressBarCritical();
    } else {
      this.ui.setProgressBarNormal();
    }
  }

  /**
   * 设置进度条标题（例如："🏘️ Novice Village"）
   * @param {string} title - 新标题
   */
  setProgressBarTitle(title) {
    this._progressBarTitle = title;
    this.ui.updateProgressBarTitle(title);
  }

  /**
   * 根据当前上下文恢复默认进度条标题
   * @param {string} contextType - 'novice' | 'main' | 'custom'
   * @param {string} customTitle - 当 contextType 为 'custom' 时的自定义标题
   */
  restoreProgressBarTitle(contextType = 'novice', customTitle = null) {
    let title = PROGRESS_BAR_TEXTS.NOVICE_VILLAGE;
    
    if (contextType === 'main') {
      title = PROGRESS_BAR_TEXTS.MAIN_MAP;
    } else if (contextType === 'custom' && customTitle) {
      title = customTitle;
    }
    
    this.setProgressBarTitle(title);
  }

  /**
   * 内部方法：恢复进度条标题（私有）
   */
  _restoreProgressBarTitle() {
    // ──根据当前上下文恢复──
    if (this.currentMissionName) {
      this.setProgressBarTitle(`🎯 ${this.currentMissionName}`);
    } else {
      this.restoreProgressBarTitle();
    }
  }

  /**
   * 显示游戏结束画面
   * @param {string} message - 游戏结束消息
   */
  showGameOver(message) {
    this.ui.showGameOver(message);
  }

  /**
   * 手动将进度条设置为危险状态
   */
  setCritical() {
    this.ui.setProgressBarCritical();
  }

  /**
   * 手动将进度条设置为正常状态
   */
  setNormal() {
    this.ui.setProgressBarNormal();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 存档/读档支持
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 序列化回合状态用于保存
   * @returns {Object} 序列化的状态
   */
  serialize() {
    return {
      turnCount: this.turnCount,
      currentMaxTurns: this.currentMaxTurns,
      currentMissionName: this.currentMissionName,
      bossMode: this.bossMode,
      _progressBarTitle: this._progressBarTitle,
    };
  }

  /**
   * 从保存文件反序列化回合状态
   * @param {Object} data - 序列化的状态
   */
  deserialize(data) {
    if (data.turnCount !== undefined) this.turnCount = data.turnCount;
    if (data.currentMaxTurns !== undefined) this.currentMaxTurns = data.currentMaxTurns;
    if (data.currentMissionName !== undefined) this.currentMissionName = data.currentMissionName;
    if (data.bossMode !== undefined) this.bossMode = data.bossMode;
    if (data._progressBarTitle !== undefined) this._progressBarTitle = data._progressBarTitle;
    
    // ──刷新UI──
    this._updateProgressBar();
    if (this._progressBarTitle) {
      this.ui.updateProgressBarTitle(this._progressBarTitle);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 工具方法
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * 获取回合状态字符串
   * @returns {string} 例如："Turn 5/20"
   */
  getStatusString() {
    return `Turn ${this.turnCount}/${this.currentMaxTurns}`;
  }

  /**
   * 检查是否处于 Boss 模式
   * @returns {boolean} 如果在 Boss 战斗中返回 true
   */
  isInBossMode() {
    return this.bossMode;
  }

  /**
   * 检查是否处于任务中
   * @returns {boolean} 如果任务激活返回 true
   */
  isOnMission() {
    return this.currentMissionName !== null;
  }

  /**
   * 获取当前任务名称
   * @returns {string|null} 任务名称或 null
   */
  getCurrentMission() {
    return this.currentMissionName;
  }
}
