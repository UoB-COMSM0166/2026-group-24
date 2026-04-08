// src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;
  static weaponMap = null;
  static trinketMap = null;  // ★ 新增：饰品数据 Map ★
  static images = {};
  static audio = {};

  // 存储角色序列帧动画 [heroId][action]
  static animations = {
      knight: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      priest: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      ranger: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      wizard: { idle: null, hit: null, death: null, attack1: null, attack2: null }
    };

  static async loadAll() {
    // 1. 加载 JSON 数据
    const [heroRes, skillRes, weaponRes] = await Promise.all([
      fetch('./src/data/heroes.json'),
      fetch('./src/data/skills.json'),
      fetch('./src/data/weapons.json')
    ]);

    const heroData   = await heroRes.json();
    const skillData  = await skillRes.json();
    const weaponData = await weaponRes.json();

    this.heroMap   = new Map(heroData.heroes.map(h => [h.id, h]));
    this.skillMap  = new Map(skillData.skills.map(s => [s.id, s]));
    this.weaponMap = new Map((weaponData.weapons || []).map(w => [w.id, w]));

    // --- 动画资源加载工具 ---
    const loadImg = (path) => new Promise(res => {
      const img = new Image();
      img.src = path;
      img.onload = () => res(img);
      img.onerror = () => res(null);
    });

    // 2. 预加载基础图像资源
    const imagePaths = {
      'village': 'resource/img/map/chapter1/village.png',
      'merchant': 'resource/img/map/chapter1/merchant.png',
      'ruin': 'resource/img/map/chapter1/ruins.png',
      'portal': 'resource/img/map/chapter1/portal.png',
      'hero': './resource/img/normal/hero.png',
      'altar': './resource/img/map/chapter1/altar.png',
      'boss': './resource/img/map/chapter1/boss.png',
      'dungeon': './resource/img/map/chapter1/dungeon.png',
      'treasure': './resource/img/map/chapter1/treasure.png',
      'lighthouse': './resource/img/map/chapter1/lighthouse.png',
      'background': './resource/img/map/chapter1/background.png',
      'outset1': './resource/img/map/chapter1/outset1.png',
      'outset2': './resource/img/map/chapter1/outset2.png',
      'elder': './resource/img/avatar/elder.png',
      'grass_1': './resource/img/map/chapter1/grass_1.png',
      'grass_2': './resource/img/map/chapter1/grass_2.png',
      'grass_3': './resource/img/map/chapter1/grass_3.png',
      'grass_4': './resource/img/map/chapter1/grass_4.png',
      'forest_1': './resource/img/map/chapter1/barrier_3.png',
      'forest_2': './resource/img/map/chapter1/barrier_3.png',
      'forest_3': './resource/img/map/chapter1/barrier_4.png',
      'forest_4': './resource/img/map/chapter1/barrier_4.png',
      'corruptedDeer': './resource/img/map/chapter1/forest.png',
      'injuredVillager': './resource/img/map/chapter1/villager.png',
      'mountain_1': './resource/img/map/chapter1/barrier_1.png',
      'mountain_2': './resource/img/map/chapter1/barrier_1.png',
      'mountain_3': './resource/img/map/chapter1/barrier_2.png',
      'mountain_4': './resource/img/map/chapter1/barrier_2.png',
      'boundary_1': './resource/img/map/chapter1/barrier_1.png',
      'boundary_2': './resource/img/map/chapter1/barrier_1.png',
      'boundary_3': './resource/img/map/chapter1/barrier_2.png',
      'boundary_4': './resource/img/map/chapter1/barrier_2.png',
      'barrier_1': './resource/img/map/chapter1/barrier_1.png',
      'barrier_2': './resource/img/map/chapter1/barrier_2.png',
      'barrier_3': './resource/img/map/chapter1/barrier_3.png',
      'barrier_4': './resource/img/map/chapter1/barrier_4.png',
      'bracelet':       './resource/img/items/daifu.png',
      'ring_strength':  './resource/img/items/daifu.png',
      'ring_intellect': './resource/img/items/daifu.png',
      'weapon_blade':  './resource/img/items/daifu.png',
      'weapon_staff':  './resource/img/items/daifu.png',
      'weapon_tome':   './resource/img/items/daifu.png',
      'weapon_bow':    './resource/img/items/daifu.png',
      'weapon_fist':   './resource/img/items/daifu.png',
      'traveler_set':      './resource/img/items/daifu.png',
      'star_cloak':        './resource/img/items/daifu.png',
      'bloodthirst_mask':  './resource/img/items/daifu.png',
    };

    // --- 动画加载任务 (英雄序列帧) ---
    const animConfig = {
          knight: { idle: 8, hit: 6, death: 13, run: 8, attack1: 11, attack2: 19, attack3: 28 },
          priest: { idle: 6, hit: 6, death: 18, run: 8, attack1: 6, attack2: 12, attack3: 23 },
          ranger: { idle: 12, hit: 6, death: 19, run: 10, attack1: 10, attack2: 15, attack3: 12 }
        };

    const animTasks = [];

    // 加载 Knight, Priest, Ranger
    Object.entries(animConfig).forEach(([hero, actions]) => {
      Object.entries(actions).forEach(([action, count]) => {
              // Build folder path and file prefix based on action type
              let folder, prefix;
              if (action === 'idle')          { folder = 'Idle';              prefix = 'idle_'; }
              else if (action === 'hit')      { folder = 'Hit';              prefix = 'take_hit_'; }
              else if (action === 'death')    { folder = 'Death';            prefix = 'death_'; }
              else if (action === 'run')      { folder = 'Run';              prefix = 'run_'; }
              else if (action === 'attack1')  { folder = 'Attack/Attack_1';  prefix = '1_atk_'; }
              else if (action === 'attack2')  { folder = 'Attack/Attack_2';  prefix = '2_atk_'; }
              else if (action === 'attack3')  { folder = 'Attack/Attack_3';  prefix = '3_atk_'; }

              const task = Promise.all(
                Array.from({length:count}, (_,i) => loadImg(`./resource/model/${hero}/${folder}/${prefix}${i+1}.png`))
              ).then(imgs => {
                this.animations[hero][action] = imgs.filter(Boolean);
              });
              animTasks.push(task);
            });
    });

    // 加载 Wizard (精灵图)
    animTasks.push(loadImg('./resource/model/wizard/Idle/Idle.png').then(img => { this.animations.wizard.idle = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Hit/Hit.png').then(img => { this.animations.wizard.hit = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Death/Death.png').then(img => { this.animations.wizard.death = img; }));
    // Wizard attack sprite sheets (8 frames each, horizontal)
        animTasks.push(loadImg('./resource/model/wizard/Attack/Attack1.png').then(img => { this.animations.wizard.attack1 = img; }));
        animTasks.push(loadImg('./resource/model/wizard/Attack/Attack2.png').then(img => { this.animations.wizard.attack2 = img; }));

    // 基础图片加载
    const imagePromises = Object.entries(imagePaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => { this.images[name] = img; resolve(); };
        img.onerror = () => resolve();
      });
    });

    // 音频加载
    const audioPaths = {
      'map_bgm': './resource/music/map.mp3',
      'fight_bgm': './resource/music/fight.mp3'
    };

    const audioPromises = Object.entries(audioPaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = path;
        audio.loop = true;
        audio.oncanplaythrough = () => { this.audio[name] = audio; resolve(); };
        audio.onerror = () => resolve();
        audio.load();
      });
    });

    await Promise.all([...imagePromises, ...audioPromises, ...animTasks]);
    console.log('[DataLoader] All assets and animations loaded');
  }

  // 修正：支持获取指定动作的动画
  static getAnim(key, action = 'idle') { 
    return this.animations[key] ? this.animations[key][action] : null; 
  }
  static getHero(id)    { return this.heroMap?.get(id)   ?? null; }
  static getSkill(id)   { return this.skillMap?.get(id)  ?? null; }
  static getWeapon(id)  { return this.weaponMap?.get(id) ?? null; }
  static getImage(name) { return this.images[name] || null; }
  static getAudio(name) { return this.audio[name]  || null; }
  static getAllHeroes()  { return this.heroMap   ? [...this.heroMap.values()]   : []; }
  static getAllWeapons() { return this.weaponMap ? [...this.weaponMap.values()] : []; }
}
window.DataLoader = DataLoader;