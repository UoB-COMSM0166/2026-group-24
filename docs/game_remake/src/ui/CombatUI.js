// src/ui/CombatUI.js

const { useState, useEffect } = React;

// ─── Inject styles once ───────────────────────────────────────────────────────
if (!document.getElementById('combat-ui-style')) {
  const s = document.createElement('style');
  s.id = 'combat-ui-style';
  s.textContent = `
    @keyframes dice2d-spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
    @keyframes hp-pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
    @keyframes float-up { 0% { transform:translateY(0) translateX(-50%) scale(1); opacity:1; }
                         100% { transform:translateY(-52px) translateX(-50%) scale(1.15); opacity:0; } }
    @keyframes unit-active-glow { 0%,100% { filter:drop-shadow(0 0 6px currentColor); }
                                   50% { filter:drop-shadow(0 0 16px currentColor); } }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    .unit-shake { animation: shake 0.35s ease; }
    .float-text { position:absolute; left:50%; pointer-events:none; font-weight:900; font-size:1.4rem;
                  animation: float-up 1s ease-out forwards; text-shadow:2px 2px 6px rgba(0,0,0,0.9); z-index:20; }

    /* 像素风格渲染样式 */
    .pixel-art {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      object-fit: contain;
    }
    /* 容器大小与怪物 SVG (140x196) 保持一致，确保位置对齐 */
    .sprite-container {
      width: 140px;
      height: 196px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      position: relative;
      margin-bottom: 10px;
    }
      .pixel-content {
      position: absolute;
      bottom: 0px; /* 默认底端对齐 */
      left: 0px;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center; /* 水平居中 */
      align-items: flex-end;    /* 内容底端对齐 */
    }
    /* 模拟 SVG 的脚底阴影，也需要精确定位 */
    .unit-shadow {
      position: absolute;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%); /* 水平居中 */
      width: 60px;
      height: 12px;
      background: rgba(0,0,0,0.3);
      border-radius: 50%;
      z-index: -1;
    }
  `;
  document.head.appendChild(s);
}

// ─── 2D Dice ──────────────────────────────────────────────────────────────────
const PIP_POS = {
  1:[[30,30]], 2:[[16,16],[44,44]], 3:[[16,16],[30,30],[44,44]],
  4:[[16,16],[44,16],[16,44],[44,44]], 5:[[16,16],[44,16],[30,30],[16,44],[44,44]],
  6:[[16,14],[44,14],[16,30],[44,30],[16,46],[44,46]],
};
const DiceSVG = ({ value, rolling }) => {
  const v = Math.max(1, Math.min(6, value||1));
  const face = rolling?'#fef3c7': v<=2?'#e2e8f0': v<=4?'#fef9ee': v===5?'#fff7ed':'#fffbeb';
  const edge = rolling?'#d97706': v<=2?'#94a3b8': v<=4?'#b45309': v===5?'#ea580c':'#d97706';
  return (
    <div style={{ animation: rolling?'dice2d-spin 0.15s linear infinite':'none', display:'inline-block' }}>
      <svg viewBox="0 0 60 60" width="96" height="96" style={{
        filter: rolling
          ? 'drop-shadow(0 0 10px rgba(251,191,36,0.8)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 4px 12px rgba(0,0,0,0.7)) drop-shadow(0 0 5px rgba(251,191,36,0.3))',
        display:'block'
      }}>
        <ellipse cx="30" cy="57" rx="20" ry="4" fill="rgba(0,0,0,0.3)"/>
        <rect x="3" y="3" width="54" height="54" rx="10" fill={face} stroke={edge} strokeWidth="2.5"/>
        <rect x="5" y="5" width="50" height="50" rx="8" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
        <path d="M13 53 Q53 53 53 13" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="3" strokeLinecap="round"/>
        {(PIP_POS[v]||[]).map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="4.2" fill={v<=2?'#475569':'#1c1917'}
            style={{filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'}}/>
        ))}
      </svg>
    </div>
  );
};

// ─── SVG character figures (Fallbacks) ─────────────────────────────────────────

const GoblinFigure = () => (
  <svg viewBox="0 0 100 140" width="140" height="196">
    <defs>
      <linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#15803d"/>
      </linearGradient>
      <radialGradient id="gGlow" cx="50%" cy="90%" r="40%">
        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="132" rx="28" ry="7" fill="url(#gGlow)"/>
    <ellipse cx="50" cy="130" rx="18" ry="4" fill="rgba(0,0,0,0.25)"/>
    <path d="M32 65 Q50 56 68 65 L66 110 Q50 118 34 110 Z" fill="url(#gSkin)" stroke="#166534" strokeWidth="1.5"/>
    <path d="M34 70 L28 90 L36 86" fill="#92400e" stroke="#78350f" strokeWidth="1"/>
    <path d="M66 70 L72 90 L64 86" fill="#92400e" stroke="#78350f" strokeWidth="1"/>
    <circle cx="50" cy="42" r="24" fill="url(#gSkin)" stroke="#166534" strokeWidth="2"/>
    <path d="M26 36 L18 28 L24 40" fill="url(#gSkin)" stroke="#166534" strokeWidth="1.5"/>
    <path d="M74 36 L82 28 L76 40" fill="url(#gSkin)" stroke="#166534" strokeWidth="1.5"/>
    <ellipse cx="41" cy="40" rx="6" ry="5" fill="#dc2626"/>
    <ellipse cx="59" cy="40" rx="6" ry="5" fill="#dc2626"/>
    <ellipse cx="41" cy="40" rx="3" ry="3" fill="#1e293b"/>
    <ellipse cx="59" cy="40" rx="3" ry="3" fill="#1e293b"/>
    <circle cx="42" cy="39" r="1" fill="white"/>
    <circle cx="60" cy="39" r="1" fill="white"/>
    <ellipse cx="50" cy="48" rx="4" ry="3" fill="#16a34a"/>
    <circle cx="48" cy="48" r="1.5" fill="#166534"/>
    <circle cx="52" cy="48" r="1.5" fill="#166534"/>
    <path d="M40 56 Q50 62 60 56" stroke="#166534" strokeWidth="2" fill="none"/>
    <rect x="44" y="56" width="4" height="5" rx="1" fill="white"/>
    <rect x="52" y="56" width="4" height="5" rx="1" fill="white"/>
    <line x1="72" y1="62" x2="84" y2="30" stroke="#78350f" strokeWidth="5" strokeLinecap="round"/>
    <path d="M82 26 L88 20 L86 30 L80 30 Z" fill="#9ca3af" stroke="#6b7280" strokeWidth="1"/>
    <rect x="34" y="106" width="12" height="20" rx="4" fill="url(#gSkin)" stroke="#166534" strokeWidth="1"/>
    <rect x="54" y="106" width="12" height="20" rx="4" fill="url(#gSkin)" stroke="#166534" strokeWidth="1"/>
  </svg>
);

const BossFigure = () => (
  <svg viewBox="0 0 120 160" width="160" height="213">
    <defs>
      <radialGradient id="bossBody" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#991b1b"/><stop offset="100%" stopColor="#450a0a"/>
      </radialGradient>
      <radialGradient id="bossGlow" cx="50%" cy="90%" r="50%">
        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5"/>
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="152" rx="40" ry="9" fill="url(#bossGlow)"/>
    <ellipse cx="60" cy="150" rx="26" ry="5" fill="rgba(0,0,0,0.4)"/>
    <path d="M20 70 Q60 55 100 70 L108 145 Q60 155 12 145 Z" fill="#450a0a" stroke="#7f1d1d" strokeWidth="2"/>
    <path d="M30 68 Q60 56 90 68 L88 130 Q60 138 32 130 Z" fill="url(#bossBody)" stroke="#dc2626" strokeWidth="2"/>
    <path d="M40 75 L80 75" stroke="#fca5a5" strokeWidth="1" opacity="0.4"/>
    <path d="M38 88 L82 88" stroke="#fca5a5" strokeWidth="1" opacity="0.3"/>
    <path d="M36 30 L24 8 L38 22" fill="#7f1d1d" stroke="#dc2626" strokeWidth="1.5"/>
    <path d="M84 30 L96 8 L82 22" fill="#7f1d1d" stroke="#dc2626" strokeWidth="1.5"/>
    <circle cx="60" cy="38" r="28" fill="url(#bossBody)" stroke="#7f1d1d" strokeWidth="2"/>
    <ellipse cx="49" cy="35" rx="7" ry="6" fill="#fca5a5"/>
    <ellipse cx="71" cy="35" rx="7" ry="6" fill="#fca5a5"/>
    <ellipse cx="49" cy="35" rx="4" ry="4" fill="#dc2626"/>
    <ellipse cx="71" cy="35" rx="4" ry="4" fill="#dc2626"/>
    <ellipse cx="49" cy="35" rx="2" ry="2" fill="#1e293b"/>
    <ellipse cx="71" cy="35" rx="2" ry="2" fill="#1e293b"/>
    <circle cx="50" cy="34" r="1" fill="white"/>
    <circle cx="72" cy="34" r="1" fill="white"/>
    <path d="M44 48 Q60 56 76 48" stroke="#dc2626" strokeWidth="2.5" fill="none"/>
    <rect x="50" y="48" width="5" height="7" rx="1" fill="#fca5a5"/>
    <rect x="65" y="48" width="5" height="7" rx="1" fill="#fca5a5"/>
    <rect x="4" y="58" width="10" height="58" rx="3" fill="#374151" stroke="#6b7280" strokeWidth="1.5"/>
    <path d="M4 58 L14 58 L9 44 Z" fill="#9ca3af"/>
    <rect x="106" y="58" width="10" height="58" rx="3" fill="#374151" stroke="#6b7280" strokeWidth="1.5"/>
    <path d="M106 58 L116 58 L111 44 Z" fill="#9ca3af"/>
  </svg>
);

const getRogueFigure = () => (
  <svg viewBox="0 0 100 140" width="140" height="196">
    <defs>
      <linearGradient id="rCloak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e1b4b"/><stop offset="100%" stopColor="#0f0f1a"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="130" rx="18" ry="4" fill="rgba(0,0,0,0.3)"/>
    <path d="M26 60 Q50 50 74 60 L78 118 Q50 126 22 118 Z" fill="url(#rCloak)" stroke="#312e81" strokeWidth="1.5"/>
    <circle cx="50" cy="38" r="22" fill="#1e1b4b" stroke="#312e81" strokeWidth="2"/>
    <path d="M28 30 Q50 18 72 30 L70 52 Q50 58 30 52 Z" fill="#0f0f1a" stroke="#312e81" strokeWidth="1.5"/>
    <ellipse cx="43" cy="38" rx="4" ry="3" fill="#818cf8"/>
    <ellipse cx="57" cy="38" rx="4" ry="3" fill="#818cf8"/>
    <rect x="14" y="58" width="4" height="30" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
    <rect x="12" y="62" width="8" height="3" rx="1" fill="#fbbf24"/>
    <rect x="82" y="58" width="4" height="30" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
    <rect x="80" y="62" width="8" height="3" rx="1" fill="#fbbf24"/>
  </svg>
);

// ─── 像素动画核心组件 ───────────────────────────────────────────────────
const AnimatedSprite = ({ unit, action = 'idle' }) => {
  const [frame, setFrame] = useState(0);
  const heroId = unit.id;

  useEffect(() => {
    // 对应各角色的帧数和播放间隔
    const configs = {
      knight: { idle: { f: 8, i: 120 }, hit: { f: 6, i: 70 },  death: { f: 13, i: 100 } },
      priest: { idle: { f: 6, i: 150 }, hit: { f: 6, i: 70 },  death: { f: 18, i: 100 } },
      ranger: { idle: { f: 12, i: 80 }, hit: { f: 6, i: 70 },  death: { f: 19, i: 100 } },
      wizard: { idle: { f: 6, i: 180 }, hit: { f: 1, i: 400 }, death: { f: 1, i: 1000 } }
    };

    const config = configs[heroId]?.[action] || { f: 1, i: 1000 };
    setFrame(0);

    const timer = setInterval(() => {
      setFrame(f => {
        // 3. 死亡动画逻辑：播放到最后一帧停止
        if (action === 'death') {
          return f >= config.f - 1 ? config.f - 1 : f + 1;
        }
        return (f + 1) % config.f;
      });
    }, config.i);

    return () => clearInterval(timer);
  }, [heroId, action]);

  // Wizard 特殊逻辑：单精灵图裁剪
  if (heroId === 'wizard') {
    const sheet = DataLoader.getAnim('wizard', action);
    if (!sheet) return <MageFigure />;

    // 假设横向排列的 6 帧精灵图
    const totalFrames = 6;
    const frameW = sheet.width / totalFrames;
    return (
      <div className="sprite-container">
        <div className="unit-shadow" />
        <div style={{
          width: `${frameW}px`,
          height: `${sheet.height}px`,
          backgroundImage: `url(${sheet.src})`,
          backgroundPosition: `-${frame * frameW}px 0px`,
          backgroundSize: `${sheet.width}px ${sheet.height}px`,
          backgroundRepeat: 'no-repeat',
          /* 👇 修改此处的 scale 数值（如 4.8 -> 5.5）来改变法师大小 */
          transform: 'scale(2.2) translateY(47px) translateX(-40px)',
          transformOrigin: 'bottom center',
          imageRendering: 'pixelated',
          marginBottom: '-5px'
        }} className="pixel-art" />
      </div>
    );
  }

  // 其他英雄逻辑：序列帧切换
  const animFrames = DataLoader.getAnim(heroId, action);
  if (!animFrames || animFrames.length === 0) return null;

  const currentImg = animFrames[frame] || animFrames[0];
  return (
    <div className="sprite-container">
      <div className="unit-shadow" /> {/* 建议加上阴影保持视觉对齐 */}
      <img src={currentImg.src} className="pixel-art" 
           style={{ height: '42px', transform: 'scale(12.0)', transformOrigin: 'bottom center' }} />
    </div>
  );};

// ─── 重写：getFigure 函数 ──────────────────────────────────────────────
const getFigure = (unit, action = 'idle') => {
  if (unit.type === 'enemy') return unit.monsterType === 'boss' ? <BossFigure/> : <GoblinFigure/>;

  // 映射角色 ID 到像素动画
  const supportedHeroes = ['knight', 'priest', 'ranger', 'wizard'];
  if (supportedHeroes.includes(unit.id)) {
    return <AnimatedSprite unit={unit} action={action} />; // 传递 action
  }

  // 兜底逻辑
  if (unit.id === 'mage')   return <MageFigure/>;
  if (unit.id === 'rogue')  return getRogueFigure();
  return <div style={{ fontSize: '2rem' }}>👤</div>;
};

// ─── Compact HP bar ──────────────────────────────────────────────────────────
const HpBar = ({ current, max, isEnemy, name }) => {
  const pct = Math.max(0, (current / max) * 100);
  const isLow = pct <= 30;
  const color = isEnemy
    ? (isLow ? '#dc2626' : '#ef4444')
    : (pct <= 30 ? '#ef4444' : pct <= 60 ? '#eab308' : '#22c55e');
  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isEnemy ? '#fca5a5' : '#d1fae5',
        textShadow: '0 1px 4px rgba(0,0,0,0.9)', marginBottom: '3px', letterSpacing: '0.05em' }}>
        {name}
      </div>
      <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.6)',
        borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
        <div style={{
          width: `${pct}%`, height: '100%', backgroundColor: color,
          borderRadius: '4px', transition: 'width 0.5s ease',
          boxShadow: isLow ? `0 0 8px ${color}` : 'none',
          animation: isLow ? 'hp-pulse 0.9s ease-in-out infinite' : 'none',
        }}/>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'40%',
          background:'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)', borderRadius:'4px 4px 0 0' }}/>
      </div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontFamily: 'monospace' }}>
        {current} / {max}
      </div>
    </div>
  );
};

// ─── Turn order strip ─────────────────────────────────────────────────────────
const TurnOrderStrip = ({ turnOrder }) => {
  if (!turnOrder?.length) return null;
  return (
    <div style={{ position:'absolute', top:'10px', left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.65)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:'999px', padding:'5px 14px',
      backdropFilter:'blur(6px)', zIndex:10 }}>
      <span style={{ fontSize:'9px', color:'#78716c', textTransform:'uppercase', letterSpacing:'0.1em', marginRight:'4px' }}>Turn</span>
      {turnOrder.slice(0, 7).map((u, i) => {
        const isNow = i === 0;
        const isEnemy = u.type === 'enemy';
        return (
          <div key={(u.id||i)+'_'+i} style={{ display:'flex', flexDirection:'column', alignItems:'center',
            transform: isNow ? 'scale(1.3)' : 'scale(1)', opacity: isNow ? 1 : 0.4,
            transition:'all 0.2s' }}>
            <div style={{
              width:'22px', height:'22px', borderRadius:'50%', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'10px', border: `2px solid ${isNow ? (isEnemy?'#f87171':'#fbbf24') : '#44403c'}`,
              background: isNow ? (isEnemy?'rgba(127,29,29,0.7)':'rgba(120,53,15,0.7)') : 'rgba(28,25,23,0.8)',
              boxShadow: isNow ? `0 0 8px ${isEnemy?'#f87171':'#fbbf24'}` : 'none',
            }}>{isEnemy ? '👾' : '⚔'}</div>
            {isNow && <div style={{ fontSize:'7px', fontWeight:'bold', marginTop:'2px',
              color: isEnemy?'#f87171':'#fbbf24', lineHeight:1 }}>NOW</div>}
          </div>
        );
      })}
    </div>
  );
};

// ─── Weapon switch modal ──────────────────────────────────────────────────────
const WeaponModal = ({ hero, onSwitch, onClose }) => {
  const weapons = hero.weaponSlots || [];
  const activeIdx = hero.equippedWeaponIndex ?? 0;
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>
      <div style={{ background:'#1c1917', border:'1px solid #57534e', borderRadius:'14px',
        padding:'18px', width:'260px', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <span style={{ color:'#fbbf24', fontWeight:'bold', fontSize:'14px' }}>⚔ Switch Weapon</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#78716c',
            cursor:'pointer', fontSize:'18px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {weapons.map((w, i) => w ? (
            <button key={i} onClick={() => { onSwitch(hero, i); onClose(); }}
              style={{
                textAlign:'left', padding:'10px 12px', borderRadius:'10px', cursor:'pointer',
                border: `2px solid ${i===activeIdx ? '#fbbf24' : '#44403c'}`,
                background: i===activeIdx ? 'rgba(120,53,15,0.4)' : 'rgba(28,25,23,0.8)',
                color: i===activeIdx ? '#fde68a' : '#d6d3d1', transition:'all 0.15s',
              }}>
              <div style={{ fontWeight:'bold', fontSize:'13px' }}>
                {i===activeIdx ? '● ' : '○ '}{w.name}
                {i===activeIdx && <span style={{ fontSize:'10px', color:'#f59e0b', marginLeft:'6px' }}>(equipped)</span>}
              </div>
              <div style={{ fontSize:'10px', color:'#78716c', marginTop:'3px' }}>
                {w.type} · {w.skills?.length ?? 0} skills
                {w.statBonus ? ' · ' + Object.entries(w.statBonus).map(([k,v])=>`+${v} ${k.slice(0,3).toUpperCase()}`).join(', ') : ''}
              </div>
            </button>
          ) : null)}
        </div>
      </div>
    </div>
  );
};

// ─── Use item modal ───────────────────────────────────────────────────────────
const ItemModal = ({ hero, onUse, onClose }) => {
  const items = (hero.inventory || []).filter(Boolean);
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>
      <div style={{ background:'#1c1917', border:'1px solid #57534e', borderRadius:'14px',
        padding:'18px', width:'260px', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'14px' }}>🧪 Use Item</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#78716c',
            cursor:'pointer', fontSize:'18px', lineHeight:1 }}>✕</button>
        </div>
        {items.length === 0
          ? <div style={{ color:'#57534e', textAlign:'center', padding:'20px 0', fontSize:'13px' }}>No items in bag</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'200px', overflowY:'auto' }}>
              {items.map((item, i) => (
                <button key={i} onClick={() => { onUse(hero, i); onClose(); }}
                  style={{ textAlign:'left', padding:'10px 12px', borderRadius:'10px', cursor:'pointer',
                    border:'2px solid #44403c', background:'rgba(28,25,23,0.8)', color:'#d6d3d1',
                    transition:'all 0.15s' }}>
                  <div style={{ fontWeight:'bold', fontSize:'13px' }}>{item.name}</div>
                  <div style={{ fontSize:'10px', color:'#78716c', marginTop:'2px' }}>{item.desc}</div>
                </button>
              ))}
            </div>
        }
      </div>
    </div>
  );
};

// ─── Unit display ─────────────────────────────────────────────────────────────
const UnitDisplay = ({ unit, isEnemy, isActive, canTarget, onTarget, shakingId }) => {
  const isDead = unit.hp <= 0;
  const activeColor = isEnemy ? '#f87171' : '#fbbf24';
  const barW = isEnemy && unit.monsterType === 'boss' ? '130px' : '110px';

  let currentAction = 'idle';
  if (isDead) {
    currentAction = 'death';
  } else if (shakingId === unit.id) {
    currentAction = 'hit';
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      opacity: isDead ? 0.3 : 1, filter: isDead ? 'grayscale(1)' : 'none',
      cursor: canTarget ? 'pointer' : 'default',
      transform: isActive ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.2s',
    }}
      onClick={() => canTarget && onTarget(unit.id)}>

      {isActive && !canTarget && (
        <div style={{ fontSize:'9px', fontWeight:'bold', padding:'2px 8px', borderRadius:'999px',
          background: isEnemy ? '#7f1d1d' : '#78350f', color: activeColor,
          border:`1px solid ${activeColor}`, whiteSpace:'nowrap',
          animation:'hp-pulse 1s ease-in-out infinite', marginBottom:'4px' }}>
          {isEnemy ? '⚔ ACTING' : '▶ YOUR TURN'}
        </div>
      )}
      {canTarget && (
        <div style={{ fontSize:'9px', fontWeight:'bold', padding:'2px 8px', borderRadius:'999px',
          background:'#7f1d1d', color:'#fca5a5', border:'1px solid #f87171', whiteSpace:'nowrap',
          animation:'hp-pulse 0.6s ease-in-out infinite', marginBottom:'4px' }}>
          🎯 TARGET
        </div>
      )}
      {!isActive && !canTarget && (
        <div style={{ height:'21px', marginBottom:'4px' }}/>
      )}

      <div style={{ width: barW, marginBottom:'4px' }}>
        <HpBar current={unit.hp} max={unit.maxHp} isEnemy={isEnemy} name={unit.name}/>
      </div>

      <div style={{ position:'relative' }}>
        {isActive && (
          <div style={{ position:'absolute', bottom:'4px', left:'50%', transform:'translateX(-50%)',
            width:'80px', height:'14px', borderRadius:'50%',
            background:`radial-gradient(ellipse, ${activeColor}55 0%, transparent 70%)`,
            filter:'blur(4px)' }}/>
        )}
        {getFigure(unit, currentAction)}
        {isDead && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'2.5rem' }}>💀</div>
        )}
      </div>
    </div>
  );
};

// ─── Main CombatApp ───────────────────────────────────────────────────────────
const CombatApp = ({ state, callbacks }) => {
  const { heroes, enemies, phase, logs, diceInfo, activeUnit, turnOrder } = state;
  const { onStartBattle, onSkillSelect, onTargetSelect, onRollComplete,
          onExecuteComplete, onFinishCombat, onSwitchWeapon, onUseItem } = callbacks;

  const [showDice, setShowDice]           = useState(false);
  const [diceValue, setDiceValue]         = useState(1);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [shakingId, setShakingId]         = useState(null);
  const [modal, setModal]                 = useState(null);

  const addFloat = (value, type, unitId) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(p => [...p, { id, value, type, unitId }]);
    setTimeout(() => setFloatingTexts(p => p.filter(f => f.id !== id)), 1100);
  };

  useEffect(() => {
    if (phase === 'ROLLING' && diceInfo) {
      setShowDice(true);
      let n = 0;
      const iv = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
        if (++n > 15) { clearInterval(iv); setDiceValue(diceInfo.finalRoll); setTimeout(onRollComplete, 500); }
      }, 55);
      return () => clearInterval(iv);
    }
    if (phase === 'EXECUTING' && diceInfo) {
      if (diceInfo.isHeal) {
        addFloat(`+${diceInfo.damage}`, 'heal', diceInfo.targetId);
      } else {
        setShakingId(diceInfo.targetId);
        addFloat(diceInfo.damage, diceInfo.type || 'dmg', diceInfo.targetId);
        setTimeout(() => setShakingId(null), 400);
      }
      setTimeout(onExecuteComplete, 1200);
    }
    if (['ENEMY_TURN','PLAYER_TURN','WIN','LOSE'].includes(phase)) setShowDice(false);
  }, [phase, diceInfo]);

  const isPlayerTurn = phase === 'PLAYER_TURN';
  const activeHero   = isPlayerTurn ? activeUnit : null;
  const activeSkills = activeHero?.skills || [];

  const SKILL_COLOR = {
    magic:  { border:'#818cf8', bg:'rgba(30,27,75,0.85)',  icon:'🔮', label:'MAG'  },
    heal:   { border:'#34d399', bg:'rgba(6,78,59,0.85)',   icon:'💚', label:'HEAL' },
    buff:   { border:'#fbbf24', bg:'rgba(66,32,6,0.85)',   icon:'✨', label:'BUFF' },
    debuff: { border:'#f97316', bg:'rgba(67,20,7,0.85)',   icon:'🌀', label:'DEB'  },
    attack: { border:'#f87171', bg:'rgba(69,10,10,0.85)',  icon:'⚔',  label:'ATK'  },
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%',
      background:'#0c0a09', color:'white', fontFamily:'sans-serif',
      userSelect:'none', position:'relative', overflow:'hidden' }}>

      {modal?.type === 'weapon' && <WeaponModal hero={modal.hero} onSwitch={onSwitchWeapon} onClose={() => setModal(null)}/>}
      {modal?.type === 'item'   && <ItemModal   hero={modal.hero} onUse={onUseItem}         onClose={() => setModal(null)}/>}

      <div style={{ flex:1, position:'relative', overflow:'hidden',
        backgroundImage:'url("./resource/img/map/chapter1/battleback1.png")',
        backgroundSize:'cover',
        backgroundPosition:'center' }}>

        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.06, pointerEvents:'none' }}>
          <defs>
            <pattern id="cGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="1"/>
              <stop offset="35%" stopColor="#0f172a" stopOpacity="0"/>
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#cGrid)"/>
          <rect width="100%" height="100%" fill="url(#gridFade)"/>
        </svg>

        <TurnOrderStrip turnOrder={turnOrder}/>

        <div style={{ position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'space-around', padding:'40px 40px 10px' }}>

          {(() => {
          const isCaster = h => h.id === 'wizard' || h.id === 'priest' || h.id === 'ranger';
            const sorted = [...heroes].sort((a, b) =>
              isCaster(a) && !isCaster(b) ? -1 : !isCaster(a) && isCaster(b) ? 1 : 0
            );
            return (
              <div style={{ display:'flex', gap:'80px', alignItems:'flex-end' }}>
                {sorted.map(h => {
                  const isActive = activeUnit?.id === h.id && !['WIN','LOSE','START'].includes(phase);
                  const canTargetAlly = phase==='AWAIT_ALLY_TARGET' && h.hp > 0;
                  return (
                    <div key={h.id} style={{ position:'relative' }}
                      className={shakingId === h.id ? 'unit-shake' : ''}>
                      {floatingTexts.filter(f => f.unitId === h.id).map(f => (
                        <div key={f.id} className="float-text" style={{ top:'-10px',
                          color: f.type==='heal'?'#4ade80': f.type==='perfect'?'#fbbf24':
                                 f.type==='crit'?'#f97316': f.type==='weak'?'#94a3b8':'#f87171' }}>
                          {f.type==='heal' ? `+${f.value}` : f.value}
                        </div>
                      ))}
                      <UnitDisplay unit={h} isEnemy={false} isActive={isActive}
                        canTarget={canTargetAlly} onTarget={onTargetSelect} shakingId={shakingId}/>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ display:'flex', gap:'80px', alignItems:'flex-end', minWidth:'200px' }}>
            {showDice ? (
              <div style={{ textAlign:'center' }}>
                <DiceSVG value={diceValue} rolling={phase==='ROLLING'}/>
                <div style={{ color:'#fbbf24', fontSize:'11px', fontWeight:'bold', marginTop:'6px',
                  animation:'hp-pulse 0.8s ease-in-out infinite', letterSpacing:'0.08em' }}>
                  {phase==='ROLLING' ? 'ROLLING…'
                    : diceValue<=2 ? '💨 WEAK ×0.5'
                    : diceValue<=4 ? '⚔ HIT ×1.0'
                    : diceValue===5 ? '💥 HEAVY ×1.2'
                    : '⚡ CRIT! ×1.5'}
                </div>
                <div style={{ color:'#57534e', fontSize:'9px', fontFamily:'monospace', marginTop:'2px' }}>[ {diceValue} ]</div>
              </div>
            ) : (phase==='WIN' || phase==='LOSE') ? (
              <div style={{ textAlign:'center', position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', zIndex:20 }}>
                <div style={{ fontSize:'3rem', fontWeight:'900', marginBottom:'8px',
                  color: phase==='WIN'?'#fbbf24':'#ef4444',
                  textShadow:`0 0 30px ${phase==='WIN'?'#fbbf24':'#ef4444'}` }}>
                  {phase==='WIN' ? '🏆 VICTORY' : '💀 DEFEAT'}
                </div>
                <button onClick={onFinishCombat} style={{
                  background:'#e7e5e4', color:'#1c1917', padding:'8px 24px', borderRadius:'999px',
                  fontWeight:'bold', border:'none', cursor:'pointer', fontSize:'13px',
                  boxShadow:'0 4px 14px rgba(0,0,0,0.5)' }}>
                {phase==='WIN' ? '← Back to Map' : '↺ Restart Adventure'}
                </button>
              </div>
            ) : (
              <div style={{ color:'rgba(255,255,255,0.08)', fontSize:'2rem', fontWeight:'900' }}>VS</div>
            )}
          </div>

          <div style={{ display:'flex', gap:'32px', alignItems:'flex-end', minWidth:'200px', justifyContent:'center' }}>
            {enemies.map(e => {
              const isActive = activeUnit?.id === e.id && !['WIN','LOSE','START'].includes(phase);
              const canTarget = phase==='AWAIT_TARGET' && e.hp > 0;
              return (
                <div key={e.id} style={{ position:'relative' }}
                  className={shakingId === e.id ? 'unit-shake' : ''}>
                  {floatingTexts.filter(f => f.unitId === e.id).map(f => (
                    <div key={f.id} className="float-text" style={{ top:'-10px',
                      color: f.type==='heal'?'#4ade80': f.type==='perfect'?'#fbbf24':
                             f.type==='crit'?'#f97316': f.type==='weak'?'#94a3b8':'#f87171' }}>
                      {f.type==='heal' ? `+${f.value}` : f.value}
                    </div>
                  ))}
                  <UnitDisplay unit={e} isEnemy={true} isActive={isActive}
                    canTarget={canTarget} onTarget={onTargetSelect} shakingId={shakingId}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ height:'150px', background:'rgba(12,10,9,0.97)',
        borderTop:'2px solid #292524', display:'flex', boxShadow:'0 -8px 24px rgba(0,0,0,0.6)' }}>

        <div style={{ flex:1, padding:'6px 10px', borderRight:'1px solid #292524',
          display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
            <span style={{ fontSize:'10px', fontWeight:'bold', color:'#57534e',
              textTransform:'uppercase', letterSpacing:'0.1em' }}>⚔ Actions</span>
            {isPlayerTurn && activeHero && (
              <span style={{ fontSize:'10px', color:'#f59e0b', animation:'hp-pulse 1.2s ease-in-out infinite',
                fontWeight:'bold' }}>{activeHero.name}'s Turn</span>
            )}
            {phase === 'ENEMY_TURN' && (
              <span style={{ fontSize:'10px', color:'#f87171', animation:'hp-pulse 1s ease-in-out infinite',
                fontWeight:'bold' }}>Enemy Acting…</span>
            )}
          </div>

          {phase === 'START' ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <button onClick={onStartBattle} style={{
                background:'linear-gradient(135deg, #d97706, #b45309)', color:'white',
                padding:'8px 28px', borderRadius:'10px', fontWeight:'bold', border:'none',
                cursor:'pointer', fontSize:'13px', boxShadow:'0 4px 16px rgba(217,119,6,0.5)',
                animation:'hp-pulse 1.2s ease-in-out infinite' }}>
                ▶ Start Battle
              </button>
            </div>
          ) : phase === 'AWAIT_TARGET' ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:'6px', background:'rgba(127,29,29,0.15)',
              border:'1px dashed rgba(248,113,113,0.4)', borderRadius:'10px' }}>
              <div style={{ color:'#f87171', fontWeight:'bold', fontSize:'12px' }}>🎯 Click an enemy to target</div>
              <button onClick={() => onSkillSelect(null)} style={{
                background:'rgba(28,25,23,0.8)', border:'1px solid #57534e', color:'#a8a29e',
                padding:'3px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'10px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', gap:'6px', overflow:'visible' }}>
              <div style={{ width:'55%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', overflow:'hidden' }}>
                {isPlayerTurn && activeHero ? (
                  activeSkills.length > 0 ? activeSkills.map((skill, idx) => {
                    const sc = SKILL_COLOR[skill.type] || SKILL_COLOR.attack;
                    return (
                      <button key={skill.id||idx} onClick={() => onSkillSelect(skill)}
                        style={{
                          display:'flex', alignItems:'center', gap:'6px', padding:'12px 10px',
                          borderRadius:'8px', border:`1.5px solid ${sc.border}`,
                          background: sc.bg, cursor:'pointer', textAlign:'left',
                          boxShadow:`0 2px 8px ${sc.border}28`, transition:'all 0.15s',
                          position:'relative', overflow:'hidden',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 0 12px ${sc.border}60`; e.currentTarget.style.transform='scale(1.02)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 2px 8px ${sc.border}28`; e.currentTarget.style.transform='scale(1)'; }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
                          background:`linear-gradient(to right, transparent, ${sc.border}80, transparent)` }}/>
                        <div style={{ fontSize:'14px', flexShrink:0 }}>{sc.icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:'bold', fontSize:'11px', color:'#f5f5f4',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{skill.name}</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'1px',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{skill.desc}</div>
                        </div>
                        <div style={{ fontSize:'11px', fontWeight:'bold', color: sc.border,
                          fontFamily:'monospace', flexShrink:0, opacity:0.75, textAlign:'right' }}>
                          {sc.label}<br/>{skill.power}
                        </div>
                      </button>
                    );
                  }) : (
                    <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center',
                      justifyContent:'center', color:'#44403c', fontSize:'11px' }}>
                      No weapon equipped
                    </div>
                  )
                ) : (
                  <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center',
                    justifyContent:'center', color:'#44403c', fontSize:'11px',
                    fontFamily:'monospace', letterSpacing:'0.08em' }}>
                    {phase==='ROLLING' ? '🎲 ROLLING…' : 'WAITING…'}
                  </div>
                )}
              </div>

              {isPlayerTurn && activeHero && (
                <div style={{ display:'flex', flexDirection:'column', gap:'5px', justifyContent:'center', flexShrink:0 }}>
                  <button
                    onClick={() => setModal({ type:'weapon', hero: activeHero })}
                    style={{
                      padding:'0 12px', height:'44px', borderRadius:'8px', cursor:'pointer',
                      background:'rgba(120,53,15,0.45)', border:'1.5px solid #d97706',
                      color:'#fde68a', fontWeight:'bold', fontSize:'11px',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:'2px', transition:'all 0.15s', whiteSpace:'nowrap',
                      boxShadow:'0 2px 8px rgba(217,119,6,0.25)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 12px rgba(217,119,6,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(217,119,6,0.25)'}>
                    <span style={{ fontSize:'14px' }}>⚔</span>
                    <span>Weapon</span>
                  </button>
                  <button
                    onClick={() => setModal({ type:'item', hero: activeHero })}
                    style={{
                      padding:'0 12px', height:'44px', borderRadius:'8px', cursor:'pointer',
                      background:'rgba(6,78,59,0.45)', border:'1.5px solid #34d399',
                      color:'#a7f3d0', fontWeight:'bold', fontSize:'11px',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:'2px', transition:'all 0.15s', whiteSpace:'nowrap',
                      boxShadow:'0 2px 8px rgba(52,211,153,0.2)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 12px rgba(52,211,153,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(52,211,153,0.2)'}>
                    <span style={{ fontSize:'14px' }}>🧪</span>
                    <span>Item</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ width:'260px', flexShrink:0, padding:'12px 14px',
          display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize:'10px', fontWeight:'bold', color:'#57534e',
            textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>📜 Log</div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px' }}>
            {(logs||[]).map((log, i) => (
              <div key={i} style={{
                fontSize:'10px', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.04)',
                color: i===0 ? '#fef3c7' : '#57534e', fontWeight: i===0 ? '600' : '400',
                lineHeight: 1.4,
              }}>
                <span style={{ opacity:0.25, marginRight:'4px' }}>[{(logs.length)-i}]</span>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.renderCombatUI = function(containerId, combatState, callbacks) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!window.combatRoot) window.combatRoot = ReactDOM.createRoot(container);
  window.combatRoot.render(<CombatApp state={combatState} callbacks={callbacks}/>);
};
window.unmountCombatUI = function() {
  if (window.combatRoot) { window.combatRoot.unmount(); window.combatRoot = null; }
};