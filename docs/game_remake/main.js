// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap, createMapByPreset } from './src/world/HexMap.js';
import { makePortal, hexToPixel, DebugConfig } from './src/world/Tile.js';  // ← hexToPixel imported from Tile.js
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
import { Renderer } from './src/rendering/Renderer.js';
// ⚠️ Keep your fault tolerance fix: strictly match local lowercase filename Inputhandler.js
import { InputHandler } from './src/core/Inputhandler.js';
import { UIManager } from './src/ui/UIManager.js';
import { TitleScreen } from './src/ui/TitleScreen.js';

// ── Canvas responsive ───────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const bootLoadingScreen = document.getElementById('boot-loading-screen');
const bootLoadingBar = document.getElementById('boot-loading-bar');
const bootLoadingText = document.getElementById('boot-loading-text');
const bootLoadingPercent = document.getElementById('boot-loading-percent');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function updateBootLoading({ percentage = 0, text = 'PREPARING ASSETS...' } = {}) {
    const safePercent = Math.max(0, Math.min(100, percentage));
    if (bootLoadingBar) bootLoadingBar.style.width = `${safePercent}%`;
    if (bootLoadingPercent) bootLoadingPercent.textContent = `${safePercent}%`;
    if (bootLoadingText) bootLoadingText.textContent = text;
    if (bootLoadingScreen) bootLoadingScreen.classList.remove('is-hidden');
}

function hideBootLoading() {
    if (bootLoadingScreen) bootLoadingScreen.classList.add('is-hidden');
}

// ── Start game ─────────────────────────────────────────────────
async function init() {
    updateBootLoading({ percentage: 0, text: 'PREPARING ASSETS...' });

    // 1. Load data
    try {
        await DataLoader.loadAll(({ percentage }) => {
            updateBootLoading({
                percentage,
                text: percentage >= 100 ? 'READY TO START' : 'LOADING GAME ASSETS...'
            });
        });
    } catch (error) {
        updateBootLoading({ percentage: 100, text: 'LOADING FAILED. CHECK CONSOLE.' });
        alert("Data loading failed! Please check if DataLoader.js, heroes.json and skills.json are in the src/data/ directory!");
        console.error(error);
        return;
    }

    // 2. Initialize music player
    window.BGMPlayer = {
        current: null,
        play(src, loop = true) {
            if (this.current) {
                this.current.pause();
                this.current.currentTime = 0;
            }
            this.current = new Audio(src);
            this.current.loop = loop;
            this.current.volume = 0.5;
            this.current.play();
        },
        stop() {
            if (this.current) {
                this.current.pause();
                this.current.currentTime = 0;
                this.current = null;
            }
        }
    };

    // 3. Show title screen, enter game after clicking START
    const titleScreen = new TitleScreen(
      () => startGame(false), // New game
      () => startGame(true) ,  // Load save
      () => startGame(false, true)  // Developer mode
    );
    titleScreen.show();
    hideBootLoading();
}

function startGame(isLoad = false, isDevMode = false) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // ── Initialize core components ────────────────────────────────────────
    const map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
    const camera = new Camera(canvas.width, canvas.height);
    const player = new Player('Leader');

    // Play map background music
    window.BGMPlayer.play('resource/music/map.mp3');

    // Initialize camera targeting lower-left starting position (using hexToPixel imported from Tile.js)
    const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
    camera.x = MapConfig.PADDING - bottomLeft.x;
    camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

    // UIManager deep integration: align all DOM nodes
    const reactRoot = document.getElementById('react-combat-root');

    const ui = new UIManager(
        {
            charSelectScreen: document.getElementById('char-select-screen'),
            heroSlots: document.getElementById('hero-slots'),
            charConfirmBtn: document.getElementById('char-confirm-btn'),
            charSelectedInfo: document.getElementById('char-selected-info'),
            mapGenScreen: document.getElementById('map-gen-screen'),
            hud: document.getElementById('hud'),
            movementEl: document.getElementById('movement-points'),
            combatUI: reactRoot,
            reactCombatRoot: reactRoot,
            eventUI: document.getElementById('event-ui'),
            eventTitle: document.getElementById('event-title'),
            eventDesc: document.getElementById('event-desc'),
            eventButtons: document.getElementById('event-buttons')
        },
        {
            onCombatEnd: (result) => {
              if (result === 'lose') {
                location.reload();
              } else {
                gameController.fsm.transition(GameState.MAP_EXPLORATION);
              }
            }
        }
    );

    // Initialize controller
    const gameController = new GameController(map, player, ui, camera);
    window._gameController = gameController;
    if (isDevMode) gameController.isDevMode = true;
    // Listen for state changes and switch music
    const origTransition = gameController.fsm.transition.bind(gameController.fsm);
    gameController.fsm.transition = function (state, ...args) {
        if (state === 'COMBAT') {
            window.BGMPlayer.play('resource/music/fight.mp3');
        } else if (state === 'MAP_EXPLORATION') {
            window.BGMPlayer.play('resource/music/map.mp3');
        }
        return origTransition(state, ...args);
    };

    // Input handling
    const inputHandler = new InputHandler(
        canvas,
        camera,
        () => gameController.map,
        gameController
    );
    inputHandler.bind(document.getElementById('end-turn-btn'));

    // --- Add Save button binding logic here ---
    const saveBtn = document.getElementById('save-game-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            gameController.saveGame();
        });
    }
    const pauseOverlay   = document.getElementById('pause-overlay');
    const pmSaveBtn      = document.getElementById('pm-save-btn');
    const pmResumeBtn    = document.getElementById('pm-resume-btn');
    const pmTitleBtn     = document.getElementById('pm-title-btn');
    const pauseVolSlider = document.getElementById('pause-vol-slider');

    const closePauseMenu = () => pauseOverlay?.classList.remove('open');

// Sync initial value of volume slider
    if (pauseVolSlider && window.BGMPlayer) {
        pauseVolSlider.value = window.BGMPlayer.globalVolume ?? 0.5;
    }
// Adjust volume in real time
    pauseVolSlider?.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (window.BGMPlayer) {
            window.BGMPlayer.globalVolume = v;
            if (window.BGMPlayer.current) window.BGMPlayer.current.volume = v;
        }
    });
// Save in menu
    pmSaveBtn?.addEventListener('click', () => {
        gameController.saveGame();
    });
// Resume / Click blank area of overlay to close
    pmResumeBtn?.addEventListener('click', closePauseMenu);
    pauseOverlay?.addEventListener('click', (e) => {
        if (e.target === pauseOverlay) closePauseMenu();
    });
// Return to main title
    pmTitleBtn?.addEventListener('click', () => {
        if (!confirm('Return to main menu? Unsaved progress will be lost.')) return;
        closePauseMenu();
        window.BGMPlayer?.stop();
        location.reload();
    });
    // Debug mode button
    const debugBtn = document.getElementById('debug-toggle-btn');
    debugBtn.addEventListener('click', () => {
        Renderer.debugMode = !Renderer.debugMode;
        DebugConfig.showHiddenFixedEvents = Renderer.debugMode;  // Show hidden special events in debug mode
        debugBtn.textContent = Renderer.debugMode ? '🐛 Debug: ON' : '🐛 Debug: OFF';
        debugBtn.style.background = Renderer.debugMode ? '#27ae60' : '#e67e22';
    });

    // Start state machine and enter character selection
    if (isLoad) {
        if (gameController.loadGame()) {
             // Load successful, directly play map BGM and enter game
             window.BGMPlayer.play('resource/music/map.mp3');
        } else {
             alert("Failed to load save file or file is corrupted!");
             gameController.fsm.transition(GameState.CHARACTER_SELECT);
        }
    } else if (isDevMode) {
        gameController.startDevMode();
    } else {
        gameController.fsm.transition(GameState.CHARACTER_SELECT);
    }

    // Start main game loop
    new GameLoop(
        dt => gameController.update(dt),
        () => gameController.render(ctx, camera)
    ).start();
}

init();
