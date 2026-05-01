// src/ui/ChestAnimation.js
import { RARITY_COLORS } from '../data/items.js';

export class ChestAnimation {
  static _overlay = null;
  static _p5inst = null;

  static play(item, onClose) {
    if (ChestAnimation._p5inst) ChestAnimation.destroy();

    const overlay = document.createElement('div');
    overlay.id = 'chest-anim-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      zIndex: '300', background: 'rgba(0,0,0,0)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      transition: 'background 0.6s ease',
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.background = 'rgba(0,0,0,0.75)');
    ChestAnimation._overlay = overlay;

    ChestAnimation._p5inst = new p5(sketch => {
      const W = Math.min(window.innerWidth, 800);
      const H = Math.min(window.innerHeight, 600);
      const cx = W / 2, cy = H / 2;

      let phase = 'enter';
      let timer = 0;
      let particles = [];
      let lightRays = [];
      let canClose = false;

      let chestY = H + 100;
      let chestTargetY = cy + 40;
      let chestAngle = 0;
      let lidAngle = 0;
      let shakeOffset = 0;

      let itemY = cy;
      let itemAlpha = 0;
      let textAlpha = 0;
      let glowPulse = 0;

      const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.rare;

      // ★ New variables ★
      const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;
      let lidOffY = 0;
      let lidVelY = 0;
      let fireworks = [];
      let trinketSparkles = [];
      let forgeSparkles = [];
      // ★ End of new variables ★

      sketch.setup = function () {
        const canvas = sketch.createCanvas(W, H);
        canvas.parent(overlay);
        canvas.style('border-radius', '12px');
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.imageMode(sketch.CENTER);
      };

      sketch.draw = function () {
        sketch.clear();
        timer += sketch.deltaTime / 1000;
        glowPulse += 0.05;

        switch (phase) {
          case 'enter':
            chestY += (chestTargetY - chestY) * 0.08;
            chestAngle = Math.sin(timer * 3) * 0.03;
            if (Math.abs(chestY - chestTargetY) < 2) { phase = 'shake'; timer = 0; }
            break;
          case 'shake':
            // ★ Modified: more intense shaking ★
            shakeOffset = Math.sin(timer * 35) * (10 + timer * 16);
            chestAngle = Math.sin(timer * 28) * 0.09;
            if (timer > 1.2) { phase = 'open'; timer = 0; spawnBurstParticles(); }
            break;
          case 'open':
            // ★ Modified: lid flies out of the screen ★
            if (lidAngle < Math.PI * 0.75) {
              lidAngle += 0.09;
            } else {
              lidVelY -= 3.5;
              lidOffY += lidVelY;
            }
            shakeOffset *= 0.85;
            itemY += (cy - 160 - itemY) * 0.06;
            itemAlpha = Math.min(255, itemAlpha + 8);
            if (timer > 0.3) spawnLightRays();
            if (timer > 1.5 && itemAlpha > 200) {
              phase = 'reveal'; timer = 0;
              if (isWeapon) spawnFireworks(); // ★ New: weapons trigger fireworks ★
            }
            break;
          case 'reveal':
            textAlpha = Math.min(255, textAlpha + 6);
            itemY += (cy - 160 - itemY) * 0.05; // ★ Modified: same target as open phase ★
            if (timer > 0.8) { phase = 'idle'; canClose = true; }
            break;
          case 'idle': break;
        }

        if (phase === 'open' || phase === 'reveal' || phase === 'idle') {
          drawLightBeam(sketch, cx, cy - 20, rarityColor.glow, glowPulse);
        }

        updateAndDrawParticles(sketch, particles);
        updateAndDrawRays(sketch, lightRays);
        updateAndDrawFireworks(sketch, fireworks);
        updateAndDrawTrinketSparkles(sketch, trinketSparkles);
        updateAndDrawForgeSparkles(sketch, forgeSparkles);

        sketch.push();
        sketch.translate(cx + shakeOffset, chestY);
        sketch.rotate(chestAngle);
        drawChest(sketch, lidAngle, rarityColor.main, lidOffY); // ★ 修改：传入 lidOffY ★
        sketch.pop();

        if (itemAlpha > 0) {
          sketch.push();
          sketch.translate(cx, itemY);
          // ★ 修改：发光范围更大，武器额外放大 ★
          const glowSize = (isWeapon ? 90 : 70) + Math.sin(glowPulse) * 12;
          const c = sketch.color(rarityColor.glow);
          c.setAlpha(itemAlpha * 0.35);
          sketch.noStroke();
          sketch.fill(c);
          sketch.ellipse(0, 0, glowSize * 2, glowSize * 2);
          if (isWeapon) sketch.scale(2.0); // ★ 新增：武器图标放大2倍 ★
          drawItemIcon(sketch, item.icon || item.type, itemAlpha, rarityColor.main);
          sketch.pop();
        }

        if (textAlpha > 0) {
          // ★ Modified: text fixed at the bottom of the screen, does not follow itemY, to avoid being covered by the chest ★
          sketch.push();
          const textBase = H - 175;

          sketch.textSize(13);
          sketch.noStroke();
          const tagC = sketch.color(rarityColor.main);
          tagC.setAlpha(textAlpha);
          sketch.fill(tagC);
          sketch.text(`— ${rarityColor.label} —`, cx, textBase);

          sketch.textSize(26);
          sketch.textStyle(sketch.BOLD);
          const nameC = sketch.color(255);
          nameC.setAlpha(textAlpha);
          sketch.fill(nameC);
          sketch.text(item.name, cx, textBase + 38);

          sketch.textSize(13);
          sketch.textStyle(sketch.NORMAL);
          const descC = sketch.color(200);
          descC.setAlpha(textAlpha * 0.8);
          sketch.fill(descC);
          sketch.text(item.desc, cx, textBase + 72);

          if (canClose) {
            const hintA = Math.floor(128 + Math.sin(glowPulse * 2) * 80);
            const hintC = sketch.color(180);
            hintC.setAlpha(hintA);
            sketch.fill(hintC);
            sketch.textSize(12);
            sketch.text('[ Click anywhere to continue ]', cx, H - 28);
          }
          sketch.pop();
        }

        if ((phase === 'open' || phase === 'reveal' || phase === 'idle') && sketch.frameCount % 3 === 0) {
          particles.push(makeSparkle(cx, chestY - 30, rarityColor.glow));
        }
        if (!isWeapon && (phase === 'reveal' || phase === 'idle') && sketch.frameCount % 4 === 0) {
          spawnTrinketSparkle(cx, itemY);
        }
        if (isWeapon && (phase === 'reveal' || phase === 'idle')) {
          const count = sketch.frameCount % 2 === 0 ? 10 : 8;
          for (let i = 0; i < count; i++) {
            spawnForgeSpark(cx, itemY);
          }
        }
      };

      sketch.mousePressed = function () {
        if (canClose) {
          ChestAnimation.destroy();
          if (onClose) onClose();
        }
      };

      function spawnBurstParticles() {
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 5;
          particles.push({
            x: cx, y: chestTargetY - 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            decay: 0.015 + Math.random() * 0.02,
            size: 3 + Math.random() * 4,
            color: rarityColor.glow,
          });
        }
      }

      // ★ Modified: changed to lightning effect, larger range ★
      function spawnLightRays() {
        if (lightRays.length < 20 && Math.random() < 0.7) {
          const endX = cx + (Math.random() - 0.5) * W * 0.95;
          const endY = Math.random() * cy * 0.7;
          const segments = 6 + Math.floor(Math.random() * 5);
          const points = [{ x: cx, y: chestTargetY - 25 }];
          for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
              x: cx + (endX - cx) * t + (Math.random() - 0.5) * 90,
              y: (chestTargetY - 25) + (endY - (chestTargetY - 25)) * t + (Math.random() - 0.5) * 65,
            });
          }
          points.push({ x: endX, y: endY });
          lightRays.push({
            points,
            life: 1,
            decay: 0.07 + Math.random() * 0.05,
            color: rarityColor.glow,
            width: 2.5 + Math.random() * 4.5,
          });
        }
      }
      // ★ End of modification ★

      function makeSparkle(bx, by, color) {
        return {
          x: bx + (Math.random() - 0.5) * 60,
          y: by,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1 - Math.random() * 2,
          life: 1,
          decay: 0.02 + Math.random() * 0.015,
          size: 2 + Math.random() * 3,
          color,
        };
      }

      function spawnFireworks() {
        const fx = cx, fy = itemY;

        // First round: large range spread, rarity color, greatly increased quantity
        for (let i = 0; i < 180; i++) {
          const angle = (Math.PI * 2 * i) / 180 + Math.random() * 0.2;
          const speed = 5 + Math.random() * 14;
          fireworks.push({
            x: fx, y: fy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 4,
            life: 1,
            decay: 0.008 + Math.random() * 0.01,
            size: 5 + Math.random() * 9,
            color: rarityColor.glow,
          });
        }

        // Second round: inner circle main color, slow trailing
        for (let i = 0; i < 100; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 7;
          fireworks.push({
            x: fx, y: fy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.9,
            decay: 0.012 + Math.random() * 0.012,
            size: 4 + Math.random() * 6,
            color: rarityColor.main,
          });
        }

        // ★ New third round: white flash core, rapid spread and quick disappearance ★
        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 8 + Math.random() * 18;
          fireworks.push({
            x: fx, y: fy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 0.7,
            decay: 0.035 + Math.random() * 0.025,
            size: 3 + Math.random() * 5,
            color: '#ffffff',
          });
        }
      }
// ★ New: generate a single diamond star ★
      function spawnTrinketSparkle(originX, originY) {
        // Randomly scattered around the item icon
        const spread = 90;
        const x = originX + (Math.random() - 0.5) * spread * 2;
        const y = originY + (Math.random() - 0.5) * spread;
        const size = 6 + Math.random() * 14;
        const duration = 40 + Math.random() * 40; // Frame count
        trinketSparkles.push({
          x, y, size,
          frame: 0,
          totalFrames: duration,
          color: rarityColor.main,
          glowColor: rarityColor.glow,
          angle: Math.random() * Math.PI, // Rotation angle
        });
      }

// ★ New: update and draw all diamond stars ★
      function updateAndDrawTrinketSparkles(s, sparkles) {
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const sp = sparkles[i];
          sp.frame++;
          if (sp.frame >= sp.totalFrames) { sparkles.splice(i, 1); continue; }

          // Life cycle: 0→0.5 fade in, 0.5→1 fade out, brightest in the middle
          const t = sp.frame / sp.totalFrames;
          const lifeAlpha = t < 0.5 ? t * 2 : (1 - t) * 2;
          // Size also scales with life cycle: large first then small
          const scale = 0.3 + Math.sin(t * Math.PI) * 0.7;

          s.push();
          s.translate(sp.x, sp.y);
          s.rotate(sp.angle + t * 0.5); // Slow rotation

          const sz = sp.size * scale;
          const alpha = Math.floor(lifeAlpha * 255);

          // Outer glow
          const glowC = s.color(sp.glowColor);
          glowC.setAlpha(alpha * 0.35);
          s.noStroke(); s.fill(glowC);
          drawDiamond(s, sz * 2.2);

          // Main diamond, rarity color
          const mainC = s.color(sp.color);
          mainC.setAlpha(alpha * 0.85);
          s.fill(mainC);
          drawDiamond(s, sz);

          // Inner white highlight
          const whiteC = s.color(255, 255, 255);
          whiteC.setAlpha(alpha);
          s.fill(whiteC);
          drawDiamond(s, sz * 0.35);

          // Four-direction slender rays
          s.stroke(255, 255, 255, alpha * 0.8);
          s.strokeWeight(1.2);
          const rayLen = sz * 1.8;
          s.line(0, -rayLen, 0, rayLen);   // Vertical
          s.line(-rayLen, 0, rayLen, 0);   // Horizontal
          // Diagonal slender rays (shorter)
          const dRay = rayLen * 0.5;
          s.strokeWeight(0.7);
          s.line(-dRay, -dRay, dRay, dRay);
          s.line(dRay, -dRay, -dRay, dRay);

          s.pop();
        }
      }

// ★ New: draw diamond (centered at origin) ★
      function drawDiamond(s, size) {
        s.beginShape();
        s.vertex(0, -size);
        s.vertex(size * 0.4, 0);
        s.vertex(0, size);
        s.vertex(-size * 0.4, 0);
        s.endShape(s.CLOSE);
      }

// ★ New: generate a single forge spark ★
      function spawnForgeSpark(originX, originY) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 16;
        // Color randomly between gold and orange-red
        const colors = ['#fbbf24', '#f59e0b', '#fb923c', '#fde68a', '#ff6b00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        forgeSparkles.push({
          x: originX + (Math.random() - 0.5) * 80,
          y: originY + (Math.random() - 0.5) * 80,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          life: 0.9 + Math.random() * 0.5,
          decay: 0.015 + Math.random() * 0.015,
          size: 4 + Math.random() * 9,
          color,
          trail: [], // Trail record
        });
      }

// ★ New: update and draw forge sparks ★
      function updateAndDrawForgeSparkles(s, sparks) {
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];

          // Record trail positions (keep up to 5)
          sp.trail.push({ x: sp.x, y: sp.y });
          if (sp.trail.length > 5) sp.trail.shift();

          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.18; // Gravity, let the spark fall in a parabola
          sp.vx *= 0.96; // Air resistance
          sp.life -= sp.decay;

          if (sp.life <= 0) { sparks.splice(i, 1); continue; }

          // Draw trail
          for (let j = 0; j < sp.trail.length; j++) {
            const trailAlpha = (j / sp.trail.length) * sp.life * 160;
            const trailSize = sp.size * (j / sp.trail.length) * 0.6;
            const tc = s.color(sp.color);
            tc.setAlpha(trailAlpha);
            s.noStroke(); s.fill(tc);
            s.ellipse(sp.trail[j].x, sp.trail[j].y, trailSize, trailSize);
          }

          // Draw main spark
          const alpha = sp.life * 255;
          const c = s.color(sp.color);
          c.setAlpha(alpha);
          s.noStroke(); s.fill(c);
          s.ellipse(sp.x, sp.y, sp.size, sp.size);

          // White core highlight
          const wc = s.color(255, 255, 255);
          wc.setAlpha(alpha * 0.7);
          s.fill(wc);
          s.ellipse(sp.x, sp.y, sp.size * 0.4, sp.size * 0.4);
        }
      }
// ★ 新增结束 ★
    }, overlay);
  }

  static destroy() {
    if (ChestAnimation._p5inst) {
      ChestAnimation._p5inst.remove();
      ChestAnimation._p5inst = null;
    }
    if (ChestAnimation._overlay) {
      ChestAnimation._overlay.remove();
      ChestAnimation._overlay = null;
    }
  }
}

// ★ 修改：加 lidOffY 参数，让盖子飞出屏幕 ★
function drawChest(s, lidAngle, accentColor, lidOffY = 0) {
  const bw = 90, bh = 55;
  const lh = 25;

  s.push();
  s.noStroke();
  s.fill(0, 0, 0, 60);
  s.ellipse(0, bh / 2 + 8, bw + 10, 16);

  s.fill(90, 55, 25);
  s.stroke(60, 35, 15);
  s.strokeWeight(2);
  s.rect(-bw / 2, -bh / 2, bw, bh, 4);

  s.stroke(180, 140, 60);
  s.strokeWeight(3);
  s.line(-bw / 2 + 8, -bh / 2, -bw / 2 + 8, bh / 2);
  s.line(bw / 2 - 8, -bh / 2, bw / 2 - 8, bh / 2);

  s.noStroke();
  s.fill(210, 170, 60);
  s.rect(-8, -8, 16, 16, 3);
  s.fill(170, 130, 40);
  s.ellipse(0, 0, 8, 8);

  s.push();
  s.translate(0, -bh / 2 + lidOffY); // ★ Modified: add fly-out offset ★
  s.rotate(-lidAngle);

  s.fill(110, 70, 30);
  s.stroke(70, 45, 20);
  s.strokeWeight(2);
  s.rect(-bw / 2, -lh, bw, lh, 4, 4, 0, 0);

  s.stroke(200, 160, 60);
  s.strokeWeight(2);
  s.line(-bw / 2 + 8, -lh, -bw / 2 + 8, 0);
  s.line(bw / 2 - 8, -lh, bw / 2 - 8, 0);

  s.noStroke();
  s.fill(200, 160, 60);
  s.arc(0, -lh, 30, 12, s.PI, 0);
  s.pop();

  if (lidAngle > 0.1) {
    const glowAlpha = Math.min(200, lidAngle * 300);
    const c = s.color(accentColor);
    c.setAlpha(glowAlpha);
    s.noStroke();
    s.fill(c);
    s.rect(-bw / 2 + 4, -bh / 2 - 4, bw - 8, 8, 4);
  }
  s.pop();
}

function drawItemIcon(s, iconType, alpha, accentColor) {
  s.push();
  const a = alpha / 255;
  switch (iconType) {
    case 'shield': drawShieldIcon(s, a, accentColor); break;
    case 'sword': drawSwordIcon(s, a, accentColor); break;
    case 'potion': drawPotionIcon(s, a, accentColor); break;
    case 'boots': drawBootsIcon(s, a, accentColor); break;
    case 'clover': drawCloverIcon(s, a, accentColor); break;
    case 'bracelet':
    case 'ring_strength':
    case 'ring_intellect': {
      const img = window.DataLoader?.getImage(iconType);
      if (img) {
        s.drawingContext.save();
        s.drawingContext.globalAlpha = a;
        s.drawingContext.drawImage(img, -28, -28, 56, 56);
        s.drawingContext.restore();
      } else {
        drawFallbackRingIcon(s, a, accentColor);
      }
      break;
    }
      // ★ 修改：各武器类型用独立 key 读图，以后换图只改 DataLoader 路径即可 ★
    case 'traveler_set':
    case 'star_cloak':
    case 'bloodthirst_mask':
    case 'lion_heart':
    case 'cursed_codex':
    case 'eagle_eye':
    case 'holy_spirit_heart':{
      const img = window.DataLoader?.getImage(iconType);
      if (img) {
        s.drawingContext.save();
        s.drawingContext.globalAlpha = a;
        s.drawingContext.drawImage(img, -28, -28, 56, 56);
        s.drawingContext.restore();
      } else {
        drawFallbackRingIcon(s, a, accentColor);
      }
      break;
    }
    default: {
          const imgKey = `weapon_${iconType}`;
          const img = window.DataLoader?.getImage(imgKey);
          if (img) {
            s.drawingContext.save();
            s.drawingContext.globalAlpha = a;
            s.drawingContext.drawImage(img, -28, -28, 56, 56);
            s.drawingContext.restore();
          } else {
            drawSwordIcon(s, a, accentColor);
          }
          break;
        }
  }
  s.pop();
}

function drawShieldIcon(s, a, color) {
  s.push(); s.scale(1.8);
  s.fill(80, 120, 200, a * 255);
  s.stroke(200, 200, 255, a * 255);
  s.strokeWeight(2);
  s.beginShape();
  s.vertex(0, -20); s.vertex(18, -14); s.vertex(18, 4); s.vertex(0, 20); s.vertex(-18, 4); s.vertex(-18, -14);
  s.endShape(s.CLOSE);
  s.stroke(255, 220, 100, a * 255); s.strokeWeight(3);
  s.line(0, -12, 0, 12); s.line(-10, -2, 10, -2);
  s.pop();
}

function drawSwordIcon(s, a, color) {
  s.push(); s.scale(1.8);
  s.stroke(220, 220, 240, a * 255); s.strokeWeight(4);
  s.line(0, -24, 0, 10);
  s.fill(240, 240, 255, a * 255); s.noStroke();
  s.triangle(-3, -24, 3, -24, 0, -30);
  s.stroke(180, 140, 50, a * 255); s.strokeWeight(3);
  s.line(-10, 10, 10, 10);
  s.stroke(120, 70, 30, a * 255); s.strokeWeight(4);
  s.line(0, 10, 0, 20);
  s.noStroke(); s.fill(200, 50, 50, a * 255);
  s.ellipse(0, 10, 6, 6);
  s.pop();
}

function drawPotionIcon(s, a, color) {
  s.push(); s.scale(1.8);
  s.fill(200, 230, 255, a * 200); s.stroke(180, 210, 240, a * 255); s.strokeWeight(1.5);
  s.beginShape();
  s.vertex(-4, -10); s.vertex(-4, -6); s.vertex(-12, 4); s.vertex(-12, 14);
  s.bezierVertex(-12, 20, 12, 20, 12, 14); s.vertex(12, 4); s.vertex(4, -6); s.vertex(4, -10);
  s.endShape(s.CLOSE);
  s.noStroke(); s.fill(100, 200, 255, a * 220);
  s.beginShape(); s.vertex(-11, 6); s.vertex(-11, 14); s.bezierVertex(-11, 19, 11, 19, 11, 14); s.vertex(11, 6);
  s.endShape(s.CLOSE);
  s.fill(180, 160, 120, a * 255); s.noStroke(); s.rect(-5, -14, 10, 5, 2);
  s.stroke(255, 255, 255, a * 120); s.strokeWeight(1.5); s.line(-6, -2, -8, 8);
  s.pop();
}

function drawBootsIcon(s, a, color) {
  s.push(); s.scale(1.8);
  s.fill(80, 60, 50, a * 255); s.stroke(120, 90, 60, a * 255); s.strokeWeight(1.5);
  s.beginShape(); s.vertex(-14, -15); s.vertex(-14, 8); s.vertex(-20, 12); s.vertex(-20, 16); s.vertex(-2, 16); s.vertex(-2, 8); s.vertex(-6, -15);
  s.endShape(s.CLOSE);
  s.beginShape(); s.vertex(2, -15); s.vertex(2, 8); s.vertex(2, 16); s.vertex(20, 16); s.vertex(20, 12); s.vertex(14, 8); s.vertex(6, -15);
  s.endShape(s.CLOSE);
  s.stroke(255, 220, 50, a * 255); s.strokeWeight(2); s.noFill();
  s.beginShape(); s.vertex(-12, -6); s.vertex(-9, -1); s.vertex(-12, 2); s.vertex(-8, 8); s.endShape();
  s.beginShape(); s.vertex(5, -6); s.vertex(8, -1); s.vertex(5, 2); s.vertex(9, 8); s.endShape();
  s.pop();
}

function drawCloverIcon(s, a, color) {
  s.push(); s.scale(1.8); s.noStroke();
  const leafColor = s.color(60, 180, 80, a * 255);
  s.fill(leafColor); s.ellipse(-7, -7, 14, 14); s.ellipse(7, -7, 14, 14); s.ellipse(-7, 7, 14, 14); s.ellipse(7, 7, 14, 14);
  s.stroke(40, 140, 50, a * 200); s.strokeWeight(1);
  s.line(0, 0, -7, -7); s.line(0, 0, 7, -7); s.line(0, 0, -7, 7); s.line(0, 0, 7, 7);
  s.stroke(60, 120, 40, a * 255); s.strokeWeight(2); s.noFill();
  s.bezier(0, 4, 2, 14, -2, 18, 1, 24);
  s.noFill(); s.stroke(220, 190, 60, a * 255); s.strokeWeight(2); s.ellipse(0, 0, 36, 36);
  s.pop();
}

function drawLightBeam(s, x, y, color, pulse) {
  s.push(); s.noStroke();
  const baseAlpha = 15 + Math.sin(pulse) * 8;
  for (let i = 3; i >= 0; i--) {
    const c = s.color(color); c.setAlpha(baseAlpha - i * 3); s.fill(c);
    const w = 40 + i * 30;
    s.beginShape(); s.vertex(x - w / 2, 0); s.vertex(x + w / 2, 0); s.vertex(x + 15, y); s.vertex(x - 15, y);
    s.endShape(s.CLOSE);
  }
  s.pop();
}

function updateAndDrawParticles(s, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const c = s.color(p.color); c.setAlpha(p.life * 255); s.noStroke(); s.fill(c);
    s.ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
  }
}

// ★ 修改：支持闪电折线绘制 ★
function updateAndDrawRays(s, rays) {
  for (let i = rays.length - 1; i >= 0; i--) {
    const r = rays[i]; r.life -= r.decay;
    if (r.life <= 0) { rays.splice(i, 1); continue; }
    if (r.points) {
      s.push();
      const gc = s.color(r.color); gc.setAlpha(r.life * 160);
      s.stroke(gc); s.strokeWeight(r.width * r.life * 3); s.noFill();
      s.beginShape();
      for (const pt of r.points) s.vertex(pt.x, pt.y);
      s.endShape();
      const wc = s.color(255, 255, 255); wc.setAlpha(r.life * 220);
      s.stroke(wc); s.strokeWeight(r.width * r.life * 0.8);
      s.beginShape();
      for (const pt of r.points) s.vertex(pt.x, pt.y);
      s.endShape();
      s.pop();
    } else {
      s.push(); s.translate(r.x, r.y); s.rotate(r.angle);
      const c = s.color(r.color); c.setAlpha(r.life * 100);
      s.stroke(c); s.strokeWeight(r.width * r.life);
      s.line(0, 0, 0, -r.length);
      s.pop();
    }
  }
}
// ★ 修改结束 ★

function drawFallbackRingIcon(s, a, accentColor) {
  s.push();
  s.noFill();
  s.stroke(s.color(accentColor));
  s.strokeWeight(5 * a);
  s.ellipse(0, 0, 40, 40);
  s.stroke(255, 255, 255, 160 * a);
  s.strokeWeight(2 * a);
  s.arc(0, 0, 28, 28, -s.PI * 0.9, -s.PI * 0.2);
  s.pop();
}

// ★ 新增：烟花粒子更新与绘制 ★
function updateAndDrawFireworks(s, fireworks) {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i];
    f.x += f.vx; f.y += f.vy;
    f.vy += 0.04;
    f.vx *= 0.97;
    f.life -= f.decay;
    if (f.life <= 0) { fireworks.splice(i, 1); continue; }
    const c = s.color(f.color); c.setAlpha(f.life * 255);
    s.noStroke(); s.fill(c);
    s.ellipse(f.x, f.y, f.size * f.life, f.size * f.life);
  }
}

// ★ 新增：法杖/魔法书降级图标 ★
function drawStaffFallback(s, a, color) {
  s.push(); s.scale(1.8);
  s.stroke(180, 140, 255, a * 255); s.strokeWeight(4);
  s.line(0, -28, 0, 18);
  s.noStroke(); s.fill(160, 100, 255, a * 255);
  s.ellipse(0, -28, 18, 18);
  s.fill(255, 220, 100, a * 200);
  s.ellipse(0, -28, 8, 8);
  s.pop();
}

// ★ 新增：弓箭降级图标 ★
function drawBowFallback(s, a, color) {
  s.push(); s.scale(1.8);
  s.noFill(); s.stroke(100, 200, 100, a * 255); s.strokeWeight(3);
  s.arc(0, 0, 36, 50, -s.PI * 0.6, s.PI * 0.6);
  s.stroke(220, 200, 150, a * 255); s.strokeWeight(2);
  s.line(0, -22, 0, 22);
  s.pop();
}

// ★ 新增：拳套降级图标 ★
function drawFistFallback(s, a, color) {
  s.push(); s.scale(1.8);
  s.fill(200, 100, 50, a * 255); s.stroke(150, 70, 30, a * 255); s.strokeWeight(2);
  s.rect(-12, -8, 24, 20, 4);
  s.rect(-10, -18, 8, 12, 3);
  s.rect(2, -16, 8, 10, 3);
  s.pop();
}
// ★ 新增结束 ★