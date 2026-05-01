// src/utils/Pathfinder.js

/**
 * Hex grid pathfinding utility
 *
 * Coordinate system: axial coordinates, flat-top layout
 * Six direction neighbor offsets: [1,0], [1,-1], [0,-1], [-1,0], [-1,1], [0,1]
 *
 * Passability rules:
 *   - Terrain with moveCost = Infinity is always impassable
 *   - Tiles with event content (tile.content != null):
 *       • Cannot be used as a transit node (path cannot pass through)
 *       • Can be used as a pathfinding goal (player actively clicks to trigger event)
 *
 * Performance optimization:
 *   - Both A* and Dijkstra use MinHeap priority queue, time complexity O(n log n),
 *     replaces the old O(n² log n) implementation that sorted on every dequeue.
 */

const HEX_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

// ── MinHeap (minimum binary heap) ────────────────────────────────
/**
 * General min-heap, sorted by node .g field.
 * Compared to Array.sort, each push/pop is only O(log n).
 */
class MinHeap {
  constructor() {
    this._data = [];
  }

  get size() { return this._data.length; }

  push(node) {
    this._data.push(node);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].g <= this._data[i].g) break;
      this._swap(parent, i);
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].g < this._data[smallest].g) smallest = l;
      if (r < n && this._data[r].g < this._data[smallest].g) smallest = r;
      if (smallest === i) break;
      this._swap(i, smallest);
      i = smallest;
    }
  }

  _swap(a, b) {
    const tmp = this._data[a];
    this._data[a] = this._data[b];
    this._data[b] = tmp;
  }
}

// ── Utility functions ────────────────────────────────────────────
const key = (q, r) => `${q},${r}`;

/** Hex Manhattan distance (cube coordinates equivalent) */
function hexDist(aq, ar, bq, br) {
  return Math.max(
    Math.abs(aq - bq),
    Math.abs(ar - br),
    Math.abs((aq + ar) - (bq + br)),
  );
}

/**
 * Determine if a tile can be used as a "transit node".
 * @param {object}  tile
 * @param {boolean} isGoal  Whether this tile is the pathfinding goal
 */
function isPassable(tile, isGoal = false) {
  if (!tile || !isFinite(tile.type.moveCost)) return false;
  if (tile.content != null && !isGoal) return false;
  return true;
}

// ── A* Pathfinding ───────────────────────────────────────────────
/**
 * A* pathfinding
 *
 * @param {import('../world/HexMap.js').HexMap} map
 * @param {number} startQ
 * @param {number} startR
 * @param {number} goalQ
 * @param {number} goalR
 * @param {number} [maxCost=Infinity]
 * @returns {{ path: Array<{q:number, r:number}>, cost: number } | null}
 *   path includes the goal but not the start; returns null if unreachable or exceeds movement points
 */
export function findPath(map, startQ, startR, goalQ, goalR, maxCost = Infinity) {
  const goalTile = map.getTile(goalQ, goalR);
  if (!goalTile || !isFinite(goalTile.type.moveCost)) return null;

  const openSet = new MinHeap();
  const openMap = new Map();   // key → best g value（用于去重）
  const closedSet = new Set();

  const startNode = {
    q: startQ, r: startR,
    g: 0,
    f: hexDist(startQ, startR, goalQ, goalR),
    prev: null,
  };
  openSet.push(startNode);
  openMap.set(key(startQ, startR), 0);

  while (openSet.size > 0) {
    const current = openSet.pop();
    const cKey = key(current.q, current.r);

    if (closedSet.has(cKey)) continue;   // There may be old nodes in the heap, skip
    closedSet.add(cKey);

    // Reached the goal
    if (current.q === goalQ && current.r === goalR) {
      const path = [];
      let node = current;
      while (node.prev !== null) {
        path.unshift({ q: node.q, r: node.r });
        node = node.prev;
      }
      return { path, cost: current.g };
    }

    for (const [dq, dr] of HEX_DIRS) {
      const nq = current.q + dq;
      const nr = current.r + dr;
      const nKey = key(nq, nr);

      if (closedSet.has(nKey)) continue;

      const tile = map.getTile(nq, nr);
      const isGoal = (nq === goalQ && nr === goalR);

      if (!isPassable(tile, isGoal)) continue;

      const g = current.g + tile.type.moveCost;
      if (g > maxCost) continue;

      const existing = openMap.get(nKey);
      if (existing === undefined || g < existing) {
        openMap.set(nKey, g);
        openSet.push({
          q: nq, r: nr,
          g,
          f: g + hexDist(nq, nr, goalQ, goalR),
          prev: current,
        });
      }
    }
  }

  return null;   // Unreachable
}

// ── Dijkstra reachable range ────────────────────────────────────
/**
 * Get all reachable tile coordinates within current movement points (for highlighting movable range).
 *
 * Rules are the same as findPath:
 *   - Tiles with content appear in the result set (can be a goal), but do not continue to expand outward.
 *
 * @param {import('../world/HexMap.js').HexMap} map
 * @param {number} startQ
 * @param {number} startR
 * @param {number} maxCost
 * @returns {Set<string>}  Set of reachable tile "q,r" keys (including the start)
 */
export function getReachableTiles(map, startQ, startR, maxCost) {
  const dist = new Map();
  const heap = new MinHeap();
  const start = key(startQ, startR);

  dist.set(start, 0);
  heap.push({ q: startQ, r: startR, g: 0 });

  while (heap.size > 0) {
    const { q, r, g } = heap.pop();
    const curKey = key(q, r);

    // Skip if already updated by a shorter path (old nodes may remain in the heap)
    if (dist.get(curKey) < g) continue;

    // Tiles with event content: add to reachable set, but do not expand further from here (goal semantics)
    const curTile = map.getTile(q, r);
    const isStart = (q === startQ && r === startR);
    if (!isStart && curTile?.content != null) continue;

    for (const [dq, dr] of HEX_DIRS) {
      const nq = q + dq;
      const nr = r + dr;
      const nKey = key(nq, nr);

      const tile = map.getTile(nq, nr);
      if (!tile || !isFinite(tile.type.moveCost)) continue;

      const ng = g + tile.type.moveCost;
      if (ng > maxCost) continue;

      const prev = dist.get(nKey);
      if (prev === undefined || ng < prev) {
        dist.set(nKey, ng);
        heap.push({ q: nq, r: nr, g: ng });
      }
    }
  }

  return new Set(dist.keys());
}