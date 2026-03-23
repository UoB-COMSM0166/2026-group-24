// src/ui/TitleScreen.js
// 采用 p5.js 绘制像素奇幻风背景，叠加 HTML/CSS 响应式 UI 菜单

export class TitleScreen {
  constructor(onStart, onContinue) {
    this.onStart = onStart;
    this.onContinue = onContinue;
    this._overlay = null;
    this._p5inst = null;
    this.globalVolume = 0.5;
  }

  show() {
    const onStart = this.onStart;
    
    // 1. 引入像素字体 (Google Fonts: Press Start 2P)
    if (!document.getElementById('pixel-font')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'pixel-font';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
      document.head.appendChild(fontLink);
    }

    // 2. 注入像素风格 UI 的 CSS 样式
    if (!document.getElementById('ts-styles')) {
      const style = document.createElement('style');
      style.id = 'ts-styles';
      style.innerHTML = `
        .ts-btn {
            font-family: 'Press Start 2P', cursive, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #34495e;
            border: 4px solid #1a252f;
            box-shadow: inset -4px -4px 0px rgba(0,0,0,0.4), inset 4px 4px 0px rgba(255,255,255,0.1), 4px 4px 0px rgba(0,0,0,0.6);
            color: #ecf0f1;
            padding: 16px 20px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.1s;
            text-align: center;
            text-transform: uppercase;
        }
        .ts-btn:hover {
            background: #f1c40f;
            color: #2c3e50;
            border-color: #f39c12;
            transform: translateY(-2px);
            box-shadow: inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.3), 4px 6px 0px rgba(0,0,0,0.6);
        }
        .ts-btn:active {
            transform: translateY(2px);
            box-shadow: inset -2px -2px 0px rgba(0,0,0,0.4), inset 2px 2px 0px rgba(255,255,255,0.1), 0px 0px 0px rgba(0,0,0,0.6);
        }
        .ts-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 10px;
            background: #1a252f;
            outline: none;
            border: 2px solid #34495e;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8);
        }
        .ts-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 25px;
            background: #f1c40f;
            cursor: pointer;
            border: 2px solid #000;
        }
      `;
      document.head.appendChild(style);
    }

    // 3. 创建 Overlay 容器
    const overlay = document.createElement('div');
    overlay.id = 'title-screen-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '500',
      background: '#0a0a14', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      overflow: 'hidden'
    });
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // 4. 创建 UI 菜单层
    const uiLayer = document.createElement('div');
    Object.assign(uiLayer.style, {
      position: 'absolute', zIndex: '510',
      display: 'flex', flexDirection: 'column', 
      alignItems: 'center', pointerEvents: 'auto',
      width: '100%', padding: '20px',
      top: '50%', transform: 'translateY(-50%)'
    });

    uiLayer.innerHTML = `
      <div style="text-align: center; margin-bottom: 8vh; pointer-events: none;">
        <h1 style="font-family: 'Press Start 2P', cursive; font-size: clamp(24px, 4vw, 50px); color: #f1c40f; text-shadow: 4px 4px 0px #c0392b, 8px 8px 0px #000; margin: 0; line-height: 1.2;">
          FOR THE TREASURE
        </h1>
        <p style="font-family: 'Press Start 2P', cursive; font-size: clamp(10px, 1.5vw, 16px); color: #bdc3c7; text-shadow: 2px 2px 0px #000; margin-top: 15px;">
          -- A GRAND FANTASY ADVENTURE --
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 280px;">
        <button id="ts-btn-start" class="ts-btn">NEW GAME</button>
        <button id="ts-btn-continue" class="ts-btn">CONTINUE GAME</button>
        <button id="ts-btn-settings" class="ts-btn">SETTINGS</button>
      </div>
    `;
    overlay.appendChild(uiLayer);

    // 独立出来的设置模态框容器
    const modalLayer = document.createElement('div');
    modalLayer.innerHTML = `
      <div id="ts-settings-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 520; justify-content: center; align-items: center; backdrop-filter: blur(3px);">
        <div style="background: #2c3e50; border: 4px solid #f1c40f; padding: 30px; border-radius: 8px; font-family: 'Press Start 2P', cursive; color: white; width: 340px; box-shadow: 10px 10px 0px rgba(0,0,0,0.5);">
          <h2 style="font-size: 18px; color: #f1c40f; margin-bottom: 30px; text-align: center; text-shadow: 2px 2px 0px #000;">SETTINGS</h2>
          
          <div style="margin-bottom: 40px;">
            <label style="display: block; font-size: 12px; margin-bottom: 15px; color: #ecf0f1;">MUSIC VOLUME:</label>
            <input type="range" id="ts-vol-slider" class="ts-slider" min="0" max="1" step="0.05" value="${this.globalVolume}">
          </div>
          
          <div style="text-align: center;">
            <button id="ts-btn-close-settings" class="ts-btn" style="padding: 12px 30px;">RETURN</button>
          </div>
        </div>
      </div>
    `;
    overlay.appendChild(modalLayer);

    // ── 拦截音量控制逻辑 ──
    if (window.BGMPlayer && !window.BGMPlayer._patchedForVolume) {
      window.BGMPlayer._patchedForVolume = true;
      window.BGMPlayer.globalVolume = this.globalVolume;
      const origPlay = window.BGMPlayer.play;
      window.BGMPlayer.play = function(src, loop = true) {
        origPlay.call(this, src, loop);
        if (this.current) this.current.volume = this.globalVolume;
      };
    }

    // UI 事件绑定
    const btnStart = uiLayer.querySelector('#ts-btn-start');
    const btnContinue = uiLayer.querySelector('#ts-btn-continue');
    const btnSettings = uiLayer.querySelector('#ts-btn-settings');
    const modalSettings = modalLayer.querySelector('#ts-settings-modal');
    const btnCloseSettings = modalLayer.querySelector('#ts-btn-close-settings');
    const volSlider = modalLayer.querySelector('#ts-vol-slider');

    if (window.BGMPlayer) volSlider.value = window.BGMPlayer.globalVolume || this.globalVolume;

    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.globalVolume = v;
      if (window.BGMPlayer) {
        window.BGMPlayer.globalVolume = v;
        if (window.BGMPlayer.current) window.BGMPlayer.current.volume = v;
      }
    });

    btnSettings.addEventListener('click', () => modalSettings.style.display = 'flex');
    btnCloseSettings.addEventListener('click', () => modalSettings.style.display = 'none');
    
    btnContinue.addEventListener('click', () => {
      if (localStorage.getItem('for_the_treasure_save')) {
        if (isStarting) return;
        isStarting = true;
        uiLayer.style.transition = 'opacity 0.5s ease-out';
        uiLayer.style.opacity = '0';
        
        if (this._p5inst) this._p5inst.triggerStart();
        
        setTimeout(() => {
          this.onContinue();
          if (this._overlay) this._overlay.remove();
        }, 1000);
      } else {
        alert("未找到存档！(No save data found!)");
      }
    });

    let isStarting = false;
    btnStart.addEventListener('click', () => {
      if (isStarting) return;
      isStarting = true;
      uiLayer.style.transition = 'opacity 0.5s ease-out';
      uiLayer.style.opacity = '0';
      
      if (this._p5inst) this._p5inst.triggerStart();
      
      setTimeout(() => {
        onStart();
        if (this._overlay) this._overlay.remove();
      }, 1000);
    });

    // 5. p5.js 画布
    this._p5inst = new p5(sketch => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const PX = 4;
      const GW = Math.ceil(W / PX);
      const GH = Math.ceil(H / PX);

      let pg;
      let frame = 0;
      let fadeOut = 0;
      let gameStarting = false;

      const SEA_LEVEL = Math.floor(GH * 0.55);

      const C = {
        sky1: [25, 15, 45], 
        sky2: [55, 30, 75], 
        sea1: [20, 35, 70], 
        sea2: [30, 65, 110], 
        seaFoam: [130, 180, 230], 
        land1: [45, 85, 40], 
        land2: [35, 70, 35], 
        sand: [210, 185, 130], 
        mountain: [90, 80, 95], 
        castleBody: [60, 55, 65], 
        castleLight: [255, 210, 80], 
        treeTrunk: [65, 45, 25], 
        treeLeaf: [25, 60, 35], 
        moon: [235, 225, 200], 
        moonCrater: [205, 195, 175], 
        star: [255, 240, 180], 
        cloudTop: [220, 210, 230], 
        cloudBot: [140, 130, 160], // 让云底部的阴影更深些
      };

      let seed = 42;
      function rnd() {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      }

      const islands = [
        { cx: 0.35, cy: 0.70, rx: 0.20, ry: 0.12, type: 'main' }, 
        { cx: 0.75, cy: 0.65, rx: 0.12, ry: 0.08, type: 'castle_island' }, 
        { cx: 0.85, cy: 0.85, rx: 0.08, ry: 0.05, type: 'small' }, 
        { cx: 0.15, cy: 0.88, rx: 0.10, ry: 0.06, type: 'forest_island' }, 
        { cx: 0.55, cy: 0.82, rx: 0.06, ry: 0.04, type: 'small' }, 
      ];

      const stars = [];
      for (let i = 0; i < 120; i++) stars.push({ x: rnd(), y: rnd() * 0.55, bright: rnd(), phase: rnd() * Math.PI * 2, sz: rnd() < 0.2 ? 2 : 1 });
      
      const clouds = [];
      for (let i = 0; i < 18; i++) {
        clouds.push({ 
            x: rnd(), // 初始位置 0 ~ 1 之间
            y: 0.02 + rnd() * 0.40, 
            w: 0.10 + rnd() * 0.20, 
            // 略微加快云的移动速度
            spd: 0.0003 + rnd() * 0.0004,
            layers: 3 + Math.floor(rnd() * 4) 
        });
      }
      
      const waveOffsets = [];
      for (let gx = 0; gx < GW; gx++) waveOffsets.push(rnd() * Math.PI * 2);

      function pset(g, gx, gy, r, gr, b, a = 255) {
        if (gx < 0 || gx >= GW || gy < 0 || gy >= GH) return;
        g.fill(r, gr, b, a);
        g.rect(gx * PX, gy * PX, PX, PX);
      }

      function drawStaticMap() {
        pg.background(...C.sky1); 

        for (let gy = 0; gy < SEA_LEVEL; gy++) {
          const t = gy / SEA_LEVEL;
          for (let gx = 0; gx < GW; gx++) pset(pg, gx, gy, lerp(C.sky1[0], C.sky2[0], t), lerp(C.sky1[1], C.sky2[1], t), lerp(C.sky1[2], C.sky2[2], t));
        }

        const moonR = Math.floor(GH * 0.16);
        const moonX = Math.floor(GW * 0.25);
        const moonY = Math.floor(GH * 0.22);
        for (let dy = -moonR; dy <= moonR; dy++) {
            for (let dx = -moonR; dx <= moonR; dx++) {
                if (dx * dx + dy * dy <= moonR * moonR) {
                    const isCrater = (Math.sin(dx * 0.15) + Math.cos(dy * 0.2) + Math.sin((dx + dy) * 0.08)) > 1.3;
                    pset(pg, moonX + dx, moonY + dy, ...(isCrater ? C.moonCrater : C.moon));
                }
            }
        }

        for (let gy = SEA_LEVEL; gy < GH; gy++) {
          const t = (gy - SEA_LEVEL) / (GH - SEA_LEVEL);
          for (let gx = 0; gx < GW; gx++) pset(pg, gx, gy, lerp(C.sea1[0], C.sea2[0], t), lerp(C.sea1[1], C.sea2[1], t), lerp(C.sea1[2], C.sea2[2], t));
        }

        for (const isl of islands) {
          const igx = Math.round(isl.cx * GW), igy = Math.round(isl.cy * GH), irx = Math.round(isl.rx * GW), iry = Math.round(isl.ry * GH);
          
          for (let dy = -iry - 3; dy <= iry + 3; dy++) {
            for (let dx = -irx - 3; dx <= irx + 3; dx++) {
              if ((dx * dx) / ((irx + 3) * (irx + 3)) + (dy * dy) / ((iry + 3) * (iry + 3)) <= 1.0) {
                  if (igy + dy >= SEA_LEVEL) pset(pg, igx + dx, igy + dy, ...C.sand);
              }
            }
          }
          
          for (let dy = -iry; dy <= iry; dy++) {
            for (let dx = -irx; dx <= irx; dx++) {
              if ((dx * dx) / (irx * irx) + (dy * dy) / (iry * iry) <= 1.0) {
                  if (igy + dy >= SEA_LEVEL) {
                      pset(pg, igx + dx, igy + dy, ...((dx + dy) % 2 === 0 ? C.land1 : C.land2));
                  }
              }
            }
          }

          if (isl.type === 'main' || isl.type === 'forest_island') {
            const treeCount = Math.floor(irx * iry * 0.2); 
            for (let i = 0; i < treeCount; i++) {
                let tx = igx + Math.floor((rnd() * 2 - 1) * irx * 0.8);
                let ty = igy + Math.floor((rnd() * 2 - 1) * iry * 0.8);
                if (ty >= SEA_LEVEL) {
                    pset(pg, tx, ty, ...C.treeTrunk);
                    pset(pg, tx, ty - 1, ...C.treeTrunk);
                    for (let lx = -2; lx <= 2; lx++) pset(pg, tx + lx, ty - 2, ...C.treeLeaf);
                    for (let lx = -1; lx <= 1; lx++) pset(pg, tx + lx, ty - 3, ...C.treeLeaf);
                    pset(pg, tx, ty - 4, ...C.treeLeaf);
                }
            }
          }

          if (isl.type === 'castle_island' || isl.type === 'main') {
              let castleX = igx + (isl.type === 'main' ? Math.floor(irx * 0.4) : 0);
              let castleY = igy - Math.floor(iry * 0.2);
              if (castleY >= SEA_LEVEL - 10) { 
                  for (let w = -8; w <= 8; w++) {
                      for (let h = 0; h < 14; h++) pset(pg, castleX + w, castleY - h, ...C.castleBody);
                  }
                  for (let w = -12; w <= -6; w++) {
                      for (let h = 0; h < 22; h++) pset(pg, castleX + w, castleY - h, ...C.castleBody);
                      pset(pg, castleX - 9, castleY - 22, ...C.mountain);
                      pset(pg, castleX - 9, castleY - 23, ...C.mountain);
                  }
                  for (let w = 6; w <= 12; w++) {
                      for (let h = 0; h < 20; h++) pset(pg, castleX + w, castleY - h, ...C.castleBody);
                      pset(pg, castleX + 9, castleY - 20, ...C.mountain);
                      pset(pg, castleX + 9, castleY - 21, ...C.mountain);
                  }
                  for (let w = -8; w <= 8; w += 3) {
                      pset(pg, castleX + w, castleY - 14, ...C.castleBody);
                      pset(pg, castleX + w + 1, castleY - 14, ...C.castleBody);
                  }
                  pset(pg, castleX - 9, castleY - 12, ...C.castleLight);
                  pset(pg, castleX + 9, castleY - 10, ...C.castleLight);
                  pset(pg, castleX - 2, castleY - 6, ...C.castleLight);
                  pset(pg, castleX + 2, castleY - 6, ...C.castleLight);
                  for (let dw = -2; dw <= 2; dw++) {
                      for (let dh = 0; dh < 4; dh++) pset(pg, castleX + dw, castleY - dh, 10, 10, 15);
                  }
              }
          }
        }
      }

      function lerp(a, b, t) { return a + (b - a) * t; }

      sketch.setup = function () {
        const cnv = sketch.createCanvas(W, H);
        cnv.parent(overlay);
        Object.assign(cnv.elt.style, { position: 'absolute', zIndex: '501', display: 'block' });
        sketch.noSmooth();
        sketch.pixelDensity(1);

        pg = sketch.createGraphics(W, H);
        pg.noSmooth();
        pg.pixelDensity(1);
        pg.noStroke();
        drawStaticMap();
      };

      sketch.draw = function () {
        frame++;
        
        // 1. 铺设静态背景层
        sketch.image(pg, 0, 0);

        // 2. 绘制动态星辰
        for (const s of stars) {
          const alpha = 80 + Math.floor(Math.sin(frame * 0.03 + s.phase) * 100) + Math.floor(s.bright * 75);
          const gx = Math.floor(s.x * GW), gy = Math.floor(s.y * SEA_LEVEL);
          sketch.fill(C.star[0], C.star[1], C.star[2], alpha);
          sketch.noStroke();
          sketch.rect(gx * PX, gy * PX, s.sz * PX, s.sz * PX);
        }

        // 3. 绘制动态立体云层 (修复了数学 Bug)
        for (const cl of clouds) {
          // 修改为正常的累加逻辑，如果云飘出屏幕右侧，则重置到屏幕左边
          cl.x += cl.spd;
          if (cl.x > 1.2) {
             cl.x = -0.3; 
          }

          const cgx = Math.floor(cl.x * GW), cgy = Math.floor(cl.y * SEA_LEVEL), cw = Math.ceil(cl.w * GW);
          
          for (let dy = 0; dy < cl.layers; dy++) {
            // 确保 layerWidth 不会变成负数
            const layerWidth = Math.max(0, cw - dy * 4); 
            const offsetX = Math.floor(dy * 2); 
            
            const t = dy / cl.layers;
            const r = lerp(C.cloudTop[0], C.cloudBot[0], t);
            const g = lerp(C.cloudTop[1], C.cloudBot[1], t);
            const b = lerp(C.cloudTop[2], C.cloudBot[2], t);
            const alpha = 180 - dy * 30; // 优化透明度梯度

            for (let dx = 0; dx < layerWidth; dx++) {
              const px = cgx + offsetX + dx;
              if (px < 0 || px >= GW) continue;
              sketch.fill(r, g, b, alpha);
              sketch.noStroke();
              sketch.rect(px * PX, (cgy + dy) * PX, PX, PX);
            }
          }
        }

        // 4. 海平面动态波浪
        for (let gx = 0; gx < GW; gx++) {
          sketch.fill(C.seaFoam[0], C.seaFoam[1], C.seaFoam[2], 120);
          sketch.noStroke();
          sketch.rect(gx * PX, (SEA_LEVEL + Math.round(Math.sin(frame * 0.05 + waveOffsets[gx]) * 1.5)) * PX, PX, PX);
          sketch.fill(C.seaFoam[0], C.seaFoam[1], C.seaFoam[2], 60);
          sketch.rect(gx * PX, (SEA_LEVEL + 4 + Math.round(Math.sin(frame * 0.04 + waveOffsets[gx] + 1.5) * 2)) * PX, PX, PX);
        }

        // 5. 黑场淡出
        if (gameStarting) {
          fadeOut = Math.min(1, fadeOut + 0.03);
          sketch.fill(0, 0, 0, Math.floor(fadeOut * 255));
          sketch.noStroke();
          sketch.rect(0, 0, W, H);
          if (fadeOut >= 1) {
            sketch.remove();
          }
        }
      };

      sketch.windowResized = function() { }

      sketch.triggerStart = function() {
        gameStarting = true;
      }
    }, overlay);
  }
}