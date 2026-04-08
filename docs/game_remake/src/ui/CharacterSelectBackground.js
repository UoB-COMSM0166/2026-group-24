export class CharacterSelectBackground {
  constructor(container) {
    this.container = container;
    this.host = null;
    this.instance = null;
  }

  show() {
    if (!this.container) return;

    const host = this._ensureHost();
    host.style.display = 'block';

    if (!window.p5) return;

    if (!this.instance) {
      this.instance = new window.p5(this._buildSketch(), host);
      return;
    }

    const { width, height } = this._getSize();
    this.instance.resizeCanvas(width, height);
    this.instance.loop();
  }

  hide() {
    if (this.host) this.host.style.display = 'none';
    if (this.instance) this.instance.noLoop();
  }

  destroy() {
    if (this.instance) {
      this.instance.remove();
      this.instance = null;
    }
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }

  _ensureHost() {
    if (!this.host) {
      this.host = document.createElement('div');
      this.host.className = 'char-select-p5-layer';
      this.container.prepend(this.host);
    }
    return this.host;
  }

  _getSize() {
    const width = Math.max(this.container?.clientWidth || window.innerWidth || 1, 1);
    const height = Math.max(this.container?.clientHeight || window.innerHeight || 1, 1);
    return { width, height };
  }

  _buildSketch() {
    return (p) => {
      const stars = [];
      const fireflies = [];
      const embers = [];
      let treeBands = [];
      let skyTop;
      let skyMid;
      let skyBottom;

      const resetStar = (star) => {
        star.x = p.random(p.width);
        star.y = p.random(14, p.height * 0.58);
        star.size = p.random(1, 3.2);
        star.alpha = p.random(120, 255);
        star.phase = p.random(p.TWO_PI);
        star.twinkle = p.random(0.01, 0.04);
      };

      const resetFirefly = (firefly) => {
        firefly.anchorX = p.random(p.width);
        firefly.anchorY = p.random(p.height * 0.4, p.height * 0.86);
        firefly.rangeX = p.random(16, 46);
        firefly.rangeY = p.random(10, 32);
        firefly.phase = p.random(p.TWO_PI);
        firefly.speed = p.random(0.004, 0.012);
        firefly.size = p.random(2.4, 4.8);
      };

      const resetEmber = (ember) => {
        ember.x = p.width * 0.5 + p.random(-28, 28);
        ember.y = p.height * 0.79 + p.random(-8, 6);
        ember.vx = p.random(-0.4, 0.4);
        ember.vy = p.random(-2.0, -0.9);
        ember.life = p.random(24, 70);
        ember.maxLife = ember.life;
        ember.size = p.random(1.8, 5.2);
      };

      const buildTreeBand = (count, yBase, minHeight, maxHeight) => {
        return Array.from({ length: count }, () => ({
          x: p.random(-40, p.width + 40),
          y: yBase + p.random(-8, 12),
          w: p.random(14, 28),
          h: p.random(minHeight, maxHeight),
        })).sort((a, b) => a.x - b.x);
      };

      const rebuildScene = () => {
        stars.length = 0;
        fireflies.length = 0;
        embers.length = 0;

        for (let i = 0; i < 88; i += 1) {
          const star = {};
          resetStar(star);
          stars.push(star);
        }

        for (let i = 0; i < 18; i += 1) {
          const firefly = {};
          resetFirefly(firefly);
          fireflies.push(firefly);
        }

        for (let i = 0; i < 12; i += 1) {
          const ember = {};
          resetEmber(ember);
          embers.push(ember);
        }

        treeBands = [
          buildTreeBand(Math.max(10, Math.floor(p.width / 110)), p.height * 0.68, 48, 92),
          buildTreeBand(Math.max(14, Math.floor(p.width / 85)), p.height * 0.79, 62, 132),
        ];
      };

      const drawSky = () => {
        for (let y = 0; y < p.height; y += 2) {
          const t = y / p.height;
          const topBlend = p.lerpColor(skyTop, skyMid, Math.min(t * 1.3, 1));
          const col = p.lerpColor(topBlend, skyBottom, Math.max((t - 0.55) / 0.45, 0));
          p.stroke(col);
          p.line(0, y, p.width, y);
        }
        p.noStroke();

        p.fill(255, 166, 77, 28);
        p.ellipse(p.width * 0.5, p.height * 0.83, p.width * 0.8, p.height * 0.28);
      };

      const drawMoon = () => {
        const moonX = p.width * 0.82;
        const moonY = p.height * 0.18;
        const moonSize = Math.min(p.width, p.height) * 0.11;

        p.noStroke();
        p.fill(155, 205, 255, 20);
        for (let i = 0; i < 4; i += 1) {
          p.ellipse(moonX, moonY, moonSize * (2 + i * 0.38), moonSize * (2 + i * 0.38));
        }

        p.fill(242, 236, 205, 240);
        p.ellipse(moonX, moonY, moonSize, moonSize);
        p.fill(220, 214, 190, 120);
        p.ellipse(moonX - moonSize * 0.12, moonY - moonSize * 0.08, moonSize * 0.18, moonSize * 0.18);
        p.ellipse(moonX + moonSize * 0.18, moonY + moonSize * 0.12, moonSize * 0.12, moonSize * 0.12);
      };

      const drawStars = () => {
        p.noStroke();
        stars.forEach((star) => {
          const shimmer = 0.65 + 0.35 * p.sin(p.frameCount * star.twinkle + star.phase);
          p.fill(235, 242, 255, star.alpha * shimmer);
          p.circle(star.x, star.y, star.size);
        });
      };

      const drawMountainLayer = (baseY, amplitude, scale, colorValue, drift) => {
        p.noStroke();
        p.fill(colorValue);
        p.beginShape();
        p.vertex(-40, p.height);
        for (let x = -40; x <= p.width + 40; x += 22) {
          const noiseVal = p.noise(x * scale + drift, baseY * 0.0025);
          const ridge = baseY - noiseVal * amplitude;
          p.vertex(x, ridge);
        }
        p.vertex(p.width + 40, p.height);
        p.endShape(p.CLOSE);
      };

      const drawMist = (baseY, amplitude, opacity, speed) => {
        p.noStroke();
        p.fill(180, 198, 218, opacity);
        p.beginShape();
        p.vertex(-30, p.height);
        for (let x = -30; x <= p.width + 30; x += 28) {
          const wave = p.noise(x * 0.0025 + p.frameCount * speed, baseY * 0.004) * amplitude;
          const drift = p.sin(x * 0.008 + p.frameCount * speed * 30) * 8;
          p.vertex(x, baseY + wave + drift);
        }
        p.vertex(p.width + 30, p.height);
        p.endShape(p.CLOSE);
      };

      const drawTrees = (trees, colorValue) => {
        p.noStroke();
        p.fill(colorValue);
        trees.forEach((tree) => {
          p.rect(tree.x - tree.w * 0.08, tree.y, tree.w * 0.16, tree.h * 0.24, 2);
          p.triangle(tree.x, tree.y - tree.h, tree.x - tree.w * 0.5, tree.y, tree.x + tree.w * 0.5, tree.y);
          p.triangle(tree.x, tree.y - tree.h * 0.7, tree.x - tree.w * 0.62, tree.y, tree.x + tree.w * 0.62, tree.y);
        });
      };

      const drawPath = () => {
        p.noStroke();
        p.fill(72, 56, 34, 145);
        p.beginShape();
        p.vertex(p.width * 0.33, p.height);
        p.bezierVertex(
          p.width * 0.4, p.height * 0.88,
          p.width * 0.45, p.height * 0.7,
          p.width * 0.48, p.height * 0.58
        );
        p.bezierVertex(
          p.width * 0.52, p.height * 0.56,
          p.width * 0.57, p.height * 0.73,
          p.width * 0.67, p.height
        );
        p.endShape(p.CLOSE);

        p.fill(128, 102, 62, 36);
        p.beginShape();
        p.vertex(p.width * 0.45, p.height);
        p.bezierVertex(
          p.width * 0.48, p.height * 0.88,
          p.width * 0.49, p.height * 0.73,
          p.width * 0.495, p.height * 0.59
        );
        p.bezierVertex(
          p.width * 0.505, p.height * 0.61,
          p.width * 0.515, p.height * 0.76,
          p.width * 0.56, p.height
        );
        p.endShape(p.CLOSE);
      };

      const drawGround = () => {
        p.noStroke();
        p.fill(18, 24, 18, 230);
        p.beginShape();
        p.vertex(0, p.height * 0.72);
        p.bezierVertex(p.width * 0.18, p.height * 0.68, p.width * 0.33, p.height * 0.75, p.width * 0.5, p.height * 0.72);
        p.bezierVertex(p.width * 0.7, p.height * 0.69, p.width * 0.86, p.height * 0.76, p.width, p.height * 0.71);
        p.vertex(p.width, p.height);
        p.vertex(0, p.height);
        p.endShape(p.CLOSE);
      };

      const drawCampfire = () => {
        const fireX = p.width * 0.5;
        const fireY = p.height * 0.79;
        const flicker = 1 + p.sin(p.frameCount * 0.18) * 0.08;

        p.noStroke();
        p.fill(255, 154, 52, 40);
        p.ellipse(fireX, fireY + 10, 170 * flicker, 56 * flicker);
        p.fill(255, 186, 98, 28);
        p.ellipse(fireX, fireY + 6, 260 * flicker, 84 * flicker);

        p.stroke(84, 56, 24, 220);
        p.strokeWeight(6);
        p.line(fireX - 16, fireY + 12, fireX + 18, fireY - 2);
        p.line(fireX - 12, fireY - 1, fireX + 20, fireY + 11);
        p.noStroke();

        p.fill(255, 226, 138, 220);
        p.triangle(fireX, fireY - 34 * flicker, fireX - 14, fireY + 8, fireX + 14, fireY + 8);
        p.fill(255, 148, 54, 225);
        p.triangle(fireX + 2, fireY - 22 * flicker, fireX - 11, fireY + 4, fireX + 12, fireY + 4);
        p.fill(255, 246, 210, 180);
        p.triangle(fireX, fireY - 12 * flicker, fireX - 5, fireY + 1, fireX + 5, fireY + 1);

        p.fill(255, 204, 120, 16);
        p.rect(0, p.height * 0.67, p.width, p.height * 0.33);
      };

      const drawFireflies = () => {
        p.noStroke();
        fireflies.forEach((firefly, index) => {
          const x = firefly.anchorX + p.sin(p.frameCount * firefly.speed + firefly.phase) * firefly.rangeX;
          const y = firefly.anchorY + p.cos(p.frameCount * firefly.speed * 1.3 + firefly.phase + index) * firefly.rangeY;
          const pulse = 0.55 + 0.45 * p.sin(p.frameCount * firefly.speed * 8 + firefly.phase);
          p.fill(255, 223, 123, 18 * pulse);
          p.circle(x, y, firefly.size * 5.5);
          p.fill(255, 234, 153, 210 * pulse);
          p.circle(x, y, firefly.size);
        });
      };

      const drawEmbers = () => {
        p.noStroke();
        embers.forEach((ember) => {
          ember.x += ember.vx;
          ember.y += ember.vy;
          ember.life -= 1;

          if (ember.life <= 0 || ember.y < p.height * 0.56) {
            resetEmber(ember);
          }

          const alpha = p.map(ember.life, 0, ember.maxLife, 0, 180);
          p.fill(255, 182, 88, alpha);
          p.circle(ember.x, ember.y, ember.size);
        });
      };

      const drawRuins = () => {
        p.noStroke();
        p.fill(26, 31, 34, 150);
        p.rect(p.width * 0.12, p.height * 0.58, 28, p.height * 0.16, 4);
        p.rect(p.width * 0.12 - 10, p.height * 0.56, 48, 10, 3);
        p.rect(p.width * 0.82, p.height * 0.55, 32, p.height * 0.2, 4);
        p.rect(p.width * 0.82 - 12, p.height * 0.53, 56, 12, 3);
      };

      const drawVignette = () => {
        p.noStroke();
        p.fill(0, 0, 0, 90);
        p.rect(0, 0, p.width, 40);
        p.rect(0, p.height - 80, p.width, 80);
        p.fill(0, 0, 0, 45);
        p.rect(0, 0, 80, p.height);
        p.rect(p.width - 80, 0, 80, p.height);
      };

      p.setup = () => {
        const { width, height } = this._getSize();
        p.createCanvas(width, height);
        p.pixelDensity(1);
        p.noStroke();
        skyTop = p.color(6, 14, 24);
        skyMid = p.color(16, 29, 45);
        skyBottom = p.color(66, 50, 28);
        rebuildScene();
      };

      p.windowResized = () => {
        const { width, height } = this._getSize();
        p.resizeCanvas(width, height);
        rebuildScene();
      };

      p.draw = () => {
        drawSky();
        drawStars();
        drawMoon();

        drawMountainLayer(p.height * 0.58, p.height * 0.18, 0.0022, p.color(18, 32, 44, 215), 12);
        drawMist(p.height * 0.54, 28, 24, 0.0024);
        drawMountainLayer(p.height * 0.67, p.height * 0.14, 0.0034, p.color(20, 35, 31, 230), 30);
        drawRuins();
        drawTrees(treeBands[0], p.color(16, 24, 22, 180));

        drawGround();
        drawPath();
        drawMist(p.height * 0.72, 18, 32, 0.0045);
        drawTrees(treeBands[1], p.color(9, 15, 13, 240));
        drawCampfire();
        drawEmbers();
        drawFireflies();
        drawVignette();
      };
    };
  }
}
