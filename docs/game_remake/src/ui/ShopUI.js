// src/ui/ShopUI.js

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
  const icons = {
    sword: '⚔️', shield: '🛡️', potion: '🧪', boots: '👟',
    clover: '🍀', bracelet: '📿', ring_strength: '💍',
    ring_intellect: '🔮', traveler_set: '🧭', star_cloak: '🌟',
    bloodthirst_mask: '😈',
    lion_heart: '🦁',
    cursed_codex: '📕',
    eagle_eye: '🦅',
    holy_spirit_heart: '✨',
  };
  if (item?.icon && icons[item.icon]) return icons[item.icon];
  const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;
  return isWeapon ? '⚔️' : '💍';
}

function buildItemCard(item, index, gold, purchased) {
  const r = getRarity(item);
  const icon = getItemIcon(item);
  const canAfford = gold >= item._shopPrice;
  const isBought = purchased.has(index);
  const isWeapon = Array.isArray(item?.skills) && item.skills.length > 0;

  const statBonusHTML = item.statBonus && Object.keys(item.statBonus).length > 0
    ? `<div style="font-size:10px;color:#475569;">${Object.entries(item.statBonus).map(([k,v]) => `+${v} ${k.toUpperCase()}`).join(' · ')}</div>`
    : '';

  const ownerTag = item.owner
    ? ` · <span style="color:#64748b;">${item.owner}</span>`
    : '';

  return `
    <div class="shop-item-card" data-index="${index}" style="
      position:relative;
      background:${isBought ? 'rgba(255,255,255,0.02)' : r.bg};
      border:0.5px solid ${isBought ? 'rgba(255,255,255,0.06)' : r.color + '55'};
      border-radius:12px;
      padding:12px;
      display:flex;
      flex-direction:column;
      gap:7px;
      opacity:${isBought ? '0.35' : '1'};
      transition:transform 0.15s;
    ">
      ${isBought ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(0,0,0,0.3);font-size:12px;color:#64748b;z-index:2;">Sold</div>` : ''}

      <div style="display:flex;align-items:center;gap:9px;">
        <div style="width:40px;height:40px;flex-shrink:0;border-radius:10px;background:rgba(255,255,255,0.04);border:0.5px solid ${r.color}33;display:flex;align-items:center;justify-content:center;font-size:18px;">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
          <div style="font-size:10px;color:${r.color};letter-spacing:0.05em;">${r.label}${ownerTag}</div>
        </div>
      </div>

      ${statBonusHTML}
      ${item.desc ? `<div style="font-size:10px;color:#475569;line-height:1.4;">${item.desc}</div>` : ''}

      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:7px;border-top:0.5px solid rgba(255,255,255,0.06);margin-top:auto;">
        <div style="font-size:13px;font-weight:500;color:#fbbf24;">💰 ${item._shopPrice}</div>
        ${isBought ? '' : `
          <button class="shop-buy-btn" data-index="${index}" style="
            padding:5px 13px;border-radius:7px;
            border:0.5px solid ${canAfford ? r.color + '88' : 'rgba(255,255,255,0.08)'};
            background:${canAfford ? r.color + '18' : 'rgba(255,255,255,0.03)'};
            color:${canAfford ? r.color : '#334155'};
            font-size:11px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
          " ${canAfford ? '' : 'disabled'}>BUY</button>
        `}
      </div>
    </div>
  `;
}

function buildServiceCard(icon, title, desc, price, btnLabel, btnColor, btnBg, btnBorder, actionAttr, canAfford) {
  return `
    <div style="
      background:${btnBg.replace('0.12','0.05')};
      border:0.5px solid ${btnBorder.replace('0.5','0.2')};
      border-radius:12px;padding:12px;
      display:flex;align-items:center;gap:12px;
    ">
      <div style="width:40px;height:40px;flex-shrink:0;border-radius:10px;background:${btnBg};border:0.5px solid ${btnBorder};display:flex;align-items:center;justify-content:center;font-size:18px;">${icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:500;color:#f1f5f9;">${title}</div>
        <div style="font-size:10px;color:#475569;margin-top:2px;">${desc}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:13px;font-weight:500;color:#fbbf24;margin-bottom:4px;">💰 ${price}</div>
        <button class="shop-service-btn" ${actionAttr} style="
          padding:5px 13px;border-radius:7px;
          border:0.5px solid ${canAfford ? btnBorder : 'rgba(255,255,255,0.08)'};
          background:${canAfford ? btnBg : 'rgba(255,255,255,0.03)'};
          color:${canAfford ? btnColor : '#334155'};
          font-size:11px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
        " ${canAfford ? '' : 'disabled'}>${btnLabel}</button>
      </div>
    </div>
  `;
}

export class ShopUI {
  static show(shopName, inventory, gold, onBuy, onLeave) {
    document.getElementById('shop-overlay')?.remove();

    const purchased = new Set();

    // 分离商品和服务
    const items = inventory.filter(i => !i._isHeal && !i._isRefresh);
    const healItem = inventory.find(i => i._isHeal);
    const refreshItem = inventory.find(i => i._isRefresh);

    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:300;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.72);backdrop-filter:blur(6px);
      font-family:'Segoe UI',system-ui,sans-serif;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width:680px;max-width:calc(100vw - 40px);max-height:90vh;
      overflow-y:auto;
      background:#0f111c;
      border:0.5px solid rgba(255,255,255,0.09);
      border-radius:20px;padding:22px;
      box-shadow:0 24px 64px rgba(0,0,0,0.7);
    `;

    const closeShop = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s';
      setTimeout(() => { overlay.remove(); onLeave?.(); }, 150);
    };

    const rebuildPanel = (currentGold) => {
      panel.innerHTML = buildHTML(currentGold);
      attachEvents(currentGold);
    };

    const buildHTML = (currentGold) => `
      <style>
        .shop-item-card:hover { transform:translateY(-2px); }
        .shop-buy-btn:not(:disabled):hover { filter:brightness(1.3); }
        .shop-service-btn:not(:disabled):hover { filter:brightness(1.3); }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div style="font-size:11px;letter-spacing:0.12em;color:#475569;margin-bottom:2px;">WELCOME TO</div>
          <div style="font-size:19px;font-weight:500;color:#f1f5f9;">🛒 ${shopName}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="background:rgba(251,191,36,0.1);border:0.5px solid rgba(251,191,36,0.3);border-radius:10px;padding:6px 14px;font-size:15px;font-weight:500;color:#fbbf24;">💰 ${currentGold}</div>
          <button id="shop-close-btn" style="width:32px;height:32px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#64748b;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
      </div>

      <div style="height:0.5px;background:rgba(255,255,255,0.07);margin-bottom:16px;"></div>

      <!-- 商品区 -->
      <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:10px;">ITEMS FOR SALE</div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px;">
        ${items.map((item, i) => buildItemCard(item, i, currentGold, purchased)).join('')}
      </div>

      <div style="height:0.5px;background:rgba(255,255,255,0.07);margin-bottom:14px;"></div>

      <!-- 服务区 -->
      <div style="font-size:11px;letter-spacing:0.1em;color:#475569;margin-bottom:10px;">SERVICES</div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-bottom:18px;">
        ${healItem ? buildServiceCard(
          '✨', healItem.name, healItem.desc, healItem._shopPrice,
          'USE', '#22c55e', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.35)',
          'data-heal="true"', currentGold >= healItem._shopPrice
        ) : ''}
        ${refreshItem ? buildServiceCard(
          '🔄', refreshItem.name, refreshItem.desc, refreshItem._shopPrice,
          'USE', '#fbbf24', 'rgba(251,191,36,0.08)', 'rgba(251,191,36,0.3)',
          'data-refresh="true"', currentGold >= refreshItem._shopPrice
        ) : ''}
      </div>

      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:11px;color:#334155;">Items lock per shop · refresh to reroll</div>
        <button id="shop-leave-btn" style="padding:7px 22px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#64748b;font-size:12px;cursor:pointer;">Leave Shop</button>
      </div>
    `;

    const attachEvents = (currentGold) => {
      panel.querySelector('#shop-close-btn')?.addEventListener('click', closeShop);
      panel.querySelector('#shop-leave-btn')?.addEventListener('click', closeShop);

      // 购买商品
      panel.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          const item = items[idx];
          if (!item || purchased.has(idx)) return;
          purchased.add(idx);
          const newGold = onBuy(item, idx);
          rebuildPanel(typeof newGold === 'number' ? newGold : currentGold - item._shopPrice);
        });
      });

      // 服务按钮
      panel.querySelectorAll('.shop-service-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.heal) {
            if (!healItem || currentGold < healItem._shopPrice) return;
            const newGold = onBuy(healItem, -1);
            rebuildPanel(typeof newGold === 'number' ? newGold : currentGold - healItem._shopPrice);
          }
          if (btn.dataset.refresh) {
            if (!refreshItem || currentGold < refreshItem._shopPrice) return;
            const newGold = onBuy(refreshItem, -2);
            // 关闭后重新打开（由 EventTable 的 openShop 处理）
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.15s';
            setTimeout(() => { overlay.remove(); }, 150);
          }
        });
      });
    };

    panel.innerHTML = buildHTML(gold);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    attachEvents(gold);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeShop(); });
  }
}