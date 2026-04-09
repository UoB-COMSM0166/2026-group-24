// src/rendering/Renderer.js
import { DataLoader } from '../data/DataLoader.js';
import { hexToPixel } from '../world/Tile.js';

export class Renderer {
  static debugMode = false;
  static selectedKey = null;   // 当前选中格 "q,r" 字符串（由 InputHandler 更新）

  // ── 探索场景渲染 ──────────────────────────────────────────────────
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera}   camera
   * @param {HexMap}   map
   * @param {Player}   player
   * @param {Set<string>|null} rangeHighlight  可达格 key 集合（红线轮廓）
   * @param {Set<string>|null} pathHighlight   路径格 key 集合（蓝色预览）
   */
  static renderExploration(ctx, camera, map, player, rangeHighlight = null, pathHighlight = null) {
    // 1. 清理背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const bgImg = DataLoader.getImage('background');
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 2. 绘制地图（内部含视口裁剪，仅渲染可见格子）
    map.draw(ctx, camera, Renderer.selectedKey, Renderer.debugMode);

    // 3a. 绘制路径预览（蓝色半透明高亮）
    if (pathHighlight && pathHighlight.size > 0) {
      Renderer.drawPathHighlight(ctx, camera, map, pathHighlight);
    }

    // 3b. 绘制可移动范围红线轮廓
    if (rangeHighlight && rangeHighlight.size > 0) {
      Renderer.drawRangeBorder(ctx, camera, map, rangeHighlight);
    }

    // 4. 绘制玩家角色
    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(camera.zoom ?? 1, camera.zoom ?? 1);
    player.draw(ctx, map.tileSize);
    ctx.restore();
  }

  // ── 战斗场景渲染 ──────────────────────────────────────────────────
  static renderCombat(ctx, heroes, combatManager) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (combatManager?.enemies[0]?.monsterType === 'boss') {
      ctx.fillStyle = 'rgba(80, 0, 0, 0.25)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    heroes.forEach((h, i) => {
      h.targetX = 250; h.targetY = 200 + i * 150;
      h.draw(ctx, 50); Renderer._drawHealthBar(ctx, h);
    });
    if (combatManager) {
      combatManager.enemies.forEach((e, i) => {
        e.targetX = ctx.canvas.width - 250; e.targetY = 200 + i * 150;
        e.draw(ctx, 50); Renderer._drawHealthBar(ctx, e);
      });
    }
  }

  // ── 血条 ─────────────────────────────────────────────────────────
  static _drawHealthBar(ctx, unit) {
    const BAR_W = 80, BAR_H = 8;
    const x = unit.x - BAR_W / 2;
    const y = unit.y + 45;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, BAR_W, BAR_H);

    const ratio = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = unit.type === 'player' ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x, y, BAR_W * ratio, BAR_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, BAR_W, BAR_H);
  }

  // ── 路径预览高亮（蓝色半透明填充 + 呼吸灯描边）──────────────────
  /**
   * 在路径经过的每个格子上绘制蓝色半透明填充和发光描边。
   * 终点格（路径末尾）使用稍高的不透明度，与其余格区分。
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} camera
   * @param {HexMap} map
   * @param {Set<string>} pathSet  路径格 "q,r" key 集合（含起点）
   */
  static drawPathHighlight(ctx, camera, map, pathSet) {
    const size = map.tileSize;
    const zoom = camera.zoom ?? 1;
    const pulse = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(Date.now() / 250));

    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(zoom, zoom);

    // 把 pathSet 转为有序数组，让终点格可以特殊处理
    const keys = [...pathSet];

    for (let i = 0; i < keys.length; i++) {
      const [q, r] = keys[i].split(',').map(Number);
      const { x, y } = hexToPixel(q, r, size);
      const isStart = (i === 0);
      const isDestination = (i === keys.length - 1);

      // flat-top 六边形路径
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();

      // 终点格填充更亮
      const fillAlpha = isDestination ? pulse * 0.55 : pulse * 0.28;
      ctx.fillStyle = `rgba(80, 180, 255, ${fillAlpha})`;
      ctx.fill();

      // 描边（呼吸灯）
      ctx.strokeStyle = `rgba(120, 210, 255, ${pulse * 0.95})`;
      ctx.lineWidth = (isDestination ? 2.5 : 1.8) / zoom;
      ctx.shadowColor = 'rgba(60, 180, 255, 0.85)';
      ctx.shadowBlur = isDestination ? 12 : 6;
      ctx.stroke();

      // 步数编号（起点不显示，从第 1 步开始）
      if (!isStart) {
        const stepNum = String(i); // i=1 → "1", i=2 → "2" ...
        const fontSize = Math.max(10, size * 0.45);
        ctx.shadowBlur = 0;
        ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 描边（黑色轮廓，让数字在任何地形上都清晰）
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = fontSize * 0.25;
        ctx.lineJoin = 'round';
        ctx.strokeText(stepNum, x, y);

        // 填充（白色或终点用亮蓝色）
        ctx.fillStyle = isDestination ? '#7df4ff' : 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(stepNum, x, y);
      }
    }

    ctx.restore();
  }

  // ── 可移动范围红线轮廓（呼吸灯）─────────────────────────────────
  /**
   * flat-top 六边形顶点（从右侧顺时针编号）：
   *   V0(1,0)  V1(0.5,+√3/2)  V2(-0.5,+√3/2)
   *   V3(-1,0) V4(-0.5,-√3/2) V5(0.5,-√3/2)
   *
   * 邻格方向 → 共享边的两端顶点：
   *   [1,0]  右     → V0-V1
   *   [1,-1] 右上   → V5-V0
   *   [0,-1] 左上   → V4-V5
   *   [-1,0] 左     → V3-V4
   *   [-1,1] 左下   → V2-V3
   *   [0,1]  右下   → V1-V2
   */
  static drawRangeBorder(ctx, camera, map, reachableSet) {
    const size = map.tileSize;
    const zoom = camera.zoom ?? 1;
    const SQ3H = Math.sqrt(3) / 2;

    const VERTS = [
      [1, 0],
      [0.5, SQ3H],
      [-0.5, SQ3H],
      [-1, 0],
      [-0.5, -SQ3H],
      [0.5, -SQ3H],
    ];

    const HEX_DIRS = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1],
    ];

    const DIR_EDGE = [
      [0, 1], [5, 0], [4, 5],
      [3, 4], [2, 3], [1, 2],
    ];

    const PREC = 100;
    const vKey = (x, y) => `${Math.round(x * PREC)},${Math.round(y * PREC)}`;
    const coords = new Map();
    const adj = new Map();

    const addEdge = (ax, ay, bx, by) => {
      const ka = vKey(ax, ay);
      const kb = vKey(bx, by);
      coords.set(ka, [ax, ay]);
      coords.set(kb, [bx, by]);
      if (!adj.has(ka)) adj.set(ka, []);
      if (!adj.has(kb)) adj.set(kb, []);
      if (!adj.get(ka).includes(kb)) adj.get(ka).push(kb);
      if (!adj.get(kb).includes(ka)) adj.get(kb).push(ka);
    };

    for (const cellKey of reachableSet) {
      const [q, r] = cellKey.split(',').map(Number);
      const { x: cx, y: cy } = hexToPixel(q, r, size);

      for (let d = 0; d < 6; d++) {
        const [dq, dr] = HEX_DIRS[d];
        if (!reachableSet.has(`${q + dq},${r + dr}`)) {
          const [vi, vj] = DIR_EDGE[d];
          addEdge(
            cx + VERTS[vi][0] * size, cy + VERTS[vi][1] * size,
            cx + VERTS[vj][0] * size, cy + VERTS[vj][1] * size,
          );
        }
      }
    }

    if (adj.size === 0) return;

    // Step 2：沿邻接图收集闭合环
    const visited = new Set();
    const loops = [];

    for (const startKey of adj.keys()) {
      if (visited.has(startKey)) continue;
      const loop = [];
      let cur = startKey;
      let prev = null;

      for (let guard = 0; guard < 20000; guard++) {
        if (cur === startKey && loop.length > 0) break;
        if (visited.has(cur)) break;
        visited.add(cur);
        loop.push(coords.get(cur));
        const nbrs = adj.get(cur);
        let next = null;
        for (const nk of nbrs) {
          if (nk !== prev) { next = nk; break; }
        }
        if (!next) break;
        prev = cur;
        cur = next;
      }

      if (loop.length >= 2) loops.push(loop);
    }

    if (loops.length === 0) return;

    // Step 3：绘制（呼吸灯）
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(Date.now() / 300));

    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(zoom, zoom);
    ctx.strokeStyle = `rgba(255, 55, 55, ${pulse})`;
    ctx.lineWidth = 2.5 / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 30, 30, 0.9)';
    ctx.shadowBlur = 10;

    for (const loop of loops) {
      ctx.beginPath();
      ctx.moveTo(loop[0][0], loop[0][1]);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i][0], loop[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}