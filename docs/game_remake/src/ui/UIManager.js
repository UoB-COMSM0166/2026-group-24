// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';
import { ChestAnimation } from './ChestAnimation.js';
import { CharacterSelectBackground } from './CharacterSelectBackground.js';
import { InventoryUI } from './InventoryUI.js';
import { StoryDialogueBox } from './StoryDialogueBox.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
    this.els = {
      charSelectScreen: elements.charSelectScreen,
      heroSlots: elements.heroSlots,
      charConfirmBtn: elements.charConfirmBtn,
      charSelectedInfo: elements.charSelectedInfo,
      difficultyButtons: document.getElementById('difficulty-buttons'),
      mapGenScreen: elements.mapGenScreen,
      hud: elements.hud,
      movementEl: elements.movementEl,
      combatUI: elements.combatUI,
      reactCombatRoot: elements.reactCombatRoot || document.getElementById('react-combat-root'),
      partyStatus: document.getElementById('party-status-overlay'),
      eventUI: document.getElementById('event-ui'),
      eventTitle: document.getElementById('event-title'),
      eventDesc: document.getElementById('event-desc'),
      eventButtons: document.getElementById('event-buttons'),
      storyScreen: document.getElementById('story-screen'),
      storyTitle: document.getElementById('story-title'),
      storyText: document.getElementById('story-text'),
      storyNextBtn: document.getElementById('story-next-btn'),
      storyPage: document.getElementById('story-page'),
    };
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
    this.inventoryUI = new InventoryUI();
    this.characterSelectBackground = new CharacterSelectBackground(this.els.charSelectScreen);
    this.storyDialogueBox = new StoryDialogueBox();
    this.animFrameReq = null;

  }

  _drawHeroPreview(ctx, heroId, width, height, time) {
    const anim = DataLoader.animations[heroId];
    if (!anim || !anim.idle) return;

    ctx.clearRect(0, 0, width, height);

    // --- 在这里定义每个英雄的微调参数 ---
    const configs = {
        'wizard': { width: 220, height: 220, offsetX: 20, offsetY: -10, frameCount: 6 },
        'knight': { width: 316, height: 280, offsetX: 12, offsetY: -95 },
        'priest': { width: 316, height: 280, offsetX: 12, offsetY: -90 },
        'ranger': { width: 316, height: 280, offsetX: 12, offsetY: -95 },
        'default': { width: 150, height: 150, offsetX: 0, offsetY: 0 }
    };

    const cfg = configs[heroId] || configs['default'];
    const drawWidth = cfg.width ?? cfg.size ?? 150;
    const drawHeight = cfg.height ?? cfg.size ?? 150;
    const renderWidth = heroId === 'wizard' ? drawWidth : Math.round(drawWidth * 1.08);
    const renderHeight = drawHeight;
    const drawSize = heroId === 'wizard' ? drawWidth : renderWidth;
    // 居中计算公式：(画布宽度 - 绘制宽度) / 2 + 偏移量
    const dx = (width - renderWidth) / 2 + cfg.offsetX;
    const dy = (height - renderHeight) / 2 + cfg.offsetY;

    if (heroId === 'wizard') {
        const img = anim.idle;
        const frameCount = cfg.frameCount; 
        const frameWidth = img.width / frameCount;
        const frameHeight = img.height;
        const frameIdx = Math.floor(time / 100) % frameCount;

        ctx.drawImage(
            img,
            frameIdx * frameWidth, 0, frameWidth, frameHeight, // 切片源
            dx, dy, drawSize, drawSize                        // 绘制目标
        );
    } else {
        const frames = anim.idle;
        if (frames.length === 0) return;
        const frameIdx = Math.floor(time / 100) % frames.length;
        const img = frames[frameIdx];
        
        ctx.drawImage(img, dx, dy, drawSize, drawSize);
    }
}

  updatePartyStatus(heroes) {
    this.inventoryUI?.update(heroes);
    if (!this.els.partyStatus) return;
    this.els.partyStatus.style.display = 'flex';
    this.els.partyStatus.innerHTML = '';

    heroes.forEach(hero => {
      const hpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
      const skills = (hero.skillSlots || []).filter(s => s);
      const skillsHtml = skills.length > 0 
        ? skills.map(s => `<div style="color: #ccc; font-size: 10px; margin-top: 2px;">• ${s.name}: ${s.desc}</div>`).join('')
        : '<div style="color: #666; font-size: 10px;">(No skills equipped)</div>';

      const box = document.createElement('div');
      box.className = 'hero-status-box';
      box.innerHTML = `
        <div style="font-weight:bold; font-size:14px; text-shadow: 1px 1px 2px black;">${hero.name}</div>
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${hpPct}%; background: ${hpPct < 30 ? 'linear-gradient(90deg, #e74c3c, #c0392b)' : ''}"></div></div>
        <div class="hp-text">HP ${hero.hp} / ${hero.maxHp}</div>
        <div class="stat-detail">
          <div style="margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">Attributes</div>
          <div style="margin-bottom: 8px;"><div style="margin-bottom: 8px;">STR: ${hero.strength} | VIT: ${hero.vitality} | AGI: ${hero.agility} | INT: ${hero.intellect} | AWR: ${hero.awareness} | TAL: ${hero.talent}</div>
          <div style="margin-bottom: 4px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">Current Skills</div>
          ${skillsHtml}
        </div>
      `;
      box.onclick = () => {
        const detail = box.querySelector('.stat-detail');
        detail.style.display = detail.style.display === 'block' ? 'none' : 'block';
      };
      this.els.partyStatus.appendChild(box);
    });
  }

  showCharacterSelect(onConfirm) {
    const { charSelectScreen, heroSlots, charConfirmBtn, charSelectedInfo, difficultyButtons } = this.els;
    charSelectScreen.style.display = 'flex';
    this.characterSelectBackground?.show();
    heroSlots.innerHTML = '';
    if (this.animFrameReq) cancelAnimationFrame(this.animFrameReq);
    const selected = [];
    let selectedDifficulty = 'normal';
    charConfirmBtn.disabled = true;
    charSelectedInfo.innerText = 'Please select 2 heroes';

    // 设置难度按钮
    if (difficultyButtons) {
      const buttons = difficultyButtons.querySelectorAll('.difficulty-btn');
      buttons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.textContent === selectedDifficulty) btn.classList.add('selected');
        btn.onclick = () => {
          selectedDifficulty = btn.textContent;
          buttons.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
      });
    }
    const cardContexts = [];

    DataLoader.getAllHeroes().forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card vivid-card';
      card.innerHTML = `
        <div class="hero-preview-container">
            <canvas class="hero-preview-canvas" width="120" height="120"></canvas>
            <div class="hero-glow"></div>
        </div>
        <div class="hero-card-name">${hero.name}</div>
        <div class="hero-card-desc">${hero.desc ?? ''}</div>
        <div class="hero-card-stats">
            <span>❤️ ${hero.hp}</span>
            <span>⚔️ ${hero.stats?.strength || 10}</span>
            <span>✨ ${hero.stats?.intellect || 10}</span>
        </div>
      `;
      const canvas = card.querySelector('.hero-preview-canvas');
      cardContexts.push({ ctx: canvas.getContext('2d'), id: hero.id });

      card.onclick = () => {
        const idx = selected.indexOf(hero);
        if (idx !== -1) { 
            selected.splice(idx, 1); 
            card.classList.remove('selected'); 
        } else if (selected.length < 2) { 
            selected.push(hero); 
            card.classList.add('selected'); 
        }
        charConfirmBtn.disabled = selected.length !== 2;
        charSelectedInfo.innerText = `Selected ${selected.length}/2 heroes`;
      };
      heroSlots.appendChild(card);
    });

    const animate = (now) => {
      cardContexts.forEach(item => {
        this._drawHeroPreview(item.ctx, item.id, 120, 120, now);
      });
      this.animFrameReq = requestAnimationFrame(animate);
    };
    this.animFrameReq = requestAnimationFrame(animate);

    charConfirmBtn.onclick = () => {
      if (this.animFrameReq) cancelAnimationFrame(this.animFrameReq);
      onConfirm([...selected], selectedDifficulty);
    };
  }

  hideCharacterSelect() { 
    this.els.charSelectScreen.style.display = 'none'; 
    if(this.animFrameReq) cancelAnimationFrame(this.animFrameReq);
    this.characterSelectBackground?.hide();
  }
  showMapGeneration(_heroes, onReady) { this.els.mapGenScreen.style.display = 'flex'; setTimeout(onReady, 1000); }
  hideMapGeneration() { this.els.mapGenScreen.style.display = 'none'; }
  showMapUI() {
    this.els.hud.style.display = 'flex';
    document.getElementById('top-progress').style.display = 'flex';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'flex';
  }
  updateMovementUI(points) { this.els.movementEl.textContent = `Action Points: ${points}`; }
  updateProgressBar(turn, maxTurns) {
    const bar = document.getElementById('turn-progress-bar');
    const text = document.getElementById('turn-progress-text');
    if (!bar) return;
    const pct = Math.min(100, Math.round(turn / maxTurns * 100));
    bar.style.width = `${pct}%`;
    if (text) text.textContent = `${turn}/${maxTurns}`;
    bar.classList.toggle('danger', turn >= maxTurns - 3);
  }

  updateProgressBarTitle(title) {
    const titleEl = document.querySelector('#top-progress-header span:first-child');
    if (titleEl) titleEl.textContent = title;
  }

  updateBossMode() {
    const title = document.querySelector('#top-progress-header span:first-child');
    const desc = document.querySelector('#top-progress-header span:last-child');
    if (title) title.textContent = '⚔️ Boss Battle';
    if (desc) desc.textContent = 'Defeat the boss within 10 turns or the game ends';
  }

  setProgressBarCritical() {
    const bar = document.getElementById('turn-progress-bar');
    document.body.classList.add('screen-flare');
    if (bar) bar.classList.add('critical');
  }

  setProgressBarNormal() {
    const bar = document.getElementById('turn-progress-bar');
    document.body.classList.remove('screen-flare');
    if (bar) bar.classList.remove('critical');
  }

  showGameOver() {
    this.showEvent("💀 Game Over", "You failed to defeat the boss in time!", [{ text: "Restart", onClick: () => location.reload() }]);
  }
  showCombatOverlay(combatManager) {
    if (this.els.combatUI) this.els.combatUI.style.display = 'block';
    this.els.hud.style.display = 'none';
    document.getElementById('top-progress').style.display = 'none';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'none';
    this.updateCombatUI(combatManager);
  }
  hideCombatOverlay() {
    if (this.els.combatUI) this.els.combatUI.style.display = 'none';
    this.els.hud.style.display = 'flex';
    document.getElementById('top-progress').style.display = 'flex';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'flex';
    if (window.unmountCombatUI) window.unmountCombatUI();
  }

  onCombatResult(result) { this.hideCombatOverlay(); this.onCombatEnd(result); }
  showEvent(title, desc, buttons = [], config = {}) {
    const { eventUI, eventTitle, eventDesc, eventButtons } = this.els;
    if (!eventUI) return;

    const titleEl = document.getElementById('event-title');
    const descEl = document.getElementById('event-desc');
    const nameEl = document.getElementById('event-name');
    const avatarEl = document.getElementById('event-avatar');
    const pageEl = document.getElementById('event-page');

    // 设置头像和名字（可选配置）
   if (nameEl) nameEl.textContent = config.name || 'Event';
    if (avatarEl) avatarEl.textContent = config.avatar || '📋';

    eventUI.style.display = 'flex';
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (pageEl) pageEl.textContent = ''; // 单页事件不显示页码

    eventButtons.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.style.cssText = "background: transparent; border: 1px solid rgba(251,191,36,0.5); border-radius: 6px; padding: 5px 18px; color: #fbbf24; font-family: 'Press Start 2P', monospace; font-size: 13px; cursor: pointer; transition: all 0.2s ease;";
      button.onmouseover = () => { button.style.background = 'rgba(251,191,36,0.1)'; };
      button.onmouseout = () => { button.style.background = 'transparent'; };
      button.onclick = () => {
        eventUI.style.display = 'none';
        // 在事件对话框关闭后，调用恢复进度条标题的回调
        if (config.onClose) {
          setTimeout(() => config.onClose(), 50);
        }
        if (btn.onClick) btn.onClick();
      };
      eventButtons.appendChild(button);
    });
  }

  showChestReward(item, onClose) {
    ChestAnimation.play(item, onClose);
  }

  showLootAssign(item, heroes, onPick) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:220; display:flex; align-items:center; justify-content:center; font-family:'Press Start 2P', monospace;";
    const card = document.createElement("div");
    card.style.cssText = "width:460px; max-width:92vw; background:rgba(10,10,25,0.95); border:1px solid rgba(255,255,255,0.18); border-radius:14px; padding:14px; color:white;";
    const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;
    const lootTitle = isWeapon ? '⚔️ Weapon obtained!' : '💍 Item obtained!';
    const lootTypeLabel = isWeapon
        ? `Type: ${item?.type ?? 'Weapon'} | For: ${item?.owner ?? 'Unknown'} | Rarity: ${item?.rarity ?? ''}`
        : `Rarity: ${item?.rarity ?? ''} | Type: Item`;
    const lootHint = isWeapon
        ? '"Equip Now" places it in a weapon slot and refreshes stats. "Store in Bag" sends it to storage.'
        : '"Equip Now" places it in an item slot and refreshes stats. "Store in Bag" sends it to storage.';
    const heroBtns = (heroes ?? []).map((h, i) => {
      return `
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
        <div style="flex:1;opacity:.9;">${h.name ?? `Hero${i + 1}`}</div>
        <button class="loot-put" data-i="${i}" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.06); color:white; cursor:pointer;">Store in Bag</button>
        <button class="loot-equip" data-i="${i}" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(46,204,113,0.18); color:white; cursor:pointer;">Equip Now</button>
      </div>`;
    }).join("");
    card.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
  <div style="font-weight:700;">${lootTitle}</div>
  <button id="loot-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button>
</div>
<div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;">
  <div style="font-weight:700;">${item?.name ?? "Item"}</div>
  <div style="opacity:.75;font-size:12px;margin-top:4px;">${item?.desc ?? ""}</div>
  <div style="opacity:.7;font-size:12px;margin-top:6px;">${lootTypeLabel}</div>
  <div style="opacity:.65;font-size:12px;margin-top:6px;">${lootHint}</div>
</div>
<div style="margin-top:10px;">${heroBtns || `<div style="opacity:.75;">No heroes available</div>`}</div>`;
    overlay.appendChild(card); document.body.appendChild(overlay);
    card.querySelector("#loot-close")?.addEventListener("click", () => { onPick?.({ heroIndex: 0, action: "put" }); overlay.remove(); });
    card.querySelectorAll(".loot-put").forEach(btn => btn.addEventListener("click", () => { onPick?.({ heroIndex: Number(btn.dataset.i), action: "put" }); overlay.remove(); }));
    card.querySelectorAll(".loot-equip").forEach(btn => btn.addEventListener("click", () => { onPick?.({ heroIndex: Number(btn.dataset.i), action: "equip" }); overlay.remove(); }));
  }

  showStoryScreen(title, text, onNext) {
    this.els.storyTitle.textContent = title;
    this.els.storyScreen.style.display = 'flex';

    // 分割文本成页面（按行分割，每页最多显示约3-4行）
    const lines = text.split('\n').filter(line => line.trim());
    const linesPerPage = 3; // 每页显示3行
    let currentPage = 0;
    let totalPages = Math.ceil(lines.length / linesPerPage);

    const showPage = () => {
      const startIdx = currentPage * linesPerPage;
      const endIdx = Math.min(startIdx + linesPerPage, lines.length);
      const pageLines = lines.slice(startIdx, endIdx);
      
      this.els.storyText.textContent = pageLines.join('\n');
      this.els.storyPage.textContent = `${currentPage + 1} / ${totalPages}`;
      
      // 更新按钮文字
      if (currentPage === totalPages - 1) {
        this.els.storyNextBtn.textContent = 'Start >';
      } else {
        this.els.storyNextBtn.textContent = 'Continue >';
      }
    };

    // 处理按钮点击
    this.els.storyNextBtn.onclick = () => {
      currentPage++;
      if (currentPage >= totalPages) {
        this.els.storyScreen.style.display = 'none';
        onNext?.();
      } else {
        showPage();
      }
    };

    // 显示第一页
    showPage();
  }

  hideStoryScreen() {
    this.els.storyScreen.style.display = 'none';
  }
  updateGold(amount) {
      this.inventoryUI?.updateGold(amount);
  }

  /**
   * 显示分段故事（带背景图和对话框UI风格）
   * @param {string} title - 故事标题
   * @param {Array} segments - 分段数组，每个包含 { text, backgroundImage }
   * @param {Function} onComplete - 故事完成后的回调
   * @param {string} avatar - 头像键名（可选）
   */
  showSegmentedStory(title, segments, onComplete = null, avatar = null) {
    const { DataLoader } = window;
    if (!DataLoader || !segments || segments.length === 0) {
      console.warn('Invalid segmented story');
      onComplete?.();
      return;
    }

    let currentSegment = 0;
    let currentPageInSegment = 0;
    let segmentPages = [];

    const showSegment = () => {
      if (currentSegment >= segments.length) {
        segmentedStoryOverlay.remove();
        onComplete?.();
        return;
      }

      // 初始化当前段落的页面
      if (currentPageInSegment === 0) {
        const segment = segments[currentSegment];
        const bgImg = DataLoader.getImage(segment.backgroundImage);
        
        // 更新背景
        bgImageEl.style.backgroundImage = bgImg ? `url('${bgImg.src}')` : 'none';
        
        // 分页：每页3-4行
        const lines = segment.text.split('\n').filter(line => line.trim() || true);
        const linesPerPage = 4;
        segmentPages = [];
        for (let i = 0; i < lines.length; i += linesPerPage) {
          segmentPages.push(lines.slice(i, i + linesPerPage).join('\n'));
        }
        currentPageInSegment = 0;
      }

      // 显示当前页
      textEl.textContent = segmentPages[currentPageInSegment] || '';
      
      // 更新页码
      const totalPagesInSegment = segmentPages.length;
      const isLastPageInSegment = currentPageInSegment === totalPagesInSegment - 1;
      const isLastSegment = currentSegment === segments.length - 1;
      
      pageEl.textContent = `${currentSegment + 1}-${currentPageInSegment + 1} / ${segments.length}-${totalPagesInSegment}`;
      
      // 更新按钮文字（注：btnEl 在这之后才被定义，所以这里不能直接使用）
      // 将在 btnEl 创建时进行处理
    };

    // 创建分段故事UI
    const segmentedStoryOverlay = document.createElement('div');
    segmentedStoryOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 400;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 36px;
      pointer-events: none;
    `;

    // 背景图层
    const bgImageEl = document.createElement('div');
    bgImageEl.style.cssText = `
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(3px);
      z-index: 0;
      pointer-events: none;
    `;

    // 半透明遮罩
    const maskEl = document.createElement('div');
    maskEl.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1;
    `;

    // 对话框容器
    const containerEl = document.createElement('div');
    containerEl.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 860px;
      pointer-events: all;
      z-index: 2;
    `;

    // 头像区域
    const avatarWrapEl = document.createElement('div');
    avatarWrapEl.style.cssText = `
      position: absolute;
      top: -95px;
      left: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      z-index: 10;
    `;

    const avatarEl = document.createElement('div');
    avatarEl.style.cssText = `
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

    // 显示头像：如果提供了avatar键名，则从DataLoader获取图片
    if (avatar) {
      const avatarImg = DataLoader.getImage(avatar);
      if (avatarImg) {
        avatarEl.innerHTML = `<img src="${avatarImg.src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        avatarEl.textContent = '🧙';
      }
    } else {
      avatarEl.textContent = '📖';
    }

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      background: rgba(10,8,6,0.9);
      border: 1px solid rgba(251,191,36,0.5);
      border-radius: 6px;
      padding: 2px 12px;
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #fbbf24;
      white-space: nowrap;
      letter-spacing: 0.05em;
    `;
    nameEl.textContent = title;

    avatarWrapEl.appendChild(avatarEl);
    avatarWrapEl.appendChild(nameEl);

    // 对话框
    const boxEl = document.createElement('div');
    boxEl.style.cssText = `
      background: rgba(10,8,6,0.7);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 12px;
      padding: 26px 36px 20px 168px;
      min-height: 210px;
      max-height: 350px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    `;

    const textEl = document.createElement('p');
    textEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      color: #f3f4f6;
      line-height: 1.6;
      margin: 0 0 14px 0;
      flex: 1;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    `;

    // 底部：页码 + 按钮
    const footerEl = document.createElement('div');
    footerEl.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const pageEl = document.createElement('span');
    pageEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      color: #6b7280;
    `;

    const btnEl = document.createElement('button');
    btnEl.style.cssText = `
      background: transparent;
      border: 1px solid rgba(251,191,36,0.5);
      border-radius: 6px;
      padding: 5px 18px;
      color: #fbbf24;
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    btnEl.onmouseover = () => {
      btnEl.style.background = 'rgba(251,191,36,0.1)';
      btnEl.style.borderColor = 'rgba(251,191,36,0.8)';
    };
    btnEl.onmouseout = () => {
      btnEl.style.background = 'transparent';
      btnEl.style.borderColor = 'rgba(251,191,36,0.5)';
    };
    
    // 设置初始按钮文字
   btnEl.textContent = 'Continue >';
    
    // 添加 onclick 处理器
    btnEl.onclick = () => {
      if (currentPageInSegment < segmentPages.length - 1) {
        // 段落内翻页
        currentPageInSegment++;
        showSegment();
        
        // 更新按钮文字
        const isLastPageInSegmentNow = currentPageInSegment === segmentPages.length - 1;
        const isLastSegment = currentSegment === segments.length - 1;
   if (isLastPageInSegmentNow && isLastSegment) {
     btnEl.textContent = 'Start Adventure >';
   } else if (isLastPageInSegmentNow) {
     btnEl.textContent = 'Next >';
   } else {
     btnEl.textContent = 'Continue >';
   }
      } else {
        // 移到下一段
        currentSegment++;
        currentPageInSegment = 0;
        showSegment();
        
        // 检查是否是最后一段
        const isLastSegment = currentSegment === segments.length - 1;
      if (isLastSegment && segmentPages.length === 1) {
        btnEl.textContent = 'Start Adventure >';
      } else {
        btnEl.textContent = 'Continue >';
      }
      }
    };

    footerEl.appendChild(pageEl);
    footerEl.appendChild(btnEl);
    boxEl.appendChild(textEl);
    boxEl.appendChild(footerEl);

    containerEl.appendChild(avatarWrapEl);
    containerEl.appendChild(boxEl);
    segmentedStoryOverlay.appendChild(bgImageEl);
    segmentedStoryOverlay.appendChild(maskEl);
    segmentedStoryOverlay.appendChild(containerEl);

    document.body.appendChild(segmentedStoryOverlay);

    // 显示第一个分段
    showSegment();
  }



  // ─── updateCombatUI (replace existing method) ────────────────────────────────
  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;
    this.inventoryUI?.update(combatManager.heroes);

    const buildHeroSnapshot = (h) => ({
      ...h,
      // Expose weapon data for the UI
      weaponSlots: (h.weaponSlots || []).map(w => w ? { ...w } : null),
      equippedWeaponIndex: h.equippedWeaponIndex ?? 0,
      // Skills come from the active weapon
      skills: h.weaponSlots
        ? (h.weaponSlots[h.equippedWeaponIndex ?? 0]?.skills || [])
        : (h.skillSlots || []).filter(Boolean),
    });

    const stateSnapshot = {
      heroes:     combatManager.heroes.map(buildHeroSnapshot),
      enemies:    [...combatManager.enemies],
      phase:      combatManager.phase,
      activeUnit: combatManager.activeUnit
        ? buildHeroSnapshot(combatManager.activeUnit)
        : null,
      turnOrder: [combatManager.activeUnit, ...combatManager.turnOrder]
        .filter(Boolean)
        .map(u => ({ id: u.id, type: u.type, name: u.name })),
      logs:     [...combatManager.logs],
      diceInfo: combatManager.diceInfo,
    };

    const callbacks = {
      onStartBattle: () => {
        if (combatManager.startGame) combatManager.startGame();
        else { combatManager.phase = 'PLAYER_TURN'; }
        this.updateCombatUI(combatManager);
      },
      onSkillSelect:  (skill) => combatManager.selectSkill(skill),
      onTargetSelect: (targetId) => combatManager.executePlayerAction(targetId),
      onRollComplete: () => combatManager.applyDamage(),
      onExecuteComplete: () => combatManager.evaluateTurn(),
      onFinishCombat: () => this.onCombatResult(combatManager.phase === 'WIN' ? 'win' : 'lose'),

      // New: weapon switching from the bottom panel
      onSwitchWeapon: (heroSnapshot, weaponIndex) => {
        // Find the real hero object (not the snapshot)
        const realHero = combatManager.heroes.find(h => h.id === heroSnapshot.id);
        if (realHero) {
          combatManager.switchHeroWeapon(realHero, weaponIndex);
          this.updateCombatUI(combatManager);
        }
      },
    };

    window.renderCombatUI('react-combat-root', stateSnapshot, callbacks);
  }
}
