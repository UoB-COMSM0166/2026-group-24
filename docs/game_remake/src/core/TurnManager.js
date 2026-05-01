// src/core/TurnManager.js
// ══════════════════════════════════════════════════════════════════════════════
// Turn Manager - Centralized management of turn count and progress bar
//
// Responsibilities:
//   1. Manage turn counters (turnCount, currentMaxTurns)
//   2. Manage progress bar UI (width, title, danger state)
//   3. Handle task start/end logic
//   4. Provide save/load support
//   5. Coordinate with UI and GameController
// 
// Design Pattern: Separation of concerns
//   - GameController calls TurnManager methods
//   - TurnManager calls UI methods via passed UI reference
//   - TaskList remains independent for task-specific logic
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Turn bar UI text constants - unified management of all progress bar related texts
 */
export const PROGRESS_BAR_TEXTS = {
  // Map titles
  NOVICE_VILLAGE: '🏘️ Novice Village',
  MAIN_MAP: '🗺️ Explore the map',
  FIND_VILLAGE: 'Find Village',
  
  // Mission/special title format
  MISSION_PREFIX: '🎯 ',
  SEARCH_RUINS: '🎯 Search ruins',
  
  // Boss mode
  BOSS_MODE_TITLE: 'Warning',
  BOSS_MODE_DESC: 'Complete the task as soon as possible!',
};

export class TurnManager {
  /**
   * Constructor
   * @param {UIManager} ui - Reference to UIManager, used to update progress bar
   * @param {number} initialMaxTurns - Initial turn limit
   */
  constructor(ui, initialMaxTurns = 20) {
    this.ui = ui;
    this.turnCount = 0;
    this.currentMaxTurns = initialMaxTurns;
    this.currentMissionName = null;
    this._progressBarTitle = null;
    this.bossMode = false;
    this._preBossModeTurns = null;  // ── Save turn limit before entering Boss mode ──
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Turn count management
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Increment turn count by 1 and update progress bar
   */
  incrementTurn() {
    this.turnCount += 1;
    this._updateProgressBar();
  }

  /**
   * Reset turn count to 0
   */
  resetTurnCount() {
    this.turnCount = 0;
    this._updateProgressBar();
  }

  /**
   * Set turn count to specified value
   * @param {number} value - New turn count
   */
  setTurnCount(value) {
    this.turnCount = Math.max(0, value);
    this._updateProgressBar();
  }

  /**
   * Check if turn limit is reached
   * @returns {boolean} Returns true if turnCount >= currentMaxTurns
   */
  isTurnLimitReached() {
    return this.turnCount >= this.currentMaxTurns;
  }

  /**
   * Get remaining turns
   * @returns {number} currentMaxTurns - turnCount
   */
  getRemainingTurns() {
    return Math.max(0, this.currentMaxTurns - this.turnCount);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Turn limit management
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Set maximum turn limit
   * @param {number} maxTurns - New maximum number of turns
   */
  setMaxTurns(maxTurns) {
    this.currentMaxTurns = Math.max(1, maxTurns);
    this._updateProgressBar();
  }

  /**
   * Enter Boss mode (special UI state)
   * @param {number} maxTurns - Turn limit for Boss battle (default 10)
   */
  enterBossMode(maxTurns = 10) {
    this._preBossModeTurns = this.currentMaxTurns;  // ── Save turn limit before Boss mode ──
    this.bossMode = true;
    this.currentMaxTurns = maxTurns;
    this.turnCount = 0;
    this.ui.updateBossMode();
    this._updateProgressBar();
  }

  /**
   * Exit Boss mode
   */
  exitBossMode() {
    this.bossMode = false;
    this.turnCount = 0;  // ── Reset turn count ──
    if (this._preBossModeTurns !== null) {
      this.currentMaxTurns = this._preBossModeTurns;  // ── Restore turn limit before Boss mode ──
      this._preBossModeTurns = null;
    }
    
    // ── Ensure progress bar is fully restored to normal state ──
    this.ui.setProgressBarNormal();  // ── Remove critical style, blinking effect, red background ──
    this._restoreProgressBarTitle();  // ── Restore original title ──
    
    // ── Force update of progress bar display, including description text ──
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Mission management
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Start a new mission and set custom turn limit
   * @param {string} missionName - Mission name
   * @param {number} maxTurns - Turn limit for this mission
   */
  startMission(missionName, maxTurns = 5) {
    this.currentMissionName = missionName;
    this.turnCount = 0;
    this.currentMaxTurns = maxTurns;
    this.bossMode = false;

    // ──Update UI──
    this.ui.updateProgressBar(0, maxTurns);
    this.setProgressBarTitle(PROGRESS_BAR_TEXTS.MISSION_PREFIX + missionName);
  }

  /**
   * End current mission and restore view
   */
  endMission() {
    this.currentMissionName = null;
    this.exitBossMode();  // ── Clear Boss mode state ──
    this._restoreProgressBarTitle();
  }

  /**
   * Clear all penalty states related to Boss mode (should be called by GameController)
   * @param {GameController} gameController - Reference to game controller
   */
  clearBossPenalty(gameController) {
    if (gameController) {
      gameController.bossModePenaltyActive = false;
      gameController.bossModePenaltyWarned = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Progress bar UI control
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Internal method: update progress bar visual effect
   */
  _updateProgressBar() {
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
    
    // ──Only trigger critical state when turn limit is reached──
    if (this.turnCount >= this.currentMaxTurns && !this.bossMode) {
      this.ui.setProgressBarCritical();
    } else {
      this.ui.setProgressBarNormal();
    }
  }

  /**
   * Set progress bar title (e.g., "🏘️ Novice Village")
   * @param {string} title - New title
   */
  setProgressBarTitle(title) {
    this._progressBarTitle = title;
    this.ui.updateProgressBarTitle(title);
  }

  /**
   * Restore default progress bar title based on current context
   * @param {string} contextType - 'novice' | 'main' | 'custom'
   * @param {string} customTitle - Custom title when contextType is 'custom'
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
   * Internal method: restore progress bar title (private)
   */
  _restoreProgressBarTitle() {
    // ──Restore based on current context──
    if (this.currentMissionName) {
      this.setProgressBarTitle(`🎯 ${this.currentMissionName}`);
    } else {
      this.restoreProgressBarTitle();
    }
  }

  /**
   * Show game over screen
   * @param {string} message - Game over message
   */
  showGameOver(message) {
    this.ui.showGameOver(message);
  }

  /**
   * Manually set progress bar to critical state
   */
  setCritical() {
    this.ui.setProgressBarCritical();
  }

  /**
   * Manually set progress bar to normal state
   */
  setNormal() {
    this.ui.setProgressBarNormal();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Save/Load support
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Serialize turn state for saving
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      turnCount: this.turnCount,
      currentMaxTurns: this.currentMaxTurns,
      currentMissionName: this.currentMissionName,
      bossMode: this.bossMode,
      _progressBarTitle: this._progressBarTitle,
      _preBossModeTurns: this._preBossModeTurns,
    };
  }

  /**
   * Deserialize turn state from save file
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    if (data.turnCount !== undefined) this.turnCount = data.turnCount;
    if (data.currentMaxTurns !== undefined) this.currentMaxTurns = data.currentMaxTurns;
    if (data.currentMissionName !== undefined) this.currentMissionName = data.currentMissionName;
    if (data.bossMode !== undefined) this.bossMode = data.bossMode;
    if (data._progressBarTitle !== undefined) this._progressBarTitle = data._progressBarTitle;
    if (data._preBossModeTurns !== undefined) this._preBossModeTurns = data._preBossModeTurns;
    
    // ──Refresh UI──
    this._updateProgressBar();
    if (this._progressBarTitle) {
      this.ui.updateProgressBarTitle(this._progressBarTitle);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Utility methods
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get turn status string
   * @returns {string} e.g., "Turn 5/20"
   */
  getStatusString() {
    return `Turn ${this.turnCount}/${this.currentMaxTurns}`;
  }

  /**
   * Check if in Boss mode
   * @returns {boolean} Returns true if in Boss battle
   */
  isInBossMode() {
    return this.bossMode;
  }

  /**
   * Check if on a mission
   * @returns {boolean} Returns true if mission is active
   */
  isOnMission() {
    return this.currentMissionName !== null;
  }

  /**
   * Get current mission name
   * @returns {string|null} Mission name or null
   */
  getCurrentMission() {
    return this.currentMissionName;
  }
}
