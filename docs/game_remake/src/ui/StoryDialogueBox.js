// src/ui/StoryDialogueBox.js
// ══════════════════════════════════════════════════════════════════════
// Story Dialogue Box with Image Support
// Used to display story dialogues with images and multiple lines of text
// Usage:
//   const box = new StoryDialogueBox();
//   box.show({
//     scenes: [
//       {
//         image: './resource/img/map/chapter1/end1.png',
//         lines: ['First line', 'Second line']
//       },
//       {
//         image: './resource/img/map/chapter1/end2.png',
//         lines: ['Third line', 'Fourth line']
//       }
//     ]
//   }, onDone);
// ══════════════════════════════════════════════════════════════════════

export class StoryDialogueBox {
  constructor() {
    this._el = null;
    this._onDone = null;
    this._scenes = [];
    this._currentScene = 0;
    this._currentLine = 0;
    this._build();
  }

  // ── Build DOM ──────────────────────────────────────────────────────
  _build() {
    // Main container
    const wrap = document.createElement('div');
    wrap.id = 'story-dialogue-wrap';
    wrap.style.cssText = `
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      pointer-events: all;
    `;

    // Content container
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 900px;
      background: rgba(10, 8, 6, 0.95);
      border: 2px solid rgba(251, 191, 36, 0.5);
      border-radius: 16px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    `;

    // ── Image area ───────────────────────────────────────────────────
    this._imageEl = document.createElement('img');
    this._imageEl.style.cssText = `
      width: 100%;
      height: auto;
      max-height: 400px;
      object-fit: cover;
      display: block;
      background: #1a1a1a;
    `;

    // ── Text area ────────────────────────────────────────────────────
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      padding: 24px 32px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `;

    // Dialogue text
    this._textEl = document.createElement('p');
    this._textEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #f3f4f6;
      line-height: 1.8;
      margin: 0 0 16px 0;
      min-height: 48px;
    `;

    // Bottom: page number + button
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid rgba(251, 191, 36, 0.2);
    `;

    this._pageEl = document.createElement('span');
    this._pageEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.05em;
    `;

    this._btnEl = document.createElement('button');
    this._btnEl.style.cssText = `
      background: transparent;
      border: 1px solid rgba(251, 191, 36, 0.5);
      border-radius: 6px;
      padding: 6px 20px;
      color: #fbbf24;
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    this._btnEl.textContent = ' Continue >>';
    this._btnEl.addEventListener('click', () => this._next());
    
    // Button hover effect
    this._btnEl.addEventListener('mouseover', () => {
      this._btnEl.style.background = 'rgba(251, 191, 36, 0.1)';
      this._btnEl.style.borderColor = 'rgba(251, 191, 36, 0.8)';
    });
    this._btnEl.addEventListener('mouseout', () => {
      this._btnEl.style.background = 'transparent';
      this._btnEl.style.borderColor = 'rgba(251, 191, 36, 0.5)';
    });

    footer.appendChild(this._pageEl);
    footer.appendChild(this._btnEl);
    textContainer.appendChild(this._textEl);
    textContainer.appendChild(footer);

    container.appendChild(this._imageEl);
    container.appendChild(textContainer);
    wrap.appendChild(container);
    document.body.appendChild(wrap);

    this._el = wrap;
  }

  // ── Public: show story dialogue ───────────────────────────────────
  /**
   * @param {object} config
  * @param {Array} config.scenes  Array of scenes, each contains { image, lines }
  * @param {Function} onDone      Callback after all lines are read
   */
  show(config, onDone) {
    this._scenes = config.scenes ?? [];
    this._currentScene = 0;
    this._currentLine = 0;
    this._onDone = onDone ?? null;

    if (this._scenes.length > 0) {
      this._el.style.display = 'flex';
      this._renderScene();
    }
  }

  // ── Public: hide ──────────────────────────────────────────────────
  hide() {
    this._el.style.display = 'none';
  }

  // ── Internal: render current scene and current line ───────────────
  _renderScene() {
    const scene = this._scenes[this._currentScene];
    if (!scene) return;

    // Set image
    if (scene.image) {
      this._imageEl.src = scene.image;
      this._imageEl.style.display = 'block';
    } else {
      this._imageEl.style.display = 'none';
    }

    // Render the text of the current line
    this._renderLine();
  }

  _renderLine() {
    const scene = this._scenes[this._currentScene];
    if (!scene) return;

    const lines = scene.lines ?? [];
    const idx = this._currentLine;
    this._textEl.textContent = lines[idx] ?? '';

    // Update page number
    const totalScenes = this._scenes.length;
    const totalLines = lines.length;
    this._pageEl.textContent = `Scene ${this._currentScene + 1}/${totalScenes} - Line ${idx + 1}/${totalLines}`;

    // Update button text
    const isLastLineOfLastScene = this._currentScene === totalScenes - 1 && idx === totalLines - 1;
    this._btnEl.textContent = isLastLineOfLastScene ? ' Start >' : ' Continue >>';
  }

  // ── Internal: advance to next line or next scene ─────────────────
  _next() {
    if (this._currentScene >= this._scenes.length) return;

    const scene = this._scenes[this._currentScene];
    const lines = scene.lines ?? [];

    // If there is a next line in the current scene
    if (this._currentLine < lines.length - 1) {
      this._currentLine++;
      this._renderLine();
    } 
    // Otherwise go to the next scene
    else if (this._currentScene < this._scenes.length - 1) {
      this._currentScene++;
      this._currentLine = 0;
      this._renderScene();
    } 
    // All done
    else {
      this.hide();
      this._onDone?.();
    }
  }
}
