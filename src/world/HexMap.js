// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';
import { MapGenerator } from './MapGenerator.js';
import { MapPresets } from '../core/Constants.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { hexToPixel } from './Tile.js';

// ── Map factory (create by preset name) ───────────────────────────
export function createMapByPreset(presetName) {
  const preset = MapPresets[presetName];
  if (!preset) throw new Error('Map preset not found: ' + presetName);
  const seed = presetName === 'novice' ? 42 : SeededRandom.randomSeed();
  return new HexMap(preset.radius, preset.tileSize, seed);
}

/**
 * HexMap
 *
 * Data container for hexagonal map, only responsible for storing Tiles and providing query/operation interfaces.
 * All generation logic (terrain, barriers, events) is delegated to MapGenerator.
 *
 * Performance optimization points:
 *  1. Key of tiles changed to integer to eliminate string concatenation and GC on each query.
 *  2. draw() performs viewport clipping, only draws tiles visible on screen.
 *  3. worldBounds precomputed for Camera.setBounds use.
 */
export class HexMap {

  // Key encoding offset, supports maps with radius ≤ 99
  static KEY_OFFSET = 100;
  static KEY_STRIDE = 200; // 2 * KEY_OFFSET

  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {
    this.radius = radius;
    this.tileSize = tileSize;
    this.rng = new SeededRandom(seed);
    this.tiles = new Map();   // key: integer → Tile

    const gen = new MapGenerator(this.rng);
    gen.generateTerrain(this);
    gen.generateEvents(this);

    // 预计算世界边界（供相机边界钳位）
    this.worldBounds = this._computeWorldBounds();
  }

  // ── Key encoding ───────────────────────────────────────────────
  /** Encode (q, r) axial coordinates as a single integer key to avoid string allocation. */
  static encodeKey(q, r) {
    return (q + HexMap.KEY_OFFSET) * HexMap.KEY_STRIDE + (r + HexMap.KEY_OFFSET);
  }

  /** Decode integer key back to (q, r) (for debugging). */
  static decodeKey(key) {
    const r = (key % HexMap.KEY_STRIDE) - HexMap.KEY_OFFSET;
    const q = Math.floor(key / HexMap.KEY_STRIDE) - HexMap.KEY_OFFSET;
    return { q, r };
  }

  // ── Query ─────────────────────────────────────────────────────
  getTile(q, r) {
    return this.tiles.get(HexMap.encodeKey(q, r));
  }

  setTile(q, r, tile) {
    this.tiles.set(HexMap.encodeKey(q, r), tile);
  }

  // ── Reveal surrounding tiles ──────────────────────────────────
  revealAround(q, r, revealRadius = 1) {
    for (let dq = -revealRadius; dq <= revealRadius; dq++) {
      for (let dr = -revealRadius; dr <= revealRadius; dr++) {
        if (Math.abs(dq + dr) > revealRadius) continue;
        const tile = this.getTile(q + dq, r + dr);
        if (tile && !tile.isRevealed) tile.isRevealed = true;
      }
    }
  }

  /**
   * Place event content and automatically reveal this tile + several rings of fog of war around it.
   * Also ensure there is at least one passable tile around.
   */
  placeContent(q, r, content, revealRadius = 2) {
    const tile = this.getTile(q, r);
    if (!tile) return;
    tile.content = content;
    // 固定特殊事件（如NPC、村庄等）不会自动被揭示，保持被黑雾遮掩
    if (!tile.isFixedEvent) {
      this.revealAround(q, r, revealRadius);
    }
    this._ensureAccessibilityAroundTile(q, r);
  }

  /**
   * Ensure there is at least one passable tile around the specified tile.
   * If all surrounding tiles are mountains/forest/boundary, randomly change one to grassland.
   * @private
   */
  _ensureAccessibilityAroundTile(q, r) {
    // Get 6 neighbors around
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];
    const neighbors = [];
    for (const [dq, dr] of directions) {
      const tile = this.getTile(q + dq, r + dr);
      if (tile) neighbors.push(tile);
    }

    // Check if there is at least one passable tile
    const hasAccessible = neighbors.some(tile => tile.type.moveCost < Infinity);
    
    if (!hasAccessible && neighbors.length > 0) {
      // Collect all tiles that can be changed to grassland
      const modifiable = neighbors.filter(tile => 
        tile.type.moveCost === Infinity &&  // 当前不可通行
        !tile.content  // 没有其他事件内容
      );
      
      if (modifiable.length > 0) {
        // Randomly select one to change to grassland
        const idx = Math.floor(Math.random() * modifiable.length);
        modifiable[idx].type = TileType.GRASS;
      }
    }
  }

  // ── Coordinate conversion ─────────────────────────────────────
  pixelToHex(x, y) {
    const q = (2 / 3 * x) / this.tileSize;
    const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.tileSize;
    return this.hexRound(q, r);
  }

  hexRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  // ── Drawing (with viewport clipping) ─────────────────────────
  /**
   * 绘制地图，仅渲染相机视口内可见的格子。
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera}  camera
   * @param {string|null} selectedKey  当前选中格的字符串 key（兼容旧格式 "q,r"）
   * @param {boolean} debugMode
   */
  draw(ctx, camera, selectedKey = null, debugMode = false) {
    const size = this.tileSize;
    const zoom = camera.zoom ?? 1;

    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(zoom, zoom);

    // ── Viewport clipping: get visible world rectangle, convert to hex range ──
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // Four corners of the screen → world coordinates
    const wx0 = (0 - camera.x) / zoom;
    const wy0 = (0 - camera.y) / zoom;
    const wx1 = (cw - camera.x) / zoom;
    const wy1 = (ch - camera.y) / zoom;

    // World pixels → hex coordinates (rough estimate, add 2-tile margin to avoid edge clipping)
    // x = size * 1.5 * q  =>  q ≈ x / (size * 1.5)
    const MARGIN = 2;
    const qMin = Math.floor(wx0 / (size * 1.5)) - MARGIN;
    const qMax = Math.ceil(wx1 / (size * 1.5)) + MARGIN;

    // y = size * (√3/2 * q + √3 * r)  =>  r ≈ (y/size - √3/2 * q) / √3
    const SQ3 = Math.sqrt(3);
    const rMin = Math.floor((wy0 / size - SQ3 / 2 * qMax) / SQ3) - MARGIN;
    const rMax = Math.ceil((wy1 / size - SQ3 / 2 * qMin) / SQ3) + MARGIN;

    // ── Traverse visible range, draw corresponding Tile ─────────────
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        if (Math.abs(q) > this.radius ||
          Math.abs(r) > this.radius ||
          Math.abs(q + r) > this.radius) continue;

        const tile = this.getTile(q, r);
        if (!tile) continue;

        const isSelected = selectedKey === `${q},${r}`;
        const visState = this._visStateOf(tile);

        tile.draw(ctx, size, isSelected, visState, debugMode);
      }
    }

    // ── Draw glow effect above all tiles ───────────────────────────
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        if (Math.abs(q) > this.radius ||
          Math.abs(r) > this.radius ||
          Math.abs(q + r) > this.radius) continue;

        const tile = this.getTile(q, r);
        if (!tile || !tile.isBlinking || !tile.content) continue;

        const visState = this._visStateOf(tile);
        if (visState !== 'visible') continue;

        // Draw yellow glow
        const { x, y } = tile.getCanvasPos(size);
        const hexPath = Tile.getHexPath(size);
        
        const elapsedTime = performance.now() - tile.blinkStartTime;
        const cycleTime = (elapsedTime % 1500) / 1500;
        const glowIntensity = 0.2 + 0.3 * Math.sin(cycleTime * Math.PI * 2);
        const glowBlur = 32 + 32 * Math.sin(cycleTime * Math.PI * 2);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = `rgba(255, 0, 0, ${glowIntensity * 0.7})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(255, 0, 0, ${glowIntensity * 0.7})`;
        ctx.shadowBlur = glowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.stroke(hexPath);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ── Helper: calculate the visibility state of a single tile ─────
  _visStateOf(tile) {
    if (!tile.isRevealed) return 'hidden';
    return 'visible';   // 若需"已探索但视野外"，在此扩展 fog-of-war 逻辑
  }

  // ── Helper: precompute world pixel bounds for the entire map ────
  _computeWorldBounds() {
    const size = this.tileSize;
    const r = this.radius;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let q = -r; q <= r; q++) {
      const r1 = Math.max(-r, -q - r);
      const r2 = Math.min(r, -q + r);
      for (let ri = r1; ri <= r2; ri++) {
        const { x, y } = hexToPixel(q, ri, size);
        if (x - size < minX) minX = x - size;
        if (y - size < minY) minY = y - size;
        if (x + size > maxX) maxX = x + size;
        if (y + size > maxY) maxY = y + size;
      }
    }
    return { minX, minY, maxX, maxY };
  }
}