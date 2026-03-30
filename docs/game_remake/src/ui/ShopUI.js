// src/ui/ShopUI.js
export class ShopUI {
  static show(inventory, gold, onBuy, onClose) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:300;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';

    const card = document.createElement('div');
    card.style.cssText = 'width:480px;max-width:94vw;background:rgba(12,10,28,0.97);border:1px solid rgba(251,191,36,0.35);border-radius:16px;padding:20px;color:white;box-shadow:0 8px 40px rgba(0,0,0,0.7);';

    const rarityColor = { legendary:'#ef4444', epic:'#a855f7', rare:'#3b82f6', common:'#9ca3af' };

    const render = (currentGold) => {
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:700;">🏪 Mysterious Shop</div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:15px;color:#fbbf24;font-weight:700;">💰 ${currentGold} Gold</div>
            <button id="shop-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;font-size:18px;">✕</button>
          </div>
        </div>
        <div style="font-size:12px;opacity:.5;margin-bottom:14px;">Inventory refreshes each visit · Purchases go straight to your bag</div>
        ${inventory.map((item, i) => {
          const color = rarityColor[item?.rarity] ?? '#9ca3af';
          const canAfford = currentGold >= item._shopPrice;
          const isWeapon = Array.isArray(item.skills) && item.skills.length > 0;
          const statText = item.statBonus
            ? Object.entries(item.statBonus).map(([k,v]) => `+${v} ${k}`).join(' · ')
            : '';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,0.03);">
              <div style="font-size:28px;">${isWeapon ? '⚔️' : '🧪'}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:14px;">${item.name}</div>
                <div style="color:${color};font-size:11px;margin-top:2px;">${item.rarity ?? 'common'}${isWeapon ? ` · For: ${item.owner ?? '?'}` : ''}</div>
                ${statText ? `<div style="opacity:.6;font-size:11px;margin-top:2px;">${statText}</div>` : ''}
                ${item.desc ? `<div style="opacity:.5;font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.desc}</div>` : ''}
              </div>
              <button class="shop-buy" data-i="${i}"
                style="padding:8px 14px;border-radius:10px;border:none;
                  cursor:${canAfford ? 'pointer' : 'not-allowed'};
                  background:${canAfford ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)'};
                  color:${canAfford ? '#fbbf24' : '#4b5563'};
                  font-weight:700;font-size:13px;white-space:nowrap;min-width:80px;">
                💰 ${item._shopPrice}
              </button>
            </div>`;
        }).join('')}
        <div style="text-align:center;margin-top:6px;opacity:.4;font-size:11px;">Inventory will refresh on your next visit</div>
      `;

      card.querySelector('#shop-close').onclick = () => { overlay.remove(); onClose?.(); };

      card.querySelectorAll('.shop-buy').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.i);
          const item = inventory[idx];
          if (!item || currentGold < item._shopPrice) return;
          onBuy(item, idx);
          inventory.splice(idx, 1);
          if (inventory.length === 0) {
            overlay.remove();
          } else {
            render(currentGold - item._shopPrice);
          }
        });
      });
    };

    render(gold);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
}