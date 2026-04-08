// src/ui/InventoryUI.js

export class InventoryUI {
    constructor() {
        this.sharedStorage = { weapons: [], items: [] };
        this.heroes = [];
        this.activeIndex = 0;
        this.isOpen = false;
        this.gold = 0;
        this._animFrame = null;

        // 背包按钮
        this.btn = document.createElement("button");
        this.btn.textContent = "🎒";
        this.btn.title = "Inventory (B)";
        this.btn.style.cssText = [
            "position:fixed","right:20px","top:20px",
            "width:46px","height:46px","border-radius:12px",
            "border:1px solid rgba(255,255,255,0.25)",
            "background:rgba(20,20,40,0.85)",
            "color:white","cursor:pointer","z-index:150","font-size:20px",
        ].join(";");
        document.body.appendChild(this.btn);

        // 常驻金币显示
        this.goldTag = document.createElement('div');
        this.goldTag.style.cssText = [
            'position:fixed','right:72px','top:18px','height:46px',
            'display:flex','align-items:center','padding:0 12px',
            'border-radius:12px','border:1px solid rgba(251,191,36,0.4)',
            'background:rgba(20,20,40,0.85)','color:#fbbf24',
            'font-weight:700','font-size:14px','z-index:150','pointer-events:none',
        ].join(';');
        this.goldTag.textContent = '💰 0';
        document.body.appendChild(this.goldTag);

        // 面板
        this.panel = document.createElement("div");
        this.panel.style.cssText = [
            "position:fixed","right:20px","top:80px",
            "width:820px","max-width:calc(100vw - 40px)",
            "max-height:80vh","overflow:auto","padding:20px",
            "border-radius:20px","border:0.5px solid rgba(255,255,255,0.09)",
            "background:#0f111c",
            "color:white","z-index:150","display:none",
            "box-shadow:0 24px 64px rgba(0,0,0,0.7)",
            "font-family:sans-serif",
        ].join(";");
        document.body.appendChild(this.panel);

        this.btn.addEventListener("click", () => this.toggle());
        window.addEventListener("keydown", (e) => {
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
            if (e.key === "b" || e.key === "B") this.toggle();
            if (e.key === "Escape" && this.isOpen) this.close();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.style.display = this.isOpen ? "block" : "none";
        if (this.isOpen) {
            window._gameController?.tutorial?.complete('opened_inventory');
            this.render();
        } else {
            this._stopAnim();
        }
    }

    close() {
        this.isOpen = false;
        this.panel.style.display = "none";
        this._stopAnim();
    }

    update(heroes) {
        this.heroes = Array.isArray(heroes) ? heroes : [];
        if (this.activeIndex >= this.heroes.length) this.activeIndex = 0;
        if (this.isOpen) this.render();
    }

    updateGold(amount) {
        this.gold = amount;
        if (this.goldTag) this.goldTag.textContent = `💰 ${amount}`;
        const goldEl = this.panel.querySelector('#inv-gold-display');
        if (goldEl) goldEl.textContent = `💰 Gold: ${amount}`;
    }

    // ── 立绘动画 ──────────────────────────────────────────────────
    _stopAnim() {
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    }

    _startPortraitAnim(canvas, heroId) {
        this._stopAnim();
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const configs = {
            wizard: { size: 200, offsetX: 10, offsetY: -5, frameCount: 6, isSheet: true },
            knight: { size: 260, offsetX: 0,  offsetY: -80 },
            priest: { size: 260, offsetX: 0,  offsetY: -75 },
            ranger: { size: 260, offsetX: 0,  offsetY: -80 },
        };
        const cfg = configs[heroId] || { size: 160, offsetX: 0, offsetY: 0 };

        const loop = (now) => {
            const anim = window.DataLoader?.animations?.[heroId];
            if (!anim || !anim.idle) { this._animFrame = requestAnimationFrame(loop); return; }

            ctx.clearRect(0, 0, W, H);

            const drawSize = cfg.size;
            const dx = (W - drawSize) / 2 + cfg.offsetX;
            const dy = (H - drawSize) / 2 + cfg.offsetY;

            if (cfg.isSheet) {
                const img = anim.idle;
                const fc = cfg.frameCount || 6;
                const fw = img.width / fc;
                const fi = Math.floor(now / 120) % fc;
                ctx.drawImage(img, fi * fw, 0, fw, img.height, dx, dy, drawSize, drawSize);
            } else {
                const frames = anim.idle;
                if (!frames || frames.length === 0) { this._animFrame = requestAnimationFrame(loop); return; }
                const fi = Math.floor(now / 120) % frames.length;
                ctx.drawImage(frames[fi], dx, dy, drawSize, drawSize);
            }
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    // ── 主渲染 ────────────────────────────────────────────────────
    render() {
        const heroes = this.heroes;

        if (!heroes || heroes.length === 0) {
            this.panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="font-size:16px;font-weight:500;color:#f1f5f9;">🎒 Inventory</div>
                        <div id="inv-gold-display" style="background:rgba(251,191,36,0.1);border:0.5px solid rgba(251,191,36,0.35);border-radius:8px;padding:3px 10px;color:#fbbf24;font-size:13px;">💰 Gold: ${this.gold}</div>
                    </div>
                    <button id="inv-close" style="background:transparent;border:none;color:#64748b;cursor:pointer;font-size:18px;">✕</button>
                </div>
                <div style="opacity:.5;font-size:13px;">No party info (select heroes first).</div>`;
            this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());
            return;
        }

        const hero = heroes[this.activeIndex];
        const hp = hero.hp ?? 0;
        const maxHp = hero.maxHp ?? 1;
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const hpColor = hpPct < 30 ? '#ef4444' : hpPct < 60 ? '#f97316' : '#22c55e';

        // Tab 按钮
        const tabs = heroes.map((h, i) => {
            const active = i === this.activeIndex;
            return `<button class="inv-tab" data-i="${i}" style="
                padding:5px 14px;border-radius:20px;
                border:0.5px solid ${active ? 'rgba(243,156,18,0.5)' : 'rgba(255,255,255,0.1)'};
                background:${active ? 'rgba(243,156,18,0.15)' : 'rgba(255,255,255,0.04)'};
                color:${active ? '#fbbf24' : '#64748b'};cursor:pointer;font-size:12px;">
                ${h.name ?? `Hero${i+1}`}
            </button>`;
        }).join('');

        // 武器槽
        const weaponSlotsHTML = (hero.weaponSlots ?? [null, null]).map((w, i) => `
            <div class="weapon-slot" data-slot="${i}" data-accept="weapon" style="
                padding:10px;border:0.5px dashed rgba(243,156,18,0.3);border-radius:8px;
                min-height:48px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                ${w ? `
                    <div class="equipped-weapon" data-slot="${i}" draggable="true" style="flex:1;display:flex;align-items:center;gap:8px;cursor:grab;">
                        <div style="width:32px;height:32px;border-radius:7px;background:rgba(59,130,246,0.1);border:0.5px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">⚔️</div>
                        <div>
                            <div style="font-size:12px;font-weight:500;color:#f1f5f9;">${w.name}</div>
                            <div style="font-size:10px;color:#3b82f6;">${(w.rarity ?? '').toUpperCase()}${w.owner ? ' · ' + w.owner : ''}</div>
                        </div>
                    </div>
                    <span style="font-size:10px;color:#334155;">dbl-click to unequip</span>
                ` : `<span style="opacity:.3;font-size:12px;">Weapon Slot ${i+1}: Empty</span>`}
            </div>`).join('');

        // 道具槽
        const equippedItems = (hero.equipSlots ?? []).filter(it => it != null);
        const itemSlotsHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${equippedItems.map((it, i) => `
                    <div class="equipped-item" data-slot="${i}" draggable="true" title="${it.name}" style="
                        width:52px;height:52px;border:0.5px dashed rgba(52,211,153,0.4);border-radius:8px;
                        display:flex;flex-direction:column;align-items:center;justify-content:center;
                        cursor:grab;font-size:10px;text-align:center;gap:2px;position:relative;">
                        <span style="font-size:20px;pointer-events:none;">${_getItemEmoji(it.icon)}</span>
                        <span style="opacity:.6;pointer-events:none;overflow:hidden;width:48px;white-space:nowrap;text-overflow:ellipsis;">${it.name}</span>
                    </div>`).join('')}
                <div class="item-slot" data-accept="item" style="
                    width:52px;height:52px;border:0.5px dashed rgba(52,211,153,0.2);border-radius:8px;
                    display:flex;align-items:center;justify-content:center;opacity:0.3;">
                    <span style="font-size:20px;color:#475569;">+</span>
                </div>
            </div>`;

        // 技能
        const skills = (hero.skillSlots || []).filter(s => s);
        const skillsHTML = skills.length > 0
            ? skills.map(s => `<div style="font-size:11px;color:#94a3b8;padding:3px 0;">• ${s.name}: ${s.desc}</div>`).join('')
            : `<div style="font-size:11px;color:#334155;">(No skills equipped)</div>`;

        // 存放区
        const storageWeaponsHTML = this.sharedStorage.weapons.length === 0
            ? `<div style="opacity:.3;font-size:11px;padding:4px 0;">No weapons</div>`
            : this.sharedStorage.weapons.map((w, i) => {
                const rc = _rarityColor(w.rarity);
                return `<div class="storage-item" data-stype="weapon" data-sidx="${i}" draggable="true" style="
                    padding:8px;border:0.5px solid ${rc}44;border-radius:8px;margin-bottom:6px;cursor:grab;
                    background:${rc}08;">
                    <div style="font-size:12px;font-weight:500;color:#f1f5f9;">${w.name}</div>
                    <div style="font-size:10px;color:${rc};">${(w.rarity ?? '').toUpperCase()}${w.owner ? ' · ' + w.owner : ''}</div>
                </div>`;}).join('');

        const storageItemsHTML = this.sharedStorage.items.length === 0
            ? `<div style="opacity:.3;font-size:11px;padding:4px 0;">No items</div>`
            : this.sharedStorage.items.map((it, i) => {
                const rc = _rarityColor(it.rarity);
                return `<div class="storage-item" data-stype="item" data-sidx="${i}" draggable="true" style="
                    padding:8px;border:0.5px solid ${rc}44;border-radius:8px;margin-bottom:6px;cursor:grab;
                    background:${rc}08;">
                    <div style="font-size:12px;font-weight:500;color:#f1f5f9;">${it.name}</div>
                    <div style="font-size:10px;color:${rc};">${(it.rarity ?? '').toUpperCase()}</div>
                </div>`;}).join('');

        this.panel.innerHTML = `
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:16px;font-weight:500;color:#f1f5f9;">🎒 Inventory</div>
                <div id="inv-gold-display" style="background:rgba(251,191,36,0.1);border:0.5px solid rgba(251,191,36,0.3);border-radius:8px;padding:4px 12px;color:#fbbf24;font-size:13px;">💰 Gold: ${this.gold}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                ${tabs}
                <button id="inv-close" style="width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#64748b;cursor:pointer;font-size:14px;">✕</button>
            </div>
        </div>

        <div style="height:0.5px;background:rgba(255,255,255,0.07);margin-bottom:16px;"></div>

        <div style="display:flex;gap:14px;">

            <!-- 左侧：共用存放区 -->
            <div id="shared-storage" style="width:175px;flex-shrink:0;border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;overflow-y:auto;max-height:55vh;">
                <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:10px;">STORAGE</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px;">⚔️ Weapons</div>
                <div id="storage-weapons" style="margin-bottom:14px;">${storageWeaponsHTML}</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px;">💍 Items</div>
                <div id="storage-items">${storageItemsHTML}</div>
            </div>

            <!-- 중간：立绘 + 属性 -->
            <div style="width:190px;flex-shrink:0;display:flex;flex-direction:column;gap:10px;">

                <!-- 立绘 canvas -->
                <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.07);border-radius:12px;height:155px;overflow:hidden;position:relative;">
                    <canvas id="inv-portrait-canvas" width="190" height="155" style="display:block;image-rendering:pixelated;"></canvas>
                    <div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:10px;letter-spacing:0.1em;color:#334155;">${(hero.name ?? '').toUpperCase()}</div>
                </div>

                <!-- HP -->
                <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <div style="font-size:11px;color:#64748b;">HP</div>
                        <div style="font-size:12px;font-weight:500;color:#f1f5f9;">${hp} / ${maxHp}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;">
                        <div style="background:${hpColor};height:5px;border-radius:4px;width:${hpPct}%;transition:width 0.3s;"></div>
                    </div>
                </div>

                <!-- 六维属性（与左侧面板一致） -->
                <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;">
                    <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:8px;">ATTRIBUTES</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                        ${[
                            ['STR', hero.strength],
                            ['VIT', hero.vitality],
                            ['INT', hero.intellect],
                            ['AWR', hero.awareness],
                            ['TAL', hero.talent],
                            ['AGI', hero.agility],
                        ].map(([k, v]) => `
                            <div style="display:flex;justify-content:space-between;font-size:11px;">
                                <span style="color:#64748b;">${k}</span>
                                <span style="color:#f1f5f9;font-weight:500;">${v ?? 0}</span>
                            </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 右侧：装备槽 -->
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;">

                <!-- 武器槽 -->
                <div style="border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;">
                    <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:10px;">⚔️ WEAPON SLOTS</div>
                    ${weaponSlotsHTML}
                </div>

                <!-- 道具槽 -->
                <div style="border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;">
                    <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:10px;">🧪 ITEM SLOTS</div>
                    ${itemSlotsHTML}
                </div>

                <!-- 技能 -->
                <div style="border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;">
                    <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:8px;">⚡ SKILLS</div>
                    ${skillsHTML}
                </div>

            </div>
        </div>`;

        // 启动立绘动画
        const canvas = this.panel.querySelector('#inv-portrait-canvas');
        if (canvas) this._startPortraitAnim(canvas, hero.id);

        // ── 事件绑定 ──────────────────────────────────────────────
        this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());

        this.panel.querySelectorAll(".inv-tab").forEach(b => {
            b.addEventListener("click", () => {
                this.activeIndex = Number(b.dataset.i ?? 0);
                this.render();
            });
        });

        // 存放区拖拽 + 双击装备
        this.panel.querySelectorAll(".storage-item").forEach(el => {
            el.addEventListener("dragstart", e => {
                e.dataTransfer.setData("dragFrom", "storage");
                e.dataTransfer.setData("stype", el.dataset.stype);
                e.dataTransfer.setData("sidx", el.dataset.sidx);
            });
            el.addEventListener("dblclick", () => {
                const stype = el.dataset.stype;
                const sidx = Number(el.dataset.sidx);
                if (stype === "weapon") {
                    const weapon = this.sharedStorage.weapons[sidx];
                    if (!weapon) return;
                    const emptySlot = (hero.weaponSlots ?? [null, null]).findIndex(w => w === null);
                    if (emptySlot === -1) { this._showSlotError("No empty weapon slots!"); return; }
                    this.sharedStorage.weapons.splice(sidx, 1);
                    hero.weaponSlots[emptySlot] = weapon;
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                } else {
                    const item = this.sharedStorage.items[sidx];
                    if (!item) return;
                    this.sharedStorage.items.splice(sidx, 1);
                    hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                    hero.equipSlots.push(item);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                }
                this.render();
            });
            // Tooltip
            el.addEventListener("mouseenter", e => {
                const stype = el.dataset.stype;
                const sidx = Number(el.dataset.sidx);
                const item = stype === 'weapon' ? this.sharedStorage.weapons[sidx] : this.sharedStorage.items[sidx];
                if (item) this._showTooltip(e, item);
            });
            el.addEventListener("mousemove", e => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        // 已装备武器拖拽 + 双击卸下
        this.panel.querySelectorAll(".equipped-weapon").forEach(el => {
            el.addEventListener("dragstart", e => {
                e.dataTransfer.setData("dragFrom", "equipped-weapon");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
            el.addEventListener("dblclick", () => {
                const slotIndex = Number(el.dataset.slot);
                const weapon = hero.weaponSlots?.[slotIndex];
                if (!weapon) return;
                hero.weaponSlots[slotIndex] = null;
                this.sharedStorage.weapons.push(weapon);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

        // 武器槽接受拖拽
        this.panel.querySelectorAll(".weapon-slot").forEach(slotEl => {
            slotEl.addEventListener("dragover", e => { e.preventDefault(); slotEl.style.background = "rgba(243,156,18,0.08)"; });
            slotEl.addEventListener("dragleave", () => { slotEl.style.background = "transparent"; });
            slotEl.addEventListener("drop", e => {
                e.preventDefault();
                slotEl.style.background = "transparent";
                const dragFrom = e.dataTransfer.getData("dragFrom");
                const slotIndex = Number(slotEl.dataset.slot);
                if (dragFrom === "storage") {
                    const stype = e.dataTransfer.getData("stype");
                    const sidx = Number(e.dataTransfer.getData("sidx"));
                    if (stype !== "weapon") { this._showSlotError("⚔️ Weapon slots only!"); return; }
                    const weapon = this.sharedStorage.weapons[sidx];
                    if (!weapon) return;
                    if (weapon.owner && hero.id && weapon.owner.toLowerCase() !== hero.id.toLowerCase()) {
                        this._showSlotError(`❌ ${hero.name} can't equip this!`); return;
                    }
                    const prev = hero.weaponSlots?.[slotIndex];
                    if (prev) this.sharedStorage.weapons.push(prev);
                    this.sharedStorage.weapons.splice(sidx, 1);
                    hero.weaponSlots = hero.weaponSlots ?? [null, null];
                    hero.weaponSlots[slotIndex] = weapon;
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                    this.render();
                } else if (dragFrom === "equipped-weapon") {
                    const fromSlot = Number(e.dataTransfer.getData("slotIndex"));
                    if (fromSlot === slotIndex) return;
                    const tmp = hero.weaponSlots[fromSlot];
                    hero.weaponSlots[fromSlot] = hero.weaponSlots[slotIndex];
                    hero.weaponSlots[slotIndex] = tmp;
                    this.render();
                }
            });
        });

        // 道具槽接受拖拽
        this.panel.querySelectorAll(".item-slot").forEach(slotEl => {
            slotEl.addEventListener("dragover", e => { e.preventDefault(); slotEl.style.background = "rgba(52,211,153,0.08)"; });
            slotEl.addEventListener("dragleave", () => { slotEl.style.background = "transparent"; });
            slotEl.addEventListener("drop", e => {
                e.preventDefault();
                slotEl.style.background = "transparent";
                const dragFrom = e.dataTransfer.getData("dragFrom");
                const stype = e.dataTransfer.getData("stype");
                const sidx = Number(e.dataTransfer.getData("sidx"));
                if (dragFrom !== "storage" || stype !== "item") { this._showSlotError("🧪 Item slots only!"); return; }
                const item = this.sharedStorage.items[sidx];
                if (!item) return;
                this.sharedStorage.items.splice(sidx, 1);
                hero.equipSlots = (hero.equipSlots ?? []).filter(i => i != null);
                hero.equipSlots.push(item);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

        // 已装备道具拖拽 + 双击卸下
        this.panel.querySelectorAll(".equipped-item").forEach(el => {
            el.addEventListener("dragstart", e => {
                e.dataTransfer.setData("dragFrom", "equipped-item");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
            el.addEventListener("dblclick", () => {
                const slotIndex = Number(el.dataset.slot);
                const item = hero.equipSlots?.[slotIndex];
                if (!item) return;
                hero.equipSlots.splice(slotIndex, 1);
                this.sharedStorage.items.push(item);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });
    }

    // ── 工具方法 ──────────────────────────────────────────────────
    addToStorage(item) {
        if (!item) return;
        const isWeapon = Array.isArray(item.skills) && item.skills.length > 0;
        if (isWeapon) this.sharedStorage.weapons.push(item);
        else this.sharedStorage.items.push(item);
        if (this.isOpen) this.render();
    }

    getStorage() { return this.sharedStorage; }

    _showSlotError(msg) {
        const err = document.createElement('div');
        err.textContent = msg;
        err.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(231,76,60,0.92);color:white;padding:8px 20px;border-radius:10px;font-weight:bold;z-index:9999;pointer-events:none;font-family:sans-serif;';
        document.body.appendChild(err);
        setTimeout(() => err.remove(), 1500);
    }

    _initTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'inv-tooltip';
        tooltip.style.cssText = 'position:fixed;background:rgba(10,10,25,0.95);border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 14px;color:white;font-size:12px;z-index:9999;pointer-events:none;display:none;max-width:200px;font-family:sans-serif;';
        document.body.appendChild(tooltip);
        this._tooltip = tooltip;
    }

    _showTooltip(e, item) {
        if (!this._tooltip) this._initTooltip();
        const rc = _rarityColor(item.rarity);
        this._tooltip.innerHTML = `
            <div style="font-weight:500;margin-bottom:4px;color:#f1f5f9;">${item.name}</div>
            <div style="color:${rc};font-size:10px;margin-bottom:6px;">${(item.rarity ?? 'common').toUpperCase()}</div>
            <div style="opacity:.8;line-height:1.5;">${item.desc ?? ''}</div>
            ${item.statBonus && Object.keys(item.statBonus).length > 0
                ? `<div style="margin-top:6px;opacity:.7;font-size:10px;">${Object.entries(item.statBonus).map(([k,v]) => `+${v} ${k}`).join(' | ')}</div>`
                : ''}`;
        this._tooltip.style.display = 'block';
        this._moveTooltip(e);
    }

    _moveTooltip(e) {
        if (!this._tooltip) return;
        this._tooltip.style.left = (e.clientX + 14) + 'px';
        this._tooltip.style.top = (e.clientY - 10) + 'px';
    }

    _hideTooltip() {
        if (this._tooltip) this._tooltip.style.display = 'none';
    }
}

function _rarityColor(rarity) {
    return { legendary: '#f97316', epic: '#a855f7', rare: '#3b82f6', uncommon: '#22c55e' }[rarity] ?? '#64748b';
}

function _getItemEmoji(iconType) {
    const map = {
        sword: '⚔️', shield: '🛡️', potion: '🧪', boots: '👟', clover: '🍀',
        bracelet: '📿', ring_strength: '💍', ring_intellect: '🔮',
        traveler_set: '🧭', star_cloak: '🌟', bloodthirst_mask: '😈',
    };
    return map[iconType] ?? '💎';
}