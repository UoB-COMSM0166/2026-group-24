// src/ui/InventoryUI.js

export class InventoryUI {
    constructor() {
        this.sharedStorage = { weapons: [], items: [] };
        this.heroes = [];
        this.activeIndex = 0;
        this.isOpen = false;
        this.gold = 0;
        this._animFrame = null;

        if (!document.getElementById("inventory-ui-style")) {
            const style = document.createElement("style");
            style.id = "inventory-ui-style";
            style.textContent = `
                #inventory-panel {
                    scrollbar-width: thin;
                    scrollbar-color: #d2b06b rgba(24, 18, 14, 0.9);
                }
                #inventory-panel::-webkit-scrollbar { width: 12px; }
                #inventory-panel::-webkit-scrollbar-track {
                    background: linear-gradient(180deg, rgba(28,20,14,0.96), rgba(12,16,20,0.96));
                    border-left: 1px solid rgba(232,200,134,0.12);
                }
                #inventory-panel::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #ddb86e, #94652d);
                    border: 2px solid rgba(26,18,12,0.95);
                    border-radius: 2px;
                    box-shadow: inset 0 1px 0 rgba(255,244,223,0.18);
                }
                #inventory-panel::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #efcb84, #a67232);
                }
            `;
            document.head.appendChild(style);
        }

        this.btn = document.createElement("button");
        this.btn.textContent = "🎒";
        this.btn.title = "Inventory (B)";
        this.btn.style.cssText = [
            "position:fixed","right:20px","top:20px","width:46px","height:46px",
            "border-radius:14px","border:1px solid rgba(232,200,134,0.24)",
            "background:linear-gradient(180deg, rgba(45,32,20,0.94), rgba(16,20,24,0.92))",
            "color:#f6e7c9","cursor:pointer","z-index:150","font-size:20px",
            "box-shadow:0 14px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,244,223,0.08)",
            "backdrop-filter:blur(10px)",
        ].join(";");
        document.body.appendChild(this.btn);

        this.goldTag = document.createElement('div');
        this.goldTag.style.cssText = [
            'position:fixed','right:72px','top:18px','height:46px',
            'display:flex','align-items:center','padding:0 12px',
            'border-radius:14px','border:1px solid rgba(232,200,134,0.26)',
            'background:linear-gradient(180deg, rgba(47,33,19,0.94), rgba(17,21,25,0.92))',
            'color:#f0ca74','font-weight:700','font-size:14px','z-index:150',
            'pointer-events:none','box-shadow:0 14px 28px rgba(0,0,0,0.28)',
            'backdrop-filter:blur(10px)',
        ].join(';');
        this.goldTag.textContent = '💰 0';
        document.body.appendChild(this.goldTag);

        this.panel = document.createElement("div");
        this.panel.id = "inventory-panel";
        this.panel.style.cssText = [
            "position:fixed","right:20px","top:80px","width:860px",
            "max-width:calc(100vw - 40px)","max-height:70vh","overflow:auto",
            "padding:18px","border-radius:18px",
            "border:1px solid rgba(232,200,134,0.26)",
            "background:linear-gradient(180deg, rgba(255,236,194,0.05), transparent 16%), linear-gradient(145deg, rgba(36,25,16,0.96), rgba(11,16,20,0.97))",
            "backdrop-filter:blur(12px)","color:#f5ead1","z-index:150","display:none",
            "box-shadow:0 18px 42px rgba(0,0,0,0.56), inset 0 1px 10px rgba(255,244,223,0.05)",
            "font-family:'Press Start 2P', monospace",
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

    _stopAnim() {
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    }

    _startPortraitAnim(canvas, heroId) {
        this._stopAnim();
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const configs = {
            wizard: { size: 180, offsetX: 8,  offsetY: -5,  isSheet: true, frameCount: 6 },
            knight: { size: 240, offsetX: 0,  offsetY: -70 },
            priest: { size: 240, offsetX: 0,  offsetY: -65 },
            ranger: { size: 240, offsetX: 0,  offsetY: -70 },
        };
        const cfg = configs[heroId] || { size: 140, offsetX: 0, offsetY: 0 };
        const loop = (now) => {
            const anim = window.DataLoader?.animations?.[heroId];
            if (!anim?.idle) { this._animFrame = requestAnimationFrame(loop); return; }
            ctx.clearRect(0, 0, W, H);
            const dx = (W - cfg.size) / 2 + cfg.offsetX;
            const dy = (H - cfg.size) / 2 + cfg.offsetY;
            if (cfg.isSheet) {
                const img = anim.idle;
                const fc = cfg.frameCount || 6;
                const fw = img.width / fc;
                const fi = Math.floor(now / 120) % fc;
                ctx.drawImage(img, fi * fw, 0, fw, img.height, dx, dy, cfg.size, cfg.size);
            } else {
                const frames = anim.idle;
                if (!frames?.length) { this._animFrame = requestAnimationFrame(loop); return; }
                const fi = Math.floor(now / 120) % frames.length;
                ctx.drawImage(frames[fi], dx, dy, cfg.size, cfg.size);
            }
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    update(heroes) {
        this.heroes = Array.isArray(heroes) ? heroes : [];
        if (this.activeIndex >= this.heroes.length) this.activeIndex = 0;
        if (this.isOpen) this.render();
    }

    render() {
        const heroes = this.heroes;

        if (!heroes || heroes.length === 0) {
            this.panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="font-weight:700;font-size:16px;">🎒 Inventory</div>
                        <div id="inv-gold-display" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);border-radius:8px;padding:3px 10px;color:#fbbf24;font-size:13px;font-weight:700;">💰 Gold: ${this.gold}</div>
                    </div>
                    <button id="inv-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button>
                </div>
                <div style="opacity:.75;">No party info (select heroes first).</div>`;
            this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());
            return;
        }

        const hero = heroes[this.activeIndex];
        const hp = hero.hp ?? 0;
        const maxHp = hero.maxHp ?? hero.hp ?? 1;
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const hpColor = hpPct < 30 ? '#ef4444' : hpPct < 60 ? '#f97316' : '#22c55e';

        const tabs = heroes.map((h, i) => {
            const active = i === this.activeIndex;
            return `<button class="inv-tab" data-i="${i}" style="
                margin-right:6px;padding:8px 14px;border-radius:999px;
                border:1px solid ${active ? 'rgba(232,200,134,0.36)' : 'rgba(232,200,134,0.14)'};
                background:${active ? 'linear-gradient(180deg, rgba(98,67,29,0.62), rgba(43,28,15,0.72))' : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'};
                color:${active ? '#fff2d3' : '#dbcdb2'};cursor:pointer;
                box-shadow:${active ? '0 10px 18px rgba(0,0,0,0.24)' : 'none'};font-weight:700;">
                ${h.name ?? `Hero${i + 1}`}
            </button>`;
        }).join("");

        // 武器槽
        const weaponSlotsHTML = `
            <div style="padding:12px;border:1px solid rgba(232,200,134,0.14);border-radius:14px;margin-bottom:12px;background:linear-gradient(180deg, rgba(255,236,194,0.05), rgba(255,255,255,0.01));">
                <div style="font-weight:700;margin-bottom:8px;">⚔️ Weapon Slots</div>
                ${(hero.weaponSlots ?? [null, null]).map((w, i) => `
                    <div class="weapon-slot" data-slot="${i}" data-accept="weapon"
                        style="padding:10px;border:1px dashed rgba(232,200,134,0.34);border-radius:12px;min-height:52px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);">
                        ${w ? `
                            <div class="equipped-weapon" data-slot="${i}" draggable="true"
                                title="${w.name} (double-click to unequip)"
                                style="flex:1;display:flex;align-items:center;gap:8px;cursor:grab;padding:6px 8px;border-radius:10px;background:linear-gradient(180deg, rgba(116,78,31,0.22), rgba(35,24,14,0.18));border:1px solid rgba(232,200,134,0.1);">
                                <canvas class="item-icon" data-icon="sword" width="32" height="32" style="pointer-events:none;"></canvas>
                                <div style="pointer-events:none;">
                                    <div style="font-weight:700;font-size:13px;">${w.name}</div>
                                    <div style="opacity:.6;font-size:11px;">${w.rarity ?? ''} — double-click to unequip</div>
                                </div>
                            </div>`
                        : `<span style="opacity:.4;font-size:13px;">⚔️ Weapon Slot ${i + 1}: Empty</span>`}
                    </div>`).join('')}
            </div>`;

        // 道具槽
        const equippedItems = (hero.equipSlots ?? []).filter(it => it != null);
        const itemSlotsHTML = `
            <div style="padding:12px;border:1px solid rgba(232,200,134,0.14);border-radius:14px;margin-bottom:12px;background:linear-gradient(180deg, rgba(255,236,194,0.05), rgba(255,255,255,0.01));">
                <div style="font-weight:700;margin-bottom:8px;">🧪 Item Slots</div>
                ${equippedItems.length === 0
                    ? `<div class="item-slot" data-accept="item"
                        style="padding:10px;border:1px dashed rgba(111,201,168,0.42);border-radius:12px;min-height:50px;display:flex;align-items:center;justify-content:center;opacity:.55;background:rgba(255,255,255,0.02);">
                        Drag item here to equip</div>`
                    : `<div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${equippedItems.map((it, i) => `
                            <div class="equipped-item" data-slot="${i}" draggable="true" title="${it.name}"
                                style="width:52px;height:52px;border:1px solid rgba(111,201,168,0.28);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:grab;font-size:10px;text-align:center;gap:2px;background:linear-gradient(180deg, rgba(73,128,110,0.18), rgba(25,34,31,0.24));">
                                <span style="font-size:20px;pointer-events:none;">${_getItemEmoji(it.icon)}</span>
                                <span style="opacity:.7;pointer-events:none;overflow:hidden;width:44px;white-space:nowrap;text-overflow:ellipsis;">${it.name}</span>
                            </div>`).join('')}
                    </div>`}
                <div class="item-slot" data-accept="item"
                    style="padding:10px;border:1px dashed rgba(111,201,168,0.34);border-radius:12px;min-height:50px;display:flex;align-items:center;justify-content:center;opacity:.55;margin-top:6px;background:rgba(255,255,255,0.02);">
                    + Drag item here
                </div>
            </div>`;

        // 存放区
        const storageWeaponsHTML = this.sharedStorage.weapons.length === 0
            ? `<div style="opacity:.4;font-size:12px;">No weapons</div>`
            : this.sharedStorage.weapons.map((w, i) => `
                <div class="storage-item" data-stype="weapon" data-sidx="${i}" draggable="true"
                    style="padding:10px;border:1px solid rgba(232,200,134,0.28);border-radius:10px;margin-bottom:8px;cursor:grab;font-size:13px;background:linear-gradient(180deg, rgba(114,77,31,0.24), rgba(39,28,18,0.22));">
                    <div style="font-weight:700;">${w.name}</div>
                    <div style="opacity:.6;font-size:11px;">${w.rarity ?? ''}${w.owner ? ' · ' + w.owner : ''}</div>
                </div>`).join('');

        const storageItemsHTML = this.sharedStorage.items.length === 0
            ? `<div style="opacity:.4;font-size:12px;">No items</div>`
            : this.sharedStorage.items.map((it, i) => `
                <div class="storage-item" data-stype="item" data-sidx="${i}" draggable="true"
                    style="padding:10px;border:1px solid rgba(111,201,168,0.24);border-radius:10px;margin-bottom:8px;cursor:grab;font-size:13px;background:linear-gradient(180deg, rgba(63,113,97,0.2), rgba(28,35,33,0.24));">
                    <div style="font-weight:700;">${it.name}</div>
                    <div style="opacity:.6;font-size:11px;">${it.rarity ?? ''}</div>
                </div>`).join('');

        this.panel.innerHTML = `
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(232,200,134,0.16);">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="font-weight:700;font-size:16px;">🎒 Inventory</div>
                    <div id="inv-gold-display" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);border-radius:8px;padding:3px 10px;color:#fbbf24;font-size:13px;font-weight:700;">💰 Gold: ${this.gold}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${tabs}
                    <button id="inv-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;font-size:18px;">✕</button>
                </div>
            </div>

            <!-- 三列主体 -->
            <div style="display:flex;gap:12px;">

                <!-- 左列：存放区 -->
                <div id="shared-storage" style="width:200px;flex-shrink:0;border:1px solid rgba(232,200,134,0.16);border-radius:16px;padding:12px;background:linear-gradient(180deg, rgba(90,61,28,0.18), rgba(255,255,255,0.01));overflow-y:auto;max-height:60vh;">
                    <div style="font-weight:700;margin-bottom:8px;">⚔️ Weapons</div>
                    <div id="storage-weapons" style="min-height:40px;margin-bottom:14px;">${storageWeaponsHTML}</div>
                    <div style="font-weight:700;margin-bottom:8px;">🧪 Items</div>
                    <div id="storage-items" style="min-height:40px;">${storageItemsHTML}</div>
                </div>

                <!-- 中列：立绘 + 属性 -->
                <div style="width:200px;flex-shrink:0;display:flex;flex-direction:column;gap:10px;">

                    <!-- 立绘 -->
                    <div style="border:1px solid rgba(232,200,134,0.14);border-radius:14px;overflow:hidden;background:rgba(0,0,0,0.22);position:relative;">
                        <canvas id="inv-portrait-canvas" width="200" height="180" style="display:block;image-rendering:pixelated;"></canvas>
                        <div style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:0.1em;color:rgba(232,200,134,0.45);">${(hero.name ?? '').toUpperCase()}</div>
                    </div>

                    <!-- HP -->
                    <div style="padding:12px;border:1px solid rgba(232,200,134,0.14);border-radius:14px;background:linear-gradient(180deg, rgba(255,236,194,0.05), rgba(255,255,255,0.01));">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                            <span style="font-size:12px;opacity:.7;">HP</span>
                            <span style="font-size:12px;font-weight:700;">${hp} / ${maxHp}</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px;">
                            <div style="background:${hpColor};height:6px;border-radius:4px;width:${hpPct}%;transition:width 0.3s;"></div>
                        </div>
                    </div>

                    <!-- 六维属性 -->
                    <div style="padding:12px;border:1px solid rgba(232,200,134,0.14);border-radius:14px;background:linear-gradient(180deg, rgba(255,236,194,0.05), rgba(255,255,255,0.01));">
                        <div style="font-weight:700;margin-bottom:10px;color:#f0ca74;font-size:12px;letter-spacing:0.05em;">ATTRIBUTES</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px;">
                            ${[
                                ['STR', hero.strength],
                                ['VIT', hero.vitality],
                                ['INT', hero.intellect],
                                ['AWR', hero.awareness],
                                ['TAL', hero.talent],
                                ['AGI', hero.agility],
                            ].map(([k, v]) => `
                                <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(232,200,134,0.07);">
                                    <span style="opacity:.65;">${k}</span>
                                    <span style="font-weight:700;color:#f5ead1;">${v ?? 0}</span>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- 右列：装备槽 -->
                <div style="flex:1;min-width:0;">
                    ${weaponSlotsHTML}
                    ${itemSlotsHTML}
                </div>

            </div>`;

        // 启动立绘动画
        const portraitCanvas = this.panel.querySelector('#inv-portrait-canvas');
        if (portraitCanvas) this._startPortraitAnim(portraitCanvas, hero.id);

        // 关闭
        this.panel.querySelector("#inv-close")?.addEventListener("click", () => this.close());

        // Tab 切换
        this.panel.querySelectorAll(".inv-tab").forEach((b) => {
            b.addEventListener("click", () => {
                this.activeIndex = Number(b.getAttribute("data-i") ?? 0);
                this.render();
            });
        });

        // 存放区拖拽 + 双击装备
        this.panel.querySelectorAll(".storage-item").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
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
            el.addEventListener("mouseenter", (e) => {
                const stype = el.dataset.stype;
                const sidx = Number(el.dataset.sidx);
                const item = stype === 'weapon' ? this.sharedStorage.weapons[sidx] : this.sharedStorage.items[sidx];
                if (item) this._showTooltip(e, item);
            });
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        // 已装备武器拖拽 + 双击卸下
        this.panel.querySelectorAll(".equipped-weapon").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("dragFrom", "equipped-weapon");
                e.dataTransfer.setData("slotIndex", el.dataset.slot);
            });
            el.addEventListener("dblclick", () => {
                const slotIndex = Number(el.dataset.slot);
                const weapon = hero.weaponSlots?.[slotIndex];
                if (!weapon) return;
                const equippedWeapons = (hero.weaponSlots || []).filter(Boolean);
                if (equippedWeapons.length <= 1) { this._showSlotError("Must equip at least one weapon!"); return; }
                hero.weaponSlots[slotIndex] = null;
                this.sharedStorage.weapons.push(weapon);
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
            el.addEventListener("mouseenter", (e) => {
                const w = hero.weaponSlots?.[Number(el.dataset.slot)];
                if (w) this._showTooltip(e, w);
            });
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        // 已装备道具拖拽 + 双击卸下
        this.panel.querySelectorAll(".equipped-item").forEach((el) => {
            el.addEventListener("dragstart", (e) => {
                e.stopPropagation();
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
            el.addEventListener("mouseenter", (e) => {
                const it = hero.equipSlots?.[Number(el.dataset.slot)];
                if (it) this._showTooltip(e, it);
            });
            el.addEventListener("mousemove", (e) => this._moveTooltip(e));
            el.addEventListener("mouseleave", () => this._hideTooltip());
        });

        // 武器槽接受拖拽
        this.panel.querySelectorAll(".weapon-slot").forEach((slotEl) => {
            slotEl.addEventListener("dragover", (e) => { e.preventDefault(); slotEl.style.background = "rgba(243,156,18,0.12)"; });
            slotEl.addEventListener("dragleave", () => { slotEl.style.background = "transparent"; });
            slotEl.addEventListener("drop", (e) => {
                e.preventDefault();
                slotEl.style.background = "transparent";
                const dragFrom = e.dataTransfer.getData("dragFrom");
                const stype = e.dataTransfer.getData("stype");
                const sidx = Number(e.dataTransfer.getData("sidx"));
                const slotIndex = Number(slotEl.dataset.slot);
                if (dragFrom !== "storage" || stype !== "weapon") { this._showSlotError("⚔️ Weapon slots only!"); return; }
                const weapon = this.sharedStorage.weapons[sidx];
                if (!weapon) return;
                const prev = hero.weaponSlots?.[slotIndex];
                if (prev) this.sharedStorage.weapons.push(prev);
                this.sharedStorage.weapons.splice(sidx, 1);
                hero.weaponSlots = hero.weaponSlots ?? [null, null];
                hero.weaponSlots[slotIndex] = weapon;
                if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                this.render();
            });
        });

        // 道具槽接受拖拽
        this.panel.querySelectorAll(".item-slot").forEach((slotEl) => {
            slotEl.addEventListener("dragover", (e) => { e.preventDefault(); slotEl.style.background = "rgba(52,211,153,0.12)"; });
            slotEl.addEventListener("dragleave", () => { slotEl.style.background = "transparent"; });
            slotEl.addEventListener("drop", (e) => {
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

        // 图标渲染
        this.panel.querySelectorAll(".item-icon").forEach((cvs) => { drawItemIconMini(cvs, cvs.dataset.icon); });

        // 左侧存放区接受从右侧拖回
        const sharedStorageEl = this.panel.querySelector("#shared-storage");
        if (sharedStorageEl) {
            sharedStorageEl.addEventListener("dragover", (e) => { e.preventDefault(); sharedStorageEl.style.background = "rgba(255,255,255,0.05)"; });
            sharedStorageEl.addEventListener("dragleave", () => { sharedStorageEl.style.background = "transparent"; });
            sharedStorageEl.addEventListener("drop", (e) => {
                e.preventDefault();
                sharedStorageEl.style.background = "transparent";
                const dragFrom = e.dataTransfer.getData("dragFrom");
                const slotIndex = Number(e.dataTransfer.getData("slotIndex"));
                if (dragFrom === "equipped-weapon") {
                    const weapon = hero.weaponSlots?.[slotIndex];
                    if (!weapon) return;
                    const equippedWeapons = (hero.weaponSlots || []).filter(Boolean);
                    if (equippedWeapons.length <= 1) { this._showSlotError("Must equip at least one weapon!"); return; }
                    hero.weaponSlots[slotIndex] = null;
                    this.sharedStorage.weapons.push(weapon);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                    this.render();
                } else if (dragFrom === "equipped-item") {
                    const item = hero.equipSlots?.[slotIndex];
                    if (!item) return;
                    hero.equipSlots.splice(slotIndex, 1);
                    this.sharedStorage.items.push(item);
                    if (typeof hero.refreshDerivedStats === "function") hero.refreshDerivedStats();
                    this.render();
                }
            });
        }
    }

    _showSlotError(msg) {
        const err = document.createElement('div');
        err.textContent = msg;
        err.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(231,76,60,0.92);color:white;padding:8px 20px;border-radius:10px;font-weight:bold;z-index:9999;pointer-events:none;font-family:\'Press Start 2P\',monospace;';
        document.body.appendChild(err);
        setTimeout(() => err.remove(), 1500);
    }

    _initTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'inv-tooltip';
        tooltip.style.cssText = 'position:fixed;background:rgba(10,10,25,0.95);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:10px 14px;color:white;font-size:12px;z-index:9999;pointer-events:none;display:none;max-width:200px;font-family:\'Press Start 2P\',monospace;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
        document.body.appendChild(tooltip);
        this._tooltip = tooltip;
    }

    _showTooltip(e, item) {
        if (!this._tooltip) this._initTooltip();
        const rarityColors = { rare: '#3b82f6', epic: '#a855f7', uncommon: '#22c55e', legendary: '#ef4444' };
        const color = rarityColors[item.rarity] ?? '#aaa';
        this._tooltip.innerHTML = `
            <div style="font-weight:700;margin-bottom:4px;">${item.name}</div>
            <div style="color:${color};font-size:11px;margin-bottom:6px;">${item.rarity ?? 'common'}</div>
            <div style="opacity:.8;line-height:1.4;">${item.desc ?? ''}</div>
            ${item.statBonus && Object.keys(item.statBonus).length > 0
                ? `<div style="margin-top:6px;opacity:.7;font-size:11px;">${Object.entries(item.statBonus).map(([k,v]) => `+${v} ${k}`).join(' | ')}</div>`
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

    addToStorage(item) {
        if (!item) return;
        const isWeapon = Array.isArray(item.skills) && item.skills.length > 0;
        if (isWeapon) this.sharedStorage.weapons.push(item);
        else this.sharedStorage.items.push(item);
        if (this.isOpen) this.render();
    }

    getStorage() { return this.sharedStorage; }

    updateGold(amount) {
        this.gold = amount;
        if (this.goldTag) this.goldTag.textContent = `💰 ${amount}`;
        const goldEl = this.panel.querySelector('#inv-gold-display');
        if (goldEl) goldEl.textContent = `💰 Gold: ${amount}`;
    }
}

function _getItemEmoji(iconType) {
    switch(iconType) {
        case 'sword':   return '⚔️';
        case 'shield':  return '🛡️';
        case 'potion':  return '🧪';
        case 'boots':   return '👟';
        case 'clover':  return '🍀';
        case 'bracelet':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('🔮')">`;
        case 'ring_strength':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('💪')">`;
        case 'ring_intellect':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('🔵')">`;
        case 'traveler_set':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('🧭')">`;
        case 'star_cloak':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('🌟')">`;
        case 'bloodthirst_mask':
            return `<img src="./resource/img/items/daifu.png" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.replaceWith('🩸')">`;
        default: return '📦';
    }
}

function drawItemIconMini(canvas, iconType) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);
    ctx.save();
    ctx.translate(16, 16);
    ctx.scale(0.6, 0.6);
    switch (iconType) {
        case 'sword':
            ctx.strokeStyle = "#ddd"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 10); ctx.stroke();
            break;
        case 'shield':
            ctx.fillStyle = "#4a90e2";
            ctx.beginPath();
            ctx.moveTo(0, -15); ctx.lineTo(10, -10); ctx.lineTo(10, 5);
            ctx.lineTo(0, 15); ctx.lineTo(-10, 5); ctx.lineTo(-10, -10);
            ctx.closePath(); ctx.fill();
            break;
        case 'bracelet': case 'ring_strength': case 'ring_intellect':
        case 'traveler_set': case 'star_cloak': case 'bloodthirst_mask': {
            const img = window.DataLoader?.getImage(iconType);
            if (img) { ctx.drawImage(img, -16, -16, 32, 32); }
            else {
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
            }
            break;
        }
        default:
            ctx.fillStyle = "#aaa";
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}