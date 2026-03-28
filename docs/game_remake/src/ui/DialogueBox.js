// src/ui/DialogueBox.js
// ══════════════════════════════════════════════════════════════════════
// NPC 对话框组件
// 独立组件，不依赖任何现有代码
// 用法：
//   const box = new DialogueBox();
//   box.show({ name: '老向导', lines: ['第一句', '第二句'] }, onDone);
// ══════════════════════════════════════════════════════════════════════

export class DialogueBox {
  constructor() {
    this._el = null;
    this._onDone = null;
    this._lines = [];
    this._current = 0;
    this._build();
  }

  // ── 构建 DOM ────────────────────────────────────────────────────────
  _build() {
    // 整体容器（全屏遮罩底部）
    const wrap = document.createElement('div');
    wrap.id = 'dialogue-wrap';
    wrap.style.cssText = `
      position: fixed;
      inset: 0;
      display: none;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 36px;
      z-index: 900;
      pointer-events: none;
    `;

    // 对话区域（头像 + 对话框）
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 860px;
      pointer-events: all;
    `;

    // ── 头像区 ────────────────────────────────────────────────────────
    const avatarWrap = document.createElement('div');
    avatarWrap.style.cssText = `
      position: absolute;
      top: -88px;
      left: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    `;

    // 头像圆框（占位用emoji，后续换图片只需替换这里）
    this._avatarEl = document.createElement('div');
    this._avatarEl.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #2d3748;
      border: 3px solid rgba(251,191,36,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      overflow: hidden;
    `;
    this._avatarEl.textContent = '🧙';

    // NPC 名字
    this._nameEl = document.createElement('div');
    this._nameEl.style.cssText = `
      background: rgba(10,8,6,0.9);
      border: 1px solid rgba(251,191,36,0.5);
      border-radius: 6px;
      padding: 2px 12px;
      font-family: sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #fbbf24;
      white-space: nowrap;
      letter-spacing: 0.05em;
    `;

    avatarWrap.appendChild(this._avatarEl);
    avatarWrap.appendChild(this._nameEl);

    // ── 对话框 ────────────────────────────────────────────────────────
    const box = document.createElement('div');
    box.style.cssText = `
      background: rgba(10,8,6,0.93);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 12px;
      padding: 26px 36px 20px 168px;
      min-height: 110px;
      cursor: pointer;
    `;

    // 对话文字
    this._textEl = document.createElement('p');
    this._textEl.style.cssText = `
      font-family: sans-serif;
      font-size: 15px;
      color: #f3f4f6;
      line-height: 1.85;
      margin: 0 0 14px 0;
      min-height: 56px;
    `;

    // 底部：页码 + 继续按钮
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    this._pageEl = document.createElement('span');
    this._pageEl.style.cssText = `
      font-family: sans-serif;
      font-size: 12px;
      color: #6b7280;
    `;

    this._btnEl = document.createElement('button');
    this._btnEl.style.cssText = `
      background: transparent;
      border: 1px solid rgba(251,191,36,0.5);
      border-radius: 6px;
      padding: 5px 18px;
      color: #fbbf24;
      font-family: sans-serif;
      font-size: 13px;
      cursor: pointer;
    `;
    this._btnEl.textContent = '继续 ▶';
    // 点击整个对话框也可以推进
    this._btnEl.addEventListener('click', (e) => { e.stopPropagation(); this._next(); });

    footer.appendChild(this._pageEl);
    footer.appendChild(this._btnEl);
    box.appendChild(this._textEl);
    box.appendChild(footer);

    container.appendChild(avatarWrap);
    container.appendChild(box);
    wrap.appendChild(container);
    document.body.appendChild(wrap);

    this._el = wrap;
  }

  // ── 公开：显示对话 ──────────────────────────────────────────────────
  /**
   * @param {object} config
   * @param {string} config.name      NPC 名字
   * @param {string[]} config.lines   对话内容数组
   * @param {string} [config.avatar]  头像 emoji 或图片 URL（可选）
   * @param {Function} onDone         全部读完后的回调
   */
  show(config, onDone) {
    this._lines = config.lines ?? [];
    this._current = 0;
    this._onDone = onDone ?? null;

    this._nameEl.textContent = config.name ?? 'NPC';

    // 头像：支持 emoji 字符串或图片 URL
    if (config.avatar && config.avatar.startsWith('http')) {
      this._avatarEl.innerHTML = `<img src="${config.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      this._avatarEl.textContent = config.avatar ?? '🧙';
    }

    this._el.style.display = 'flex';
    this._render();
  }

  // ── 公开：隐藏 ─────────────────────────────────────────────────────
  hide() {
    this._el.style.display = 'none';
  }

  // ── 内部：渲染当前句子 ──────────────────────────────────────────────
  _render() {
    const total = this._lines.length;
    const idx = this._current;
    this._textEl.textContent = this._lines[idx] ?? '';
    this._pageEl.textContent = `${idx + 1} / ${total}`;
    this._btnEl.textContent = idx === total - 1 ? '开始 ▶' : '继续 ▶';
  }

  // ── 内部：推进到下一句 ──────────────────────────────────────────────
  _next() {
    this._current++;
    if (this._current >= this._lines.length) {
      this.hide();
      this._onDone?.();
    } else {
      this._render();
    }
  }
}
