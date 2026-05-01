// src/core/Constants.js

// ── Game State Machine ────────────────────────────────────────────────────
export const GameState = {
  INITIALIZING: 'INITIALIZING',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  STORY: 'STORY',
  MAP_GENERATION: 'MAP_GENERATION',
  MAP_EXPLORATION: 'MAP_EXPLORATION',
  COMBAT: 'COMBAT',
  GAME_OVER: 'GAME_OVER',
};

export const TurnPhase = {
  START: 'START',
  PLAYER_MOVE: 'MOVE',
  EVALUATE: 'EVALUATE',
  END: 'END',
};

export const CombatPhase = {
  TURN_START: 'TURN_START',
  AWAIT_PLAYER: 'AWAIT_PLAYER',
  EXECUTING: 'EXECUTING',
  WIN: 'WIN',
  LOSE: 'LOSE',
};

// ── Multi-map parameter presets (single source of truth) ─────────────────────────────────────
// Note: MapConfig directly references here, do not duplicate to avoid inconsistent values.
export const MapPresets = {
  main: {
    name: 'Lost Forest',
    radius: 11,
    tileSize: 40,
    padding: 100,  // Initial camera edge padding
    eventLogic: 'default',
  },
  novice: {
    name: 'Novice Village',
    radius: 5,
    tileSize: 40,
    padding: 80,
    eventLogic: 'default',
  },
  // Add more map presets below ↓
};

// ── MapConfig: Derived from main preset, for main.js / GameController use ──
// Read-only shortcut, do not modify values here, change MapPresets.main instead.
export const MapConfig = {
  RADIUS: MapPresets.main.radius,
  TILE_SIZE: MapPresets.main.tileSize,
  PADDING: MapPresets.main.padding,
};

// ── Turn progress configuration ─────────────────────────────────────────────────
export const TurnConfig = {
  MAX_TURNS: 20,
};