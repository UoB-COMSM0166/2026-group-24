// src/ui/ShopUI.js
// ══════════════════════════════════════════════════════════════════════
// 精美商店 UI 组件
// 用法：ShopUI.show(shopName, inventory, gold, onBuy, onLeave)
// ══════════════════════════════════════════════════════════════════════

const RARITY_STYLE = {
  legendary: { color: '#f97316', glow: 'rgba(249,115,22,0.35)', label: 'LEGENDARY', bg: 'rgba(249,115,22,0.08)' },
  epic:      { color: '#a855f7', glow: 'rgba(168,85,247,0.35)', label: 'EPIC',      bg: 'rgba(168,85,247,0.08)' },
  rare:      { color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', label: 'RARE',      bg: 'rgba(59,130,246,0.08)' },
  uncommon:  { color: '#22c55e', glow: 'rgba(34,197,94,0.35)',  label: 'UNCOMMON',  bg: 'rgba(34,197,94,0.08)'  },
  common:    { color: '#94a3b8', glow: 'rgba(148,163,184,0.2)', label: 'COMMON',    bg: 'rgba(148,163,184,0.05)' },
};

function getRarity(item) {
  return RARITY_STYLE[item?.rarity] ?? RARITY_STYLE.common;
}

function getItemIcon(item) {
  // 武器判断：有 skills 数组
  const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;
  const icons = {
    sword: '⚔️', shield: '🛡️', potion: '🧪', boots: '👟',
    clover: '🍀', bracelet: '📿', ring_strength: '💍',
    ring_intellect: '🔮', traveler_set: '🧭', star_cloak: '🌟',
    bloodthirst_mask: '😈',
  };
  if (item?.icon && icons[item.icon]) return icons[item.icon];
  return isWeapon ? '⚔️' : '💍';
}

function buildItemCard(item, index, gold, purchased) {
  const r = getRarity(item);
  const icon = getItemIcon(item);
  const canAfford = gold >= item._shopPrice;
  const isBought = purchased.has(index);
  const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;

  const statBonusHTML = item.statBonus && Object.keys(item.statBonus).length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
        ${Object.entries(item.statBonus).map(([k,v]) =>
          `<span style="background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 6px;font-size:10px;color:#94a3b8;">+${v} ${k.toUpperCase()}</span>`
        ).join('')}
       </div>`
    : '';

  const skillsHTML = isWeapon && item.skills?.length
    ? `<div style="margin-top:6px;font-size:10px;color:#94a3b8;">
        Skills: ${item.skills.map(s => s.name ?? s).join(', ')}
       </div>`
    : '';

  const ownerTag = item.owner
    ? `<span style="font-size:10px;padding:1px 7px;border-radius:4px;background:rgba(255,255,255,0.07);color:#94a3b8;">${item.owner}</span>`
    : '';

  return `
    <div class="shop-item-card" data-index="${index}" style="
      position:relative;
      background:${isBought ? 'rgba(255,255,255,0.02)' : r.bg};
      border:1px solid ${isBought ? 'rgba(255,255,255,0.06)' : r.color + '55'};
      border-radius:14px;
      padding:16px;
      display:flex;
      flex-direction:column;
      gap:8px;
      transition:all 0.2s;
      opacity:${isBought ? '0.45' : '1'};
      ${isBought ? '' : `box-shadow:0 0 0 0 ${r.glow};`}
    ">
      ${isBought ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(0,0,0,0.35);font-size:13px;color:#94a3b8;font-style:italic;z-index:2;">Sold</div>` : ''}

      <!-- Header: icon + name + rarity -->
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="
          width:48px;height:48px;flex-shrink:0;
          border-radius:12px;
          background:rgba(255,255,255,0.05);
          border:1px solid ${r.color}44;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
        ">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${r.color};text-transform:uppercase;">${r.label}</span>
            ${ownerTag}
          </div>
        </div>
      </div>

      <!-- Desc -->
      ${item.desc ? `<div style="font-size:11px;color:#64748b;line-height:1.5;">${item.desc}</div>` : ''}

      ${statBonusHTML}
      ${skillsHTML}

      <!-- Footer: price + buy button -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:15px;font-weight:800;color:#fbbf24;">💰 ${item._shopPrice}</div>
        ${isBought
          ? ''
          : `<button class="shop-buy-btn" data-index="${index}" style="
              padding:7px 18px;
              border-radius:8px;
              border:1px solid ${canAfford ? r.color + 'aa' : 'rgba(255,255,255,0.1)'};
              background:${canAfford ? r.color + '22' : 'rgba(255,255,255,0.04)'};
              color:${canAfford ? r.color : '#475569'};
              font-size:12px;
              font-weight:700;
              cursor:${canAfford ? 'pointer' : 'not-allowed'};
              transition:all 0.15s;
              letter-spacing:0.04em;
            " ${canAfford ? '' : 'disabled'}>
              ${canAfford ? 'BUY' : 'Too poor'}
            </button>`
        }
      </div>
    </div>
  `;
}

export class ShopUI {
  /**
   * @param {string} shopName
   * @param {Array}  inventory   - rollShopInventory() 结果
   * @param {number} gold        - 当前金币
   * @param {Function} onBuy    - (item, index) => void  购买回调
   * @param {Function} onLeave  - () => void             离开回调
   */
  static show(shopName, inventory, gold, onBuy, onLeave) {
    // 清理已有弹窗
    document.getElementById('shop-overlay')?.remove();

    const purchased = new Set();

    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:300;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(0,0,0,0.72);
      backdrop-filter:blur(6px);
      animation:shopFadeIn 0.2s ease;
      font-family:'Segoe UI', system-ui, sans-serif;
    `;

    const rebuildPanel = (currentGold) => {
      panel.innerHTML = buildShopHTML(shopName, inventory, currentGold, purchased);
      attachEvents(currentGold);
    };

    const buildShopHTML = (name, inv, currentGold, purchased) => `
      <style>
        @keyframes shopFadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes shopSlideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .shop-item-card:not([style*="opacity:0"]):hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
        .shop-buy-btn:not(:disabled):hover { filter:brightness(1.2); transform:scale(1.05); }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Welcome to</div>
          <div style="font-size:22px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em;">🛒 ${name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="
            background:rgba(251,191,36,0.12);
            border:1px solid rgba(251,191,36,0.35);
            border-radius:10px;
            padding:8px 16px;
            font-size:16px;font-weight:800;color:#fbbf24;
          ">💰 ${currentGold}</div>
          <button id="shop-close-btn" style="
            width:36px;height:36px;border-radius:10px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.06);
            color:#94a3b8;font-size:18px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            transition:all 0.15s;
          ">✕</button>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);margin-bottom:20px;"></div>

      <!-- Item grid -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;animation:shopSlideIn 0.25s ease 0.05s both;">
        ${inv.map((item, i) => buildItemCard(item, i, currentGold, purchased)).join('')}
      </div>

      <!-- Footer -->
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:11px;color:#475569;">Items are one-time purchase only</div>
        <button id="shop-leave-btn" style="
          padding:9px 28px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.06);
          color:#94a3b8;
          font-size:13px;font-weight:600;
          cursor:pointer;
          transition:all 0.15s;
          letter-spacing:0.04em;
        ">Leave Shop</button>
      </div>
    `;

    const attachEvents = (currentGold) => {
      panel.querySelector('#shop-close-btn')?.addEventListener('click', closeShop);
      panel.querySelector('#shop-leave-btn')?.addEventListener('click', closeShop);

      panel.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          const item = inventory[idx];
          if (!item || purchased.has(idx)) return;
          if ((currentGold) < item._shopPrice) return;

          purchased.add(idx);
          const newGold = onBuy(item, idx); // 回调返回新金币数
          rebuildPanel(typeof newGold === 'number' ? newGold : currentGold - item._shopPrice);
        });
      });

      // Hover effects
      panel.querySelector('#shop-leave-btn')?.addEventListener('mouseenter', e => { e.target.style.color = '#f1f5f9'; e.target.style.background = 'rgba(255,255,255,0.1)'; });
      panel.querySelector('#shop-leave-btn')?.addEventListener('mouseleave', e => { e.target.style.color = '#94a3b8'; e.target.style.background = 'rgba(255,255,255,0.06)'; });
      panel.querySelector('#shop-close-btn')?.addEventListener('mouseenter', e => { e.target.style.color = '#f1f5f9'; e.target.style.background = 'rgba(255,255,255,0.1)'; });
      panel.querySelector('#shop-close-btn')?.addEventListener('mouseleave', e => { e.target.style.color = '#94a3b8'; e.target.style.background = 'rgba(255,255,255,0.06)'; });
    };

    const closeShop = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s';
      setTimeout(() => { overlay.remove(); onLeave?.(); }, 150);
    };

    // Click outside to close
    overlay.addEventListener('click', e => { if (e.target === overlay) closeShop(); });

    const panel = document.createElement('div');
    panel.style.cssText = `
      width:680px;
      max-width:calc(100vw - 40px);
      max-height:88vh;
      overflow-y:auto;
      background:linear-gradient(160deg, rgba(15,17,28,0.98) 0%, rgba(8,10,20,0.99) 100%);
      border:1px solid rgba(255,255,255,0.09);
      border-radius:20px;
      padding:24px;
      box-shadow:0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06);
      animation:shopFadeIn 0.2s ease;
    `;

    panel.innerHTML = buildShopHTML(shopName, inventory, gold, purchased);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    attachEvents(gold);
  }
}