// src/world/Camera.js

export class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.zoom = 1.0;
    this.MIN_ZOOM = 0.3;
    this.MAX_ZOOM = 3.0;

    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };

    // Optional bounds (world coordinates), set by setBounds()
    this._bounds = null;
    this._canvasW = canvasWidth;
    this._canvasH = canvasHeight;
  }

  /**
   * Set the world coordinate bounds the camera can move within.
   * Call once after HexMap is generated.
   *
   * @param {number} minX  World left bound
   * @param {number} minY  World top bound
   * @param {number} maxX  World right bound
   * @param {number} maxY  World bottom bound
   */
  setBounds(minX, minY, maxX, maxY) {
    this._bounds = { minX, minY, maxX, maxY };
    this._clamp();
  }

  startDragging(x, y) {
    this.isDragging = true;
    this.lastMousePos = { x, y };
  }

  drag(x, y) {
    if (!this.isDragging) return;
    const dx = x - this.lastMousePos.x;
    const dy = y - this.lastMousePos.y;
    this.x += dx;
    this.y += dy;
    this.lastMousePos = { x, y };
    this._clamp();
  }

  stopDragging() {
    this.isDragging = false;
  }

  /**
   * Zoom with the mouse position as the anchor.
   * @param {number} pivotX  Screen anchor X (usually mouse X)
   * @param {number} pivotY  Screen anchor Y (usually mouse Y)
   * @param {number} delta   Positive to zoom in, negative to zoom out
   */
  zoomAt(pivotX, pivotY, delta) {
    const factor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, this.zoom * factor));
    const ratio = newZoom / this.zoom;

    // 保持锚点对应的世界坐标不变
    this.x = pivotX - (pivotX - this.x) * ratio;
    this.y = pivotY - (pivotY - this.y) * ratio;
    this.zoom = newZoom;
    this._clamp();
  }

  /** Screen coordinates → world coordinates (considering translation + zoom) */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom,
    };
  }

  /** World coordinates → screen coordinates */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.x,
      y: worldY * this.zoom + this.y,
    };
  }

  // ── Internal: clamp camera position within bounds ────────────────
  _clamp() {
    if (!this._bounds) return;
    const { minX, minY, maxX, maxY } = this._bounds;
    const z = this.zoom;
    const w = this._canvasW;
    const h = this._canvasH;

    // Camera x ensures world [minX, maxX] always covers the screen
    // screen = world * zoom + camera  =>  camera = screen - world * zoom
    const xMax = -minX * z + w * 0.15;          // Left edge does not expose boundary
    const xMin = -maxX * z + w * 0.85;          // Right edge does not expose boundary
    const yMax = -minY * z + h * 0.15;
    const yMin = -maxY * z + h * 0.85;

    // Only clamp when bounds make sense (if map is smaller than screen, do not restrict)
    if (xMin < xMax) this.x = Math.min(xMax, Math.max(xMin, this.x));
    if (yMin < yMax) this.y = Math.min(yMax, Math.max(yMin, this.y));
  }
}