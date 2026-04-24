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

  static enemyAnimations = {
    stone_golem: { idle: [], hit: [], death: [], run: [], attack: [] },
    dark_overlord: { idle: null, hit: null, death: null, run: null, attack: null, single: null, group: null, prey: null, heal: null },
    elite: { idle: [], hit: [], death: [], run: [], attack: [] },
    healer: { idle: [], hit: [], death: [], run: [], attack: [], heal: [] },
    warrior: { idle: null, hit: null, death: null, run: null, attack: null },
    swift_assassin: { idle: null, hit: null, death: null, run: null, attack: null },
    mage: { idle: null, hit: null, death: null, run: null, attack: null }
  };

  static getEnemyAnim(key, action = 'idle') {
    const actualKey = key === 'stone-golem' ? 'stone_golem' : key;
    return this.enemyAnimations[actualKey] ? this.enemyAnimations[actualKey][action] : null;
  }

  static async loadAll(onProgress = null) {
    const progressCallback = typeof onProgress === 'function' ? onProgress : () => {};
    let heroData = null;
    let skillData = null;
    let weaponData = null;

    this.images = {};
    this.audio = {};
    this.animations = {
      knight: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      priest: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      ranger: { idle: [], hit: [], death: [], run: [], attack1: [], attack2: [], attack3: [] },
      wizard: { idle: null, hit: null, death: null, attack1: null, attack2: null }
    };
    this.enemyAnimations = {
      stone_golem: { idle: [], hit: [], death: [], run: [], attack: [] },
      dark_overlord: { idle: null, hit: null, death: null, run: null, attack: null, single: null, group: null, prey: null, heal: null },
      elite: { idle: [], hit: [], death: [], run: [], attack: [] },
      healer: { idle: [], hit: [], death: [], run: [], attack: [], heal: [] },
      warrior: { idle: null, hit: null, death: null, run: null, attack: null },
      swift_assassin: { idle: null, hit: null, death: null, run: null, attack: null },
      mage: { idle: null, hit: null, death: null, run: null, attack: null }
    };

    const reportProgress = (completed, total) => {
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;
      progressCallback({ completed, total, percentage });
    };

    const taskFactories = [];
    const queueTask = (factory) => {
      taskFactories.push(factory);
    };

    const loadImg = (path) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = path;
    });

    const loadAudio = (path) => new Promise((resolve) => {
      const audio = new Audio();
      audio.src = path;
      audio.loop = true;
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => resolve(null);
      audio.load();
    });

    queueTask(async () => {
      heroData = await (await fetch('./src/data/heroes.json')).json();
    });
    queueTask(async () => {
      skillData = await (await fetch('./src/data/skills.json')).json();
    });
    queueTask(async () => {
      weaponData = await (await fetch('./src/data/weapons.json')).json();
    });

    const imagePaths = {
      village: 'resource/img/map/chapter1/village.png',
      merchant: 'resource/img/map/chapter1/merchant.png',
      shop: 'resource/img/map/chapter1/merchant.png',
      ruin: 'resource/img/map/chapter1/ruins.png',
      portal: 'resource/img/map/chapter1/portal.png',
      hero: './resource/img/normal/hero.png',
      altar: './resource/img/map/chapter1/altar.png',
      boss: './resource/img/map/chapter1/boss.png',
      dungeon: './resource/img/map/chapter1/dungeon.png',
      treasure: './resource/img/map/chapter1/treasure.png',
      lighthouse: './resource/img/map/chapter1/lighthouse.png',
      background: './resource/img/map/chapter1/background.png',
      outset1: './resource/img/map/chapter1/outset1.png',
      outset2: './resource/img/map/chapter1/outset2.png',
      elder: './resource/img/avatar/elder.png',
      grass_1: './resource/img/map/chapter1/grass_1.png',
      grass_2: './resource/img/map/chapter1/grass_2.png',
      grass_3: './resource/img/map/chapter1/grass_3.png',
      grass_4: './resource/img/map/chapter1/grass_4.png',
      forest_1: './resource/img/map/chapter1/barrier_3.png',
      forest_2: './resource/img/map/chapter1/barrier_3.png',
      forest_3: './resource/img/map/chapter1/barrier_4.png',
      forest_4: './resource/img/map/chapter1/barrier_4.png',
      corruptedDeer: './resource/img/map/chapter1/forest.png',
      injuredVillager: './resource/img/map/chapter1/villager.png',
      mountain_1: './resource/img/map/chapter1/barrier_1.png',
      mountain_2: './resource/img/map/chapter1/barrier_1.png',
      mountain_3: './resource/img/map/chapter1/barrier_2.png',
      mountain_4: './resource/img/map/chapter1/barrier_2.png',
      boundary_1: './resource/img/map/chapter1/barrier_1.png',
      boundary_2: './resource/img/map/chapter1/barrier_1.png',
      boundary_3: './resource/img/map/chapter1/barrier_2.png',
      boundary_4: './resource/img/map/chapter1/barrier_2.png',
      barrier_1: './resource/img/map/chapter1/barrier_1.png',
      barrier_2: './resource/img/map/chapter1/barrier_2.png',
      barrier_3: './resource/img/map/chapter1/barrier_3.png',
      barrier_4: './resource/img/map/chapter1/barrier_4.png',
      bracelet: './resource/img/items/swift_bracelet.png',
      ring_strength: './resource/img/items/ring_of_strength.png',
      ring_intellect: './resource/img/items/ring_of_intellect.png',
      weapon_iron_sword: './resource/img/items/iron_sword.png',
      weapon_knight_sword: './resource/img/items/knight_sword.png',
      weapon_lava_sword: './resource/img/items/lava_sword.png',
      weapon_dragon_sword: './resource/img/items/dragon_sword.png',
      weapon_old_staff: './resource/img/items/old_staff.png',
      weapon_element_staff: './resource/img/items/element_staff.png',
      weapon_thunder_staff: './resource/img/items/thunder_staff.png',
      weapon_abyss_tome: './resource/img/items/abyss_tome.png',
      weapon_bare_fist: './resource/img/items/bare_fist.png',
      weapon_iron_gauntlet: './resource/img/items/iron_gauntlet.png',
      weapon_earth_gauntlet: './resource/img/items/earth_gauntlet.png',
      weapon_mountain_fist: './resource/img/items/mountain_fist.png',
      weapon_hunter_bow: './resource/img/items/hunter_bow.png',
      weapon_elf_bow: './resource/img/items/elf_bow.png',
      weapon_vine_bow: './resource/img/items/vine_bow.png',
      weapon_world_tree_bow: './resource/img/items/world_tree_bow.png',
      traveler_set: './resource/img/items/traveler_set.png',
      star_cloak: './resource/img/items/star_cloak.png',
      bloodthirst_mask: './resource/img/items/bloodthirst_mask.png',
      lion_heart: './resource/img/items/lion_heart.png',
      cursed_codex: './resource/img/items/cursed_codex.png',
      eagle_eye: './resource/img/items/eagle_eye.png',
      holy_spirit_heart: './resource/img/items/holy_spirit_heart.png',
    };

    const animConfig = {
      knight: { idle: 8, hit: 6, death: 13, run: 8, attack1: 11, attack2: 19, attack3: 28 },
      priest: { idle: 6, hit: 6, death: 18, run: 8, attack1: 6, attack2: 12, attack3: 23 },
      ranger: { idle: 12, hit: 6, death: 19, run: 10, attack1: 10, attack2: 15, attack3: 12 }
    };

    Object.entries(animConfig).forEach(([hero, actions]) => {
      Object.entries(actions).forEach(([action, count]) => {
        let folder = '';
        let prefix = '';
        if (action === 'idle') { folder = 'Idle'; prefix = 'idle_'; }
        else if (action === 'hit') { folder = 'Hit'; prefix = 'take_hit_'; }
        else if (action === 'death') { folder = 'Death'; prefix = 'death_'; }
        else if (action === 'run') { folder = 'Run'; prefix = 'run_'; }
        else if (action === 'attack1') { folder = 'Attack/Attack_1'; prefix = '1_atk_'; }
        else if (action === 'attack2') { folder = 'Attack/Attack_2'; prefix = '2_atk_'; }
        else if (action === 'attack3') { folder = 'Attack/Attack_3'; prefix = '3_atk_'; }

        this.animations[hero][action] = new Array(count).fill(null);
        for (let i = 0; i < count; i++) {
          const frameIndex = i;
          queueTask(async () => {
            const img = await loadImg(`./resource/model/${hero}/${folder}/${prefix}${frameIndex + 1}.png`);
            this.animations[hero][action][frameIndex] = img;
          });
        }
      });
    });

    queueTask(async () => { this.animations.wizard.idle = await loadImg('./resource/model/wizard/Idle/Idle.png'); });
    queueTask(async () => { this.animations.wizard.hit = await loadImg('./resource/model/wizard/Hit/Hit.png'); });
    queueTask(async () => { this.animations.wizard.death = await loadImg('./resource/model/wizard/Death/Death.png'); });
    queueTask(async () => { this.animations.wizard.attack1 = await loadImg('./resource/model/wizard/Attack/Attack1.png'); });
    queueTask(async () => { this.animations.wizard.attack2 = await loadImg('./resource/model/wizard/Attack/Attack2.png'); });

    const golemConfig = { idle: 6, hit: 5, death: 22, run: 12, attack: 15 };
    Object.entries(golemConfig).forEach(([action, count]) => {
      let folder = '';
      let prefix = '';
      if (action === 'idle') { folder = 'Idle'; prefix = 'demon_idle_'; }
      else if (action === 'hit') { folder = 'Hit'; prefix = 'demon_take_hit_'; }
      else if (action === 'death') { folder = 'Death'; prefix = 'demon_death_'; }
      else if (action === 'run') { folder = 'Run'; prefix = 'demon_walk_'; }
      else if (action === 'attack') { folder = 'Attack'; prefix = 'demon_cleave_'; }

      this.enemyAnimations.stone_golem[action] = new Array(count).fill(null);
      for (let i = 0; i < count; i++) {
        const frameIndex = i;
        queueTask(async () => {
          const img = await loadImg(`./resource/model/enemy/stone-golem/${folder}/${prefix}${frameIndex + 1}.png`);
          this.enemyAnimations.stone_golem[action][frameIndex] = img;
        });
      }
    });

    const eliteConfig = { idle: 8, hit: 6, death: 19, run: 8, attack: 26 };
    Object.entries(eliteConfig).forEach(([action, count]) => {
      let folder = '';
      let prefix = '';
      if (action === 'idle') { folder = 'Idle'; prefix = 'idle_'; }
      else if (action === 'hit') { folder = 'Hit'; prefix = 'take_hit_'; }
      else if (action === 'death') { folder = 'Death'; prefix = 'death_'; }
      else if (action === 'run') { folder = 'Run'; prefix = 'run_'; }
      else if (action === 'attack') { folder = 'Attack'; prefix = '3_atk_'; }

      this.enemyAnimations.elite[action] = new Array(count).fill(null);
      for (let i = 0; i < count; i++) {
        const frameIndex = i;
        queueTask(async () => {
          const img = await loadImg(`./resource/model/enemy/elite/${folder}/${prefix}${frameIndex + 1}.png`);
          this.enemyAnimations.elite[action][frameIndex] = img;
        });
      }
    });

    const healerConfig = { idle: 8, hit: 7, death: 16, run: 10, attack: 7, heal: 12 };
    Object.entries(healerConfig).forEach(([action, count]) => {
      let folder = '';
      let prefix = '';
      if (action === 'idle') { folder = 'Idle'; prefix = 'idle_'; }
      else if (action === 'hit') { folder = 'Hit'; prefix = 'take_hit_'; }
      else if (action === 'death') { folder = 'Death'; prefix = 'death_'; }
      else if (action === 'run') { folder = 'Run'; prefix = 'walk_'; }
      else if (action === 'attack') { folder = 'Attack/attack'; prefix = '1_atk_'; }
      else if (action === 'heal') { folder = 'Attack/heal'; prefix = 'heal_'; }

      this.enemyAnimations.healer[action] = new Array(count).fill(null);
      for (let i = 0; i < count; i++) {
        const frameIndex = i;
        queueTask(async () => {
          const img = await loadImg(`./resource/model/enemy/healer/${folder}/${prefix}${frameIndex + 1}.png`);
          this.enemyAnimations.healer[action][frameIndex] = img;
        });
      }
    });

    const enemySpriteConfig = {
      dark_overlord: {
        idle: 'Idle/Idle.png',
        hit: 'Hit/Hurt.png',
        death: 'Death/Death.png',
        run: 'Run/Run.png',
        attack: 'Attack/sigle/crouch_attacks.png',
        single: 'Attack/sigle/crouch_attacks.png',
        group: 'Attack/group/attack_from_air.png',
        prey: 'Attack/prey/Pray.png',
        heal: 'Attack/heal/heal.png'
      },
      warrior: { idle: 'Idle/Idle.png', hit: 'Hit/Take Hit.png', death: 'Death/Death.png', run: 'Run/Walk.png', attack: 'Attack/Attack.png' },
      swift_assassin: { idle: 'Idle/Idle.png', hit: 'Hit/Take hit.png', death: 'Death/Death.png', run: 'Run/Run.png', attack: 'Attack/Attack2.png' },
      mage: { idle: 'Idle/Idle.png', hit: 'Hit/Take Hit.png', death: 'Death/Death.png', run: 'Run/Run.png', attack: 'Attack/Attack.png' }
    };

    Object.entries(enemySpriteConfig).forEach(([enemy, actions]) => {
      Object.entries(actions).forEach(([action, path]) => {
        const assetRoot = enemy === 'dark_overlord' ? 'legendary_knight' : enemy;
        queueTask(async () => {
          this.enemyAnimations[enemy][action] = await loadImg(`./resource/model/enemy/${assetRoot}/${path}`);
        });
      });
    });

    Object.entries(imagePaths).forEach(([name, path]) => {
      queueTask(async () => {
        const img = await loadImg(path);
        if (img) this.images[name] = img;
      });
    });

    const audioPaths = {
      map_bgm: './resource/music/map.mp3',
      fight_bgm: './resource/music/fight.mp3'
    };

    Object.entries(audioPaths).forEach(([name, path]) => {
      queueTask(async () => {
        const audio = await loadAudio(path);
        if (audio) this.audio[name] = audio;
      });
    });

    const totalTasks = taskFactories.length;
    let completedTasks = 0;
    reportProgress(0, totalTasks);

    await Promise.all(taskFactories.map((factory) => (
      factory().finally(() => {
        completedTasks += 1;
        reportProgress(completedTasks, totalTasks);
      })
    )));

    this.heroMap = new Map((heroData?.heroes || []).map((hero) => [hero.id, hero]));
    this.skillMap = new Map((skillData?.skills || []).map((skill) => [skill.id, skill]));
    this.weaponMap = new Map((weaponData?.weapons || []).map((weapon) => [weapon.id, weapon]));

    Object.entries(animConfig).forEach(([hero, actions]) => {
      Object.keys(actions).forEach((action) => {
        this.animations[hero][action] = this.animations[hero][action].filter(Boolean);
      });
    });
    Object.keys(golemConfig).forEach((action) => {
      this.enemyAnimations.stone_golem[action] = this.enemyAnimations.stone_golem[action].filter(Boolean);
    });
    Object.keys(eliteConfig).forEach((action) => {
      this.enemyAnimations.elite[action] = this.enemyAnimations.elite[action].filter(Boolean);
    });
    Object.keys(healerConfig).forEach((action) => {
      this.enemyAnimations.healer[action] = this.enemyAnimations.healer[action].filter(Boolean);
    });

    console.log('[DataLoader] All assets and animations loaded');
  }

  static getAnim(key, action = 'idle') {
    return this.animations[key] ? this.animations[key][action] : null;
  }

  static getHero(id) {
    return this.heroMap?.get(id) ?? null;
  }

  static getSkill(id) {
    return this.skillMap?.get(id) ?? null;
  }

  static getWeapon(id) {
    return this.weaponMap?.get(id) ?? null;
  }

  static getImage(name) {
    return this.images[name] || null;
  }

  static getAudio(name) {
    return this.audio[name] || null;
  }

  static getAllHeroes() {
    return this.heroMap ? [...this.heroMap.values()] : [];
  }

  static getAllWeapons() {
    return this.weaponMap ? [...this.weaponMap.values()] : [];
  }
}

window.DataLoader = DataLoader;
