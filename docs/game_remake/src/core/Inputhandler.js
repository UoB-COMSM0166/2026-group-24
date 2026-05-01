// src/core/Inputhandler.js
export class InputHandler {
  constructor(canvas, camera, getMap, gameController) {
    this.canvas = canvas;
    this.camera = camera;
    // Support passing a function to get the latest map (the map may be replaced during the game)
    this.getMap = typeof getMap === 'function' ? getMap : () => getMap;
    this.gameController = gameController;

    this.mouseDownPos = { x: 0, y: 0 };
    this.DRAG_THRESHOLD = 5;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onEndTurn = this._onEndTurn.bind(this);
    
    // [New] Bind keyboard event handler context to ensure 'this' is correct
    this._onKeyDown = this._onKeyDown.bind(this); 
  }

  bind(endTurnBtn) {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    // passive: false allows us to call preventDefault() to prevent page scrolling
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    
    // [New] Register global keydown event
    window.addEventListener('keydown', this._onKeyDown);

    if (endTurnBtn) {
      this.endTurnBtn = endTurnBtn;
      endTurnBtn.addEventListener('click', this._onEndTurn);
    }
  }

  unbind() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    
    // [New] Unbind global keyboard event to prevent memory leaks and repeated triggers
    window.removeEventListener('keydown', this._onKeyDown);

    if (this.endTurnBtn) {
      this.endTurnBtn.removeEventListener('click', this._onEndTurn);
    }
  }

  // [New] Specific logic for keyboard input
  _onKeyDown(e) {
    // Safety check: if the player is typing in an input box (e.g., naming, chatting), do not trigger end turn
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    
    // Listen for space key
    if (e.code === 'Space') {
      e.preventDefault(); // Prevent browser from scrolling down when space is pressed
      this._onEndTurn();  // Directly call the existing end turn method
    }
    if (e.code === 'Escape') {
      e.preventDefault();

      // If inventory panel is open, let its own ESC logic close it first, do not open pause menu
      const inventoryPanel = document.getElementById('inventory-panel');
      if (inventoryPanel && inventoryPanel.style.display !== 'none') return;

      const overlay = document.getElementById('pause-overlay');
      if (!overlay) return;

      if (overlay.classList.contains('open')) {
        // If open → close
        overlay.classList.remove('open');
      } else {
        // If not open → only open when game is running (HUD visible)
        const hud = document.getElementById('hud');
        if (hud && hud.style.display !== 'none') {
          overlay.classList.add('open');
        }
      }
    }
  }

  _onMouseDown(e) {
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.camera.startDragging(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    if (this.camera.isDragging) {
      this.camera.drag(e.clientX, e.clientY);
    }
  }

  _onMouseUp(e) {
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.camera.stopDragging();

    // Only treat as click if movement distance does not exceed threshold
    if (dist < this.DRAG_THRESHOLD) {
      const map = this.getMap();
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      const { q, r } = map.pixelToHex(world.x, world.y);
      if (map.getTile(q, r)) {
        this.gameController.movePlayer(q, r);
      }
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    // deltaY > 0 = scroll down = zoom out; deltaY < 0 = scroll up = zoom in
    this.camera.zoomAt(cx, cy, -e.deltaY);
  }

  _onEndTurn() {
    this.gameController.onEndTurnBtnClick();
  }
}