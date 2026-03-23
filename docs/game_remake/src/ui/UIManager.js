// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';
import { ChestAnimation } from './ChestAnimation.js';
import { InventoryUI } from './InventoryUI.js';

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
    };
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
    this.inventoryUI = new InventoryUI();
    this.animFrameReq = null;
  }

  _drawHeroPreview(ctx, heroId, width, height, time) {
    const anim = DataLoader.animations[heroId];
    if (!anim || !anim.idle) return;

    ctx.clearRect(0, 0, width, height);

    // --- 在这里定义每个英雄的微调参数 ---
    const configs = {
        'wizard': { size: 220, offsetX: 20, offsetY: -10, frameCount: 6 },
        'knight': { size: 280, offsetX: 12, offsetY: -95 },
        'priest': { size: 280, offsetX: 12, offsetY: -90 },
        'ranger': { size: 280, offsetX: 12, offsetY: -95 },
        'default': { size: 150, offsetX: 0, offsetY: 0 }
    };

    const cfg = configs[heroId] || configs['default'];
    const drawSize = cfg.size;
    // 居中计算公式：(画布宽度 - 绘制宽度) / 2 + 偏移量
    const dx = (width - drawSize) / 2 + cfg.offsetX;
    const dy = (height - drawSize) / 2 + cfg.offsetY;

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
    heroSlots.innerHTML = '';
    const selected = [];
    let selectedDifficulty = 'normal';

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
        charSelectedInfo.innerText = `已选择 ${selected.length}/2 位英雄`;
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
      cancelAnimationFrame(this.animFrameReq);
      onConfirm([...selected], selectedDifficulty);
    };
  

    charConfirmBtn.onclick = () => onConfirm([...selected], selectedDifficulty);
  }

  hideCharacterSelect() { 
    this.els.charSelectScreen.style.display = 'none'; 
    if(this.animFrameReq) cancelAnimationFrame(this.animFrameReq);
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
    if (desc) desc.textContent = '在十回合内击败boss否则结束游戏';
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
  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;
    this.inventoryUI?.update(combatManager.heroes);
    const stateSnapshot = {
      heroes: combatManager.heroes.map(h => ({ ...h, skills: h.skillSlots ? h.skillSlots.filter(s => s) : h.skills })),
      enemies: [...combatManager.enemies],
      phase: combatManager.phase,
      activeUnit: combatManager.activeUnit ? { ...combatManager.activeUnit, skills: combatManager.activeUnit.skillSlots ? combatManager.activeUnit.skillSlots.filter(s => s) : combatManager.activeUnit.skills } : null,
      turnOrder: [combatManager.activeUnit, ...combatManager.turnOrder].filter(Boolean),
      logs: [...combatManager.logs],
      diceInfo: combatManager.diceInfo
    };
    const callbacks = {
      onStartBattle: () => { if(combatManager.startGame) combatManager.startGame(); else combatManager.phase = 'PLAYER_TURN'; this.updateCombatUI(combatManager); },
      onSkillSelect: (skill) => combatManager.selectSkill(skill),
      onTargetSelect: (targetId) => combatManager.executePlayerAction(targetId),
      onRollComplete: () => combatManager.applyDamage(),
      onExecuteComplete: () => combatManager.evaluateTurn(),
      onFinishCombat: () => this.onCombatResult(combatManager.phase === 'WIN' ? 'win' : 'lose')
    };
    window.renderCombatUI('react-combat-root', stateSnapshot, callbacks);
  }
  onCombatResult(result) { this.hideCombatOverlay(); this.onCombatEnd(result); }
  showEvent(title, desc, buttons = []) {
    const { eventUI, eventTitle, eventDesc, eventButtons } = this.els;
    if (!eventUI) return;
    eventUI.style.display = 'flex';
    eventTitle.innerText = title;
    eventDesc.innerText = desc;
    eventButtons.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerText = btn.text;
      button.style.cssText = "background: #e67e22; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;";
      button.onclick = () => { eventUI.style.display = 'none'; if (btn.onClick) btn.onClick(); };
      eventButtons.appendChild(button);
    });
  }
  showLootAssign(item, heroes, onPick) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:220;display:flex;align-items:center;justify-content:center;font-family:sans-serif;backdrop-filter:blur(4px);";

    const rarityColor = {
      common: '#9ca3af',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#c084fc',
      legendary: '#fbbf24',
    }[item?.rarity ?? 'common'] ?? '#9ca3af';

    const equipBtns = (heroes ?? []).map((h, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:8px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${h.name ?? `Hero${i + 1}`}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">HP ${h.hp ?? 0} / ${h.maxHp ?? 0}</div>
        </div>
        <button class="loot-equip" data-i="${i}" style="padding:7px 14px;border-radius:8px;border:1px solid rgba(74,222,128,0.4);background:rgba(74,222,128,0.12);color:#4ade80;font-size:12px;cursor:pointer;">
          ⚔️ 立即装备
        </button>
      </div>
    `).join("");

    const card = document.createElement("div");
    card.style.cssText = "width:500px;max-width:92vw;background:rgba(10,10,25,0.97);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px;color:white;box-shadow:0 20px 60px rgba(0,0,0,0.8);";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-weight:700;font-size:16px;">🎁 获得物品</div>
        <button id="loot-close" style="background:transparent;border:none;color:#6b7280;cursor:pointer;font-size:18px;">✕</button>
      </div>
      <div style="padding:14px;border:1px solid ${rarityColor}44;border-radius:12px;background:${rarityColor}11;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:28px;">${{ sword:'⚔️', shield:'🛡️', potion:'🧪', boots:'👟', clover:'🍀' }[item?.icon] ?? '📦'}</div>
          <div>
            <div style="font-weight:700;font-size:15px;">${item?.name ?? 'Item'}</div>
            <div style="font-size:12px;color:${rarityColor};margin-top:2px;text-transform:uppercase;letter-spacing:0.05em;">${item?.rarity ?? 'common'}</div>
          </div>
        </div>
        <div style="font-size:12px;color:#9ca3af;line-height:1.5;">${item?.desc ?? ''}</div>
        ${item?.statBonus && Object.keys(item.statBonus).length > 0
        ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">
              ${Object.entries(item.statBonus).map(([k,v]) => `
                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(251,191,36,0.15);color:#fbbf24;">+${v} ${k}</span>
              `).join('')}
            </div>`
        : ''
    }
      </div>
      <div style="display:flex;gap:12px;align-items:stretch;">
        <div style="flex:1;">${equipBtns || `<div style="opacity:.75;">No heroes available</div>`}</div>
        <button id="loot-put" style="width:120px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#d1d5db;font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
          <span style="font-size:28px;">📦</span>
          <span>存入背包</span>
        </button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    card.querySelector("#loot-close")?.addEventListener("click", () => overlay.remove());
    card.querySelector("#loot-put")?.addEventListener("click", () => { onPick?.({ heroIndex: 0, action: "put" }); overlay.remove(); });
    card.querySelectorAll(".loot-equip").forEach(btn => btn.addEventListener("click", () => { onPick?.({ heroIndex: Number(btn.dataset.i), action: "equip" }); overlay.remove(); }));
  }

  showStoryScreen(title, text, onNext) {
    this.els.storyTitle.textContent = title;
    this.els.storyText.textContent = text;
    this.els.storyScreen.style.display = 'flex';
    this.els.storyNextBtn.onclick = () => {
      this.els.storyScreen.style.display = 'none';
      onNext?.();
    };
  }

  hideStoryScreen() {
    this.els.storyScreen.style.display = 'none';
  }
  showChestReward(item, onClose) { ChestAnimation.play(item, onClose ?? (() => {})); }
  // src/ui/UIManager.js  — PATCH: updated updateCombatUI method
  // Replace the existing updateCombatUI method in your UIManager with this version.
  // Everything else in UIManager stays the same.

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
