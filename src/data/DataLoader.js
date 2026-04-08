// src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;
  static weaponMap = null;
  static trinketMap = null;  
  static images = {};
  static audio = {};

  static animations = {
      knight: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      priest: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      ranger: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      wizard: { idle: null, hit: null, death: null, attack1: null, attack2: null }
  };

  // ★ 新增：存储敌人的动画资源
  static enemyAnimations = {
      stone_golem: { idle: [], hit: [], death: [], run: [], attack: [] },
      elite: { idle: [], hit: [], death: [], run: [], attack: [] },
      healer: { idle: [], hit: [], death: [], run: [], attack: [], heal: [] },
      warrior: { idle: null, hit: null, death: null, run: null, attack: null },
      swift_assassin: { idle: null, hit: null, death: null, run: null, attack: null },
      mage: { idle: null, hit: null, death: null, run: null, attack: null }
  };

  // ★ 新增：获取敌人动画的方法
  static getEnemyAnim(key, action = 'idle') {
      let actualKey = key === 'stone-golem' ? 'stone_golem' : key;
      return this.enemyAnimations[actualKey] ? this.enemyAnimations[actualKey][action] : null;
  }

  static async loadAll() {
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

    const loadImg = (path) => new Promise(res => {
      const img = new Image();
      img.src = path;
      img.onload = () => res(img);
      img.onerror = () => res(null);
    });

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

    const animConfig = {
          knight: { idle: 8, hit: 6, death: 13, run: 8, attack1: 11, attack2: 19, attack3: 28 },
          priest: { idle: 6, hit: 6, death: 18, run: 8, attack1: 6, attack2: 12, attack3: 23 },
          ranger: { idle: 12, hit: 6, death: 19, run: 10, attack1: 10, attack2: 15, attack3: 12 }
        };

    const animTasks = [];

    Object.entries(animConfig).forEach(([hero, actions]) => {
      Object.entries(actions).forEach(([action, count]) => {
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

    animTasks.push(loadImg('./resource/model/wizard/Idle/Idle.png').then(img => { this.animations.wizard.idle = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Hit/Hit.png').then(img => { this.animations.wizard.hit = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Death/Death.png').then(img => { this.animations.wizard.death = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Attack/Attack1.png').then(img => { this.animations.wizard.attack1 = img; }));
    animTasks.push(loadImg('./resource/model/wizard/Attack/Attack2.png').then(img => { this.animations.wizard.attack2 = img; }));

    // ★ 新增：加载敌人 Stone Golem 序列帧动画 ★
    const golemConfig = { idle: 6, hit: 5, death: 22, run: 12, attack: 15 };
    Object.entries(golemConfig).forEach(([action, count]) => {
        let folder, prefix;
        if (action === 'idle') { folder = 'Idle'; prefix = 'demon_idle_'; }
        else if (action === 'hit') { folder = 'Hit'; prefix = 'demon_take_hit_'; }
        else if (action === 'death') { folder = 'Death'; prefix = 'demon_death_'; }
        else if (action === 'run') { folder = 'Run'; prefix = 'demon_walk_'; }
        else if (action === 'attack') { folder = 'Attack'; prefix = 'demon_cleave_'; }

        const task = Promise.all(
            Array.from({length: count}, (_, i) => loadImg(`./resource/model/enemy/stone-golem/${folder}/${prefix}${i+1}.png`))
        ).then(imgs => {
            this.enemyAnimations.stone_golem[action] = imgs.filter(Boolean);
        });
        animTasks.push(task);
    });

    // ★ 新增：加载其余敌人的单张精灵图 (Sprite Sheets) ★
    const eliteConfig = { idle: 8, hit: 6, death: 19, run: 8, attack: 26 };
    Object.entries(eliteConfig).forEach(([action, count]) => {
        let folder, prefix;
        if (action === 'idle') { folder = 'Idle'; prefix = 'idle_'; }
        else if (action === 'hit') { folder = 'Hit'; prefix = 'take_hit_'; }
        else if (action === 'death') { folder = 'Death'; prefix = 'death_'; }
        else if (action === 'run') { folder = 'Run'; prefix = 'run_'; }
        else if (action === 'attack') { folder = 'Attack'; prefix = '3_atk_'; }

        const task = Promise.all(
            Array.from({length: count}, (_, i) => loadImg(`./resource/model/enemy/elite/${folder}/${prefix}${i+1}.png`))
        ).then(imgs => {
            this.enemyAnimations.elite[action] = imgs.filter(Boolean);
        });
        animTasks.push(task);
    });

    const healerConfig = { idle: 8, hit: 7, death: 16, run: 10, attack: 7, heal: 12 };
    Object.entries(healerConfig).forEach(([action, count]) => {
        let folder, prefix;
        if (action === 'idle') { folder = 'Idle'; prefix = 'idle_'; }
        else if (action === 'hit') { folder = 'Hit'; prefix = 'take_hit_'; }
        else if (action === 'death') { folder = 'Death'; prefix = 'death_'; }
        else if (action === 'run') { folder = 'Run'; prefix = 'walk_'; }
        else if (action === 'attack') { folder = 'Attack/attack'; prefix = '1_atk_'; }
        else if (action === 'heal') { folder = 'Attack/heal'; prefix = 'heal_'; }

        const task = Promise.all(
            Array.from({length: count}, (_, i) => loadImg(`./resource/model/enemy/healer/${folder}/${prefix}${i+1}.png`))
        ).then(imgs => {
            this.enemyAnimations.healer[action] = imgs.filter(Boolean);
        });
        animTasks.push(task);
    });

    const enemySpriteConfig = {
        warrior: { idle: 'Idle/Idle.png', hit: 'Hit/Take Hit.png', death: 'Death/Death.png', run: 'Run/Walk.png', attack: 'Attack/Attack.png' },
        swift_assassin: { idle: 'Idle/Idle.png', hit: 'Hit/Take hit.png', death: 'Death/Death.png', run: 'Run/Run.png', attack: 'Attack/Attack2.png' },
        mage: { idle: 'Idle/Idle.png', hit: 'Hit/Take Hit.png', death: 'Death/Death.png', run: 'Run/Run.png', attack: 'Attack/Attack.png' }
    };

    Object.entries(enemySpriteConfig).forEach(([enemy, actions]) => {
        Object.entries(actions).forEach(([action, path]) => {
            animTasks.push(loadImg(`./resource/model/enemy/${enemy}/${path}`).then(img => {
                this.enemyAnimations[enemy][action] = img;
            }));
        });
    });

    const imagePromises = Object.entries(imagePaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => { this.images[name] = img; resolve(); };
        img.onerror = () => resolve();
      });
    });

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
