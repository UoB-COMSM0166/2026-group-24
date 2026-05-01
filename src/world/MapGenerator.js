// src/world/MapGenerator.js
// Tile generator — unified encapsulation of terrain generation, barrier generation, and event placement logic

import {
  Tile, TileType, TileContentType,
  makeDungeon, makeBoss, makeTreasure,
  makeAltar, makeLighthouse, makeNPC,
} from './Tile.js';
import { HexMap } from './HexMap.js';

/**
 * MapGenerator
 *
 * Responsible for executing all generation steps on an existing HexMap instance:
 *   1. generateTerrain  — fill terrain Tiles (pass in rng to ensure variant is reproducible)
 *   2. generateBarrier  — mark the outermost layer as BOUNDARY (automatically called by generateTerrain)
 *   3. generateEvents   — place random event content by probability
 *
 * Optimizations:
 *  - Inner ring guaranteed shuffle changed to unbiased Fisher-Yates algorithm.
 *  - Pass rng to Tile constructor to eliminate non-seeded Math.random() calls.
 *  - Use HexMap.setTile() instead of directly operating map.tiles, compatible with integer keys.
 */
export class MapGenerator {

  // ── Probability table (roll > threshold hits, match from high to low) ──────
  static ROLL_TABLE = [
    { threshold: 0.975, type: 'ALTAR' },
    { threshold: 0.950, type: 'DUNGEON' },
    { threshold: 0.910, type: 'TREASURE_EPIC' },
    { threshold: 0.900, type: 'TREASURE_RARE' },
    { threshold: 0.880, type: 'TREASURE_COMMON' },
    { threshold: 0.850, type: 'LIGHTHOUSE' },
  ];

  // Event types guaranteed to appear in the inner ring (order is priority)
  static GUARANTEED_EVENTS = ['ALTAR', 'DUNGEON', 'TREASURE_COMMON', 'LIGHTHOUSE'];

  /**
   * @param {SeededRandom} rng - Shared with HexMap to ensure seed consistency
   */
  constructor(rng) {
    this.rng = rng;
  }

  // ── 1. Terrain generation ───────────────────────────────────────
  generateTerrain(map) {
    const { radius, rng } = map;
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const roll = this.rng.next();
        if (roll > 0.85) type = TileType.MOUNTAIN;
        else if (roll > 0.75) type = TileType.FOREST;

        // Pass in rng to ensure variant is determined by seed, map is reproducible
        const tile = new Tile(q, r, type, this.rng);
        map.setTile(q, r, tile);
      }
    }
    this.generateBarrier(map);
  }

  // ── 2. Barrier generation ───────────────────────────────────────
  generateBarrier(map) {
    for (const tile of map.tiles.values()) {
      const dist = Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r));
      if (dist === map.radius) {
        tile.type = TileType.BOUNDARY;
        tile.isRevealed = true;
      }
    }
  }

  // ── 3. Event generation ─────────────────────────────────────────
  generateEvents(map) {
    const origin = { q: -map.radius, r: map.radius };
    const generatedTypes = new Set();

    // 3a. Collect inner ring Tiles, guarantee generation after unbiased Fisher-Yates shuffle
    const internalTiles = this._collectInternalTiles(map, origin, 4);
    MapGenerator.shuffle(internalTiles, this.rng);

    MapGenerator.GUARANTEED_EVENTS.forEach((eventType, i) => {
      const tile = internalTiles[i];
      if (tile && !tile.content) {
        tile.content = MapGenerator.createContent(eventType);
        generatedTypes.add(MapGenerator.getDedupeKey(tile.content));
        // Ensure there is at least one passable tile around the event
        this._ensureAccessibilityAroundEvent(map, tile);
      }
    });

    // 3b. 全图随机生成
    for (const tile of map.tiles.values()) {
      if (this._skipTile(tile)) continue;

      const dist = this._distFromOrigin(tile, origin);
      const isInside = dist <= 4;
      const eventType = MapGenerator.rollEventType(this.rng.next());
      if (!eventType) continue;

      // Deduplicate same type in inner ring
      if (isInside) {
        const key = MapGenerator.getDedupeKey(MapGenerator.createContent(eventType));
        if (generatedTypes.has(key)) continue;
        generatedTypes.add(key);
      }

      tile.content = MapGenerator.createContent(eventType);
      // Ensure there is at least one passable tile around the event
      this._ensureAccessibilityAroundEvent(map, tile);
    }
  }

  // ── Static utility: unbiased Fisher-Yates shuffle ───────────────
  /**
  * In-place shuffle (Fisher-Yates), uses seeded rng, result is unbiased.
  * Replaces old .sort(() => rng.next() - 0.5) (biased, uneven).
   *
   * @template T
   * @param {T[]} arr
   * @param {SeededRandom} rng
   * @returns {T[]}  原数组（已就地洗牌）
   */
  static shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // ── Static utility: probability → event type ──────────────────
  static rollEventType(roll) {
    for (const entry of MapGenerator.ROLL_TABLE) {
      if (roll > entry.threshold) return entry.type;
    }
    return null;
  }

  // ── Static utility: event type → content object ───────────────
  static createContent(eventType) {
    switch (eventType) {
      case 'ALTAR': return makeAltar(1);
      case 'DUNGEON': return makeDungeon('Dungeon', 1);
      case 'TREASURE_EPIC': return makeTreasure(3);
      case 'TREASURE_RARE': return makeTreasure(2);
      case 'TREASURE_COMMON': return makeTreasure(1);
      case 'LIGHTHOUSE': return makeLighthouse(1);
      case 'NPC': return makeNPC('Villager', 'Welcome, traveler!');
      default: return null;
    }
  }

  // ── Static utility: content object → dedupe key ───────────────
  static getDedupeKey(content) {
    if (!content) return null;
    return content.type === TileContentType.TREASURE ? 'treasure' : content.type;
  }

  // ── Private: collect available Tiles in inner ring ────────────
  _collectInternalTiles(map, origin, maxDist) {
    const result = [];
    for (const tile of map.tiles.values()) {
      if (this._skipTile(tile)) continue;
      if (this._distFromOrigin(tile, origin) <= maxDist) result.push(tile);
    }
    return result;
  }

  /** Tiles where events should not be placed */
  _skipTile(tile) {
    return tile.content !== null ||
      tile.type.moveCost === Infinity ||
      tile.type === TileType.BOUNDARY;
  }

  /** Hex axial coordinate Manhattan distance */
  _distFromOrigin(tile, origin) {
    return Math.max(
      Math.abs(tile.q - origin.q),
      Math.abs(tile.r - origin.r),
      Math.abs((tile.q + tile.r) - (origin.q + origin.r)),
    );
  }

  /** Get all neighboring tiles within one tile range */
  _getNeighbors(map, q, r) {
    const neighbors = [];
    // 6 neighbors around a hex
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];
    for (const [dq, dr] of directions) {
      const nq = q + dq;
      const nr = r + dr;
      const tile = map.getTile(nq, nr);
      if (tile) neighbors.push(tile);
    }
    return neighbors;
  }

  /**
   * Ensure there is at least one passable tile around the event.
   * If all are mountains/forest/boundary, randomly change one to grassland.
   */
  _ensureAccessibilityAroundEvent(map, eventTile) {
    const neighbors = this._getNeighbors(map, eventTile.q, eventTile.r);
    
    // 检查是否至少有一个可通行的格子
    const hasAccessible = neighbors.some(tile => tile.type.moveCost < Infinity);
    
    if (!hasAccessible) {
      // Collect all tiles that can be changed to grassland (not the event tile or boundary)
      const modifiable = neighbors.filter(tile => 
        tile.type !== TileType.BOUNDARY && 
        !tile.content
      );
      
      if (modifiable.length > 0) {
        // Randomly select one to change to grassland
        const idx = Math.floor(this.rng.next() * modifiable.length);
        modifiable[idx].type = TileType.GRASS;
      }
    }
  }
}