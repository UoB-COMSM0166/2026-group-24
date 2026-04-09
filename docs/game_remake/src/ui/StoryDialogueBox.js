// src/ui/StoryDialogueBox.js
// ══════════════════════════════════════════════════════════════════════
// Story Dialogue Box with Image Support
// 用于显示包含图片和多行文字的故事对话
// 用法：
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

  // ── 构建 DOM ────────────────────────────────────────────────────────
  _build() {
    // 整体容器
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

    // 内容容器
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

    // ── 图片区 ────────────────────────────────────────────────────────
    this._imageEl = document.createElement('img');
    this._imageEl.style.cssText = `
      width: 100%;
      height: auto;
      max-height: 400px;
      object-fit: cover;
      display: block;
      background: #1a1a1a;
    `;

    // ── 文字区 ────────────────────────────────────────────────────────
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      padding: 24px 32px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `;

    // 对话文字
    this._textEl = document.createElement('p');
    this._textEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #f3f4f6;
      line-height: 1.8;
      margin: 0 0 16px 0;
      min-height: 48px;
    `;

    // 底部：页码 + 按钮
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
    
    // 按钮hover效果
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

  // ── 公开：显示故事对话 ────────────────────────────────────────────
  /**
   * @param {object} config
   * @param {Array} config.scenes  场景数组，每个包含 { image, lines }
   * @param {Function} onDone      全部读完后的回调
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

  // ── 公开：隐藏 ─────────────────────────────────────────────────────
  hide() {
    this._el.style.display = 'none';
  }

  // ── 内部：渲染当前场景和当前行 ────────────────────────────────────
  _renderScene() {
    const scene = this._scenes[this._currentScene];
    if (!scene) return;

    // 设置图片
    if (scene.image) {
      this._imageEl.src = scene.image;
      this._imageEl.style.display = 'block';
    } else {
      this._imageEl.style.display = 'none';
    }

    // 渲染当前行的文字
    this._renderLine();
  }

  _renderLine() {
    const scene = this._scenes[this._currentScene];
    if (!scene) return;

    const lines = scene.lines ?? [];
    const idx = this._currentLine;
    this._textEl.textContent = lines[idx] ?? '';

    // 更新页码
    const totalScenes = this._scenes.length;
    const totalLines = lines.length;
    this._pageEl.textContent = `Scene ${this._currentScene + 1}/${totalScenes} - Line ${idx + 1}/${totalLines}`;

    // 更新按钮文字
    const isLastLineOfLastScene = this._currentScene === totalScenes - 1 && idx === totalLines - 1;
    this._btnEl.textContent = isLastLineOfLastScene ? ' Start >' : ' Continue >>';
  }

  // ── 内部：推进到下一行或下一场景 ────────────────────────────────
  _next() {
    if (this._currentScene >= this._scenes.length) return;

    const scene = this._scenes[this._currentScene];
    const lines = scene.lines ?? [];

    // 如果还有当前场景的下一行
    if (this._currentLine < lines.length - 1) {
      this._currentLine++;
      this._renderLine();
    } 
    // 否则进入下一场景
    else if (this._currentScene < this._scenes.length - 1) {
      this._currentScene++;
      this._currentLine = 0;
      this._renderScene();
    } 
    // 全部完成
    else {
      this.hide();
      this._onDone?.();
    }
  }
}
