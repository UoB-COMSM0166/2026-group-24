// src/core/CombatManager.js
import { rollAttack } from './Dice.js';

// ── Status effect definitions ─────────────────────────────────────────────────
// burn       : lose 5% maxHp per turn for 3 turns (fire)
// frozen     : skip next turn (ice)
// shock      : next damage received +30% for 2 turns (thunder)
// poison     : lose 10 flat HP per turn for 3 turns (nature/toxic)
// entangle   : cannot evade, damage received +20% for 2 turns (wood)
// rock_shield: reduce next incoming damage by 50% (earth/block)
// warcry     : own ATK +25% for 2 turns (knight buff)
// heal_aura  : regen 8% maxHp per turn for 3 turns (priest buff)
// anti_heal  : cannot recover HP for 2 turns (assassin debuff)  ← hub新增

export class CombatManager {
  constructor(heroes, enemies, ui) {
    this.heroes = heroes;
    this.enemies = enemies;
    this.ui = ui;
    this.phase = 'START';
    this.turnOrder = [];
    this.activeUnit = null;
    this.logs = ['Battle Start! Encountered enemies!'];
    this.diceInfo = null;
    this.currentAction = null;
  }

  addLog(text) {
    this.logs.unshift(text);
    if (this.logs.length > 10) this.logs.pop();
  }

  notifyUI() {
    if (this.ui.updateCombatUI) this.ui.updateCombatUI(this);
  }

  init() {
    this.turnOrder = [...this.heroes, ...this.enemies]
        .sort((a, b) => (b.speed || 0) - (a.speed || 0));
    for (const hero of this.heroes) {
      const hasStarCloak = (hero.equipSlots ?? []).some(item => item?.effect === 'damage_immune_2');
      if (hasStarCloak) {
        hero.starCloakCharges = 2;
        this.addLog(`✨ ${hero.name}'s Star Cloak activates! First 2 hits will be blocked.`);
      }
    }
    this.nextTurn();
  }

  _isAlive(unit) {
    return unit && (typeof unit.isAlive === 'function' ? unit.isAlive() : unit.hp > 0);
  }

  // ── Apply status effect to a unit ────────────────────────────────
  _applyStatus(unit, effectId) {
    if (!unit || !effectId) return;
    unit.statusEffects = unit.statusEffects || {};

    switch (effectId) {
      case 'burn':
        unit.statusEffects.burn = 3;
        this.addLog(`🔥 ${unit.name} is Burning! (3 turns)`);
        break;
      case 'frozen':
        unit.statusEffects.frozen = 1;
        this.addLog(`❄️ ${unit.name} is Frozen! (1 turn)`);
        break;
      case 'shock':
        unit.statusEffects.shock = 2;
        this.addLog(`⚡ ${unit.name} is Shocked! Damage taken +30% (2 turns)`);
        break;
      case 'poison':
        unit.statusEffects.poison = 3;
        this.addLog(`☠️ ${unit.name} is Poisoned! (3 turns)`);
        break;
      case 'entangle':
        unit.statusEffects.entangle = 2;
        this.addLog(`🌿 ${unit.name} is Entangled! Damage taken +20% (2 turns)`);
        break;
      case 'rock_shield':
        unit.statusEffects.rock_shield = 1;
        this.addLog(`🛡️ ${unit.name} raises a Rock Shield! Next hit -50%`);
        break;
      case 'warcry':
        unit.statusEffects.warcry = 2;
        this.addLog(`📣 ${unit.name} lets out a Battle Cry! ATK +25% (2 turns)`);
        break;
      case 'heal_aura':
        unit.statusEffects.heal_aura = 3;
        this.addLog(`💚 ${unit.name} channels Heal Aura! Regen 8% HP/turn (3 turns)`);
        break;
        // ── hub新增：禁疗 ────────────────────────────────────────────
      case 'anti_heal':
        unit.statusEffects.anti_heal = 2;
        this.addLog(`🚫 ${unit.name} is Wounded! Cannot recover HP! (2 turns)`);
        break;
    }
  }

  // ── Tick status effects at start of a unit's turn ─────────────────
  _tickStatus(unit) {
    if (!unit.statusEffects) return;
    const fx = unit.statusEffects;

    // Burn: 5% maxHp damage per turn
    if (fx.burn > 0) {
      const dmg = Math.max(1, Math.floor(unit.maxHp * 0.05));
      unit.hp = Math.max(0, unit.hp - dmg);
      fx.burn--;
      this.addLog(`🔥 ${unit.name} takes ${dmg} burn damage! (${fx.burn} turns left)`);
      if (fx.burn <= 0) delete fx.burn;
    }

    // Poison: 10 flat HP per turn
    if (fx.poison > 0) {
      const dmg = 10;
      unit.hp = Math.max(0, unit.hp - dmg);
      fx.poison--;
      this.addLog(`☠️ ${unit.name} takes ${dmg} poison damage! (${fx.poison} turns left)`);
      if (fx.poison <= 0) delete fx.poison;
    }

    // Heal aura: 8% maxHp regen per turn
    if (fx.heal_aura > 0) {
      const heal = Math.max(1, Math.floor(unit.maxHp * 0.08));
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      fx.heal_aura--;
      this.addLog(`💚 ${unit.name} regens ${heal} HP! (${fx.heal_aura} turns left)`);
      if (fx.heal_aura <= 0) delete fx.heal_aura;
    }

    // Decrement turn-based buffs/debuffs（hub新增 anti_heal）
    ['shock', 'entangle', 'warcry', 'anti_heal'].forEach(key => {
      if (fx[key] > 0) {
        fx[key]--;
        if (fx[key] <= 0) {
          delete fx[key];
          this.addLog(`✦ ${unit.name}'s ${key} wore off`);
        }
      }
    });
  }

  // ── Get effective attack considering warcry buff ──────────────────
  _getEffectiveAtk(unit, statKey) {
    let base = unit[statKey] || unit.attack || 10;
    if (unit.statusEffects?.warcry > 0) base = Math.floor(base * 1.25);
    const hasCursedCodex = (unit.equipSlots ?? []).some(item => item?.effect === 'damage_amp_35_vulnerability_15');
    if (hasCursedCodex) base = Math.floor(base * 1.35);
    return base;
  }

  // ── Get effective damage received considering debuffs ────────────
  _getIncomingDamage(target, rawDamage) {
    let dmg = rawDamage;
    if (target.starCloakCharges > 0) {
      target.starCloakCharges--;
      this.addLog(`✨ ${target.name}'s Star Cloak blocks the hit! (${target.starCloakCharges} charge${target.starCloakCharges !== 1 ? 's' : ''} remaining)`);
      return 0;
    }
    const fx = target.statusEffects || {};

    // Shock: +30% damage taken
    if (fx.shock > 0) dmg = Math.floor(dmg * 1.3);

    // Entangle: +20% damage taken
    if (fx.entangle > 0) dmg = Math.floor(dmg * 1.2);

    // Rock shield: -50% damage, then remove shield
    if (fx.rock_shield > 0) {
      dmg = Math.floor(dmg * 0.5);
      delete fx.rock_shield;
      this.addLog(`🛡️ ${target.name}'s Rock Shield absorbed the hit!`);
    }
    const hasCursedCodex = (target.equipSlots ?? []).some(item => item?.effect === 'damage_amp_35_vulnerability_15');
    if (hasCursedCodex) dmg = Math.floor(dmg * 1.15);

    return Math.max(1, dmg);
  }

  // ── Try to trigger a status effect based on dice roll ─────────────
  _tryTriggerStatus(skill, target, rollVal) {
    if (!skill.statusEffect || !skill.statusChance) return;
    const chance = typeof skill.statusChance === 'number'
      ? skill.statusChance
      : (skill.statusChance[String(rollVal)] || 0);
    if (Math.random() < chance) {
      this._applyStatus(target === 'aoe' ? null : target, skill.statusEffect);
    }
  }

  // ── AOE status trigger ────────────────────────────────────────────
  _tryTriggerStatusAOE(skill, rollVal, targets = this.enemies) {
    if (!skill.statusEffect || !skill.statusChance) return;
    const chance = typeof skill.statusChance === 'number'
      ? skill.statusChance
      : (skill.statusChance[String(rollVal)] || 0);
    targets.forEach(unit => {
      if (this._isAlive(unit) && Math.random() < chance) {
        this._applyStatus(unit, skill.statusEffect);
      }
    });
  }

  nextTurn() {
    if (this.turnOrder.length === 0) return;
    this.activeUnit = this.turnOrder.shift();
    this.turnOrder.push(this.activeUnit);
    if (!this._isAlive(this.activeUnit)) return this.nextTurn();

    // Tick status effects at start of turn
    this._tickStatus(this.activeUnit);
    this.notifyUI();

    // Frozen: skip this turn
    if (this.activeUnit.statusEffects?.frozen > 0) {
      this.activeUnit.statusEffects.frozen--;
      this.addLog(`❄️ ${this.activeUnit.name} is frozen and cannot move!`);
      if (this.activeUnit.statusEffects.frozen <= 0) delete this.activeUnit.statusEffects.frozen;
      this.diceInfo = { isHeal: false, damage: 0, type: 'frozen', targetId: this.activeUnit.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // Legacy frozenTurns support
    if (this.activeUnit.frozenTurns && this.activeUnit.frozenTurns > 0) {
      this.activeUnit.frozenTurns--;
      this.addLog(`❄️ ${this.activeUnit.name} is frozen! (${this.activeUnit.frozenTurns} turns left)`);
      this.diceInfo = { isHeal: false, damage: 0, type: 'frozen', targetId: this.activeUnit.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    const isHero = this.heroes.some(h => h.id === this.activeUnit.id);
    this.phase = isHero ? 'PLAYER_TURN' : 'ENEMY_TURN';
    if (!isHero) {
      setTimeout(() => {
        try { this.handleAI(); }
        catch (err) {
          this.addLog(`${this.activeUnit.name} hesitated...`);
          this.phase = 'EXECUTING';
          this.notifyUI();
        }
      }, 1500);
    }
    this.notifyUI();
  }

  // ── Weapon switching ──────────────────────────────────────────────
  switchHeroWeapon(hero, weaponIndex) {
    if (hero.switchWeapon) {
      hero.switchWeapon(weaponIndex);
      this.addLog(`⚔️ ${hero.name} switched to [${hero.getActiveWeapon()?.name || 'nothing'}]`);
      this.notifyUI();
    }
  }

  // ── Skill selection ───────────────────────────────────────────────
  selectSkill(skill) {
    if (skill === null) {
      this.phase = 'PLAYER_TURN';
      this.currentAction = null;
      this.notifyUI();
      return;
    }
    this.currentAction = { skill, attacker: this.activeUnit };

    // Buff/heal targets self directly
    if (skill.type === 'heal') {
      // Heal can target self or ally — show ally selection
      this.phase = 'AWAIT_ALLY_TARGET';
      this.addLog(`Select an ally to heal with [${skill.name}]...`);
      this.notifyUI();
    } else if (skill.target === 'self' || skill.type === 'buff') {
      this.executePlayerAction(this.activeUnit.id);
    } else if (skill.target === 'aoe' || skill.type === 'debuff') {
      this.executePlayerAction('aoe_target');
    } else {
      this.phase = 'AWAIT_TARGET';
      this.addLog(`Select a target for [${skill.name}]...`);
      this.notifyUI();
    }
  }

  // ── Execute player action ─────────────────────────────────────────
  executePlayerAction(targetId) {
    const { skill, attacker } = this.currentAction;
    this.currentAction.target =
        targetId === 'aoe_target'
            ? 'aoe'
            : (this.enemies.find(e => e.id === targetId) || this.heroes.find(h => h.id === targetId));

    let result = rollAttack(attacker, 0.5, 6);
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));

    // Dice multiplier table
        let multiplier;
        let textType;
        if (rollVal <= 1)      { multiplier = 0.5; textType = 'graze';   }
        else if (rollVal <= 2) { multiplier = 0.8; textType = 'weak';    }
        else if (rollVal <= 3) { multiplier = 1.0; textType = 'normal';  }
        else if (rollVal <= 4) { multiplier = 1.2; textType = 'solid';   }
        else if (rollVal === 5){ multiplier = 1.6; textType = 'crit';    }
        else                   { multiplier = 1.8; textType = 'perfect'; }

    const isHeal = skill.type === 'heal' || skill.type === 'buff';
    this.currentAction = { ...this.currentAction, multiplier, rollVal, textType, isHeal };

    // ── 保留你的攻击动画扩展字段（attackerId / targetId / isHeal / skillType）──
    this.diceInfo = {
      finalRoll: rollVal,
      desc: 'Rolling',
      attackerId: attacker.id,
      targetId: this.currentAction.target?.id || null,
      isHeal: isHeal,
      skillType: skill.type,
      skillTarget: skill.target || 'single',
      skillPower: skill.power || 0,    // ★ NEW: for attack anim selection
    };
    this.phase = 'ROLLING';
    this.notifyUI();
  }

  // ── Apply damage / heal after dice animation ──────────────────────
  applyDamage() {
    const { skill, target, attacker, multiplier, rollVal, textType, isHeal } = this.currentAction;
    const statKey = skill.statKey || 'strength';
    const statValue = this._getEffectiveAtk(attacker, statKey);
    const isEnemyAction = attacker?.type === 'enemy';

    if (skill.type === 'ally_heal') {
      const healTarget = (target && target !== 'aoe') ? target : attacker;
      const amount = Math.max(1, Math.floor(skill.healAmount || 15));

      if (healTarget.statusEffects?.anti_heal > 0) {
        this.addLog(`${healTarget.name} is under anti-heal and cannot recover HP.`);
        this.diceInfo = { isHeal: false, damage: 0, type: 'normal', targetId: healTarget.id };
      } else {
        healTarget.hp = Math.min(healTarget.maxHp || healTarget.hp, healTarget.hp + amount);
        this.addLog(`${attacker.name} used [${skill.name}] and restored ${amount} HP to ${healTarget.name}.`);
        this.diceInfo = { isHeal: true, damage: amount, targetId: healTarget.id };
      }

      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    if (false && skill.type === 'ally_heal') {
      const healTarget = (target && target !== 'aoe') ? target : attacker;
      const amount = Math.max(1, Math.floor(skill.healAmount || 15));

      if (healTarget.statusEffects?.anti_heal > 0) {
        this.addLog(`馃毇 ${healTarget.name} is under anti-heal! Cannot recover HP!`);
        this.diceInfo = { isHeal: false, damage: 0, type: 'normal', targetId: healTarget.id };
      } else {
        healTarget.hp = Math.min(healTarget.maxHp || healTarget.hp, healTarget.hp + amount);
        this.addLog(`馃挌 ${attacker.name} used [${skill.name}]! ${healTarget.name} recovered ${amount} HP!`);
        this.diceInfo = { isHeal: true, damage: amount, targetId: healTarget.id };
      }

      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    if (skill.type === 'ally_buff') {
      const buffTarget = (target && target !== 'aoe') ? target : attacker;
      this.addLog(`${attacker.name} used [${skill.name}] on ${buffTarget.name}.`);
      this._applyStatus(buffTarget, skill.statusEffect);
      this.diceInfo = { isHeal: false, damage: 'BUFF', type: 'buff', targetId: buffTarget.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    if (skill.type === 'self_heal') {
      const healTarget = attacker;
      const amount = Math.max(1, Math.floor(healTarget.maxHp * (skill.healPct || 0.15)));

      if (healTarget.statusEffects?.anti_heal > 0) {
        this.addLog(`${healTarget.name} is under anti-heal and cannot recover HP.`);
        this.diceInfo = { isHeal: false, damage: 0, type: 'normal', targetId: healTarget.id };
      } else {
        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + amount);
        this.addLog(`${attacker.name} used [${skill.name}] and restored ${amount} HP.`);
        this.diceInfo = { isHeal: true, damage: amount, targetId: healTarget.id };
      }

      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    if (skill.type === 'multi_buff') {
      const buffTarget = attacker;
      (skill.statusEffects || []).forEach(effectId => this._applyStatus(buffTarget, effectId));
      this.addLog(`${attacker.name} used [${skill.name}] and empowered itself.`);
      this.diceInfo = { isHeal: false, damage: 'BUFF', type: 'buff', targetId: buffTarget.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    if (false && skill.type === 'ally_buff') {
      const buffTarget = (target && target !== 'aoe') ? target : attacker;
      this.addLog(`馃敼 ${attacker.name} used [${skill.name}] on ${buffTarget.name}!`);
      this._applyStatus(buffTarget, skill.statusEffect);
      this.diceInfo = { isHeal: false, damage: 'BUFF', type: 'buff', targetId: buffTarget.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // Miss
    if (multiplier === 0) {
      this.diceInfo = { isHeal: false, damage: 0, type: 'miss', targetId: target?.id || attacker.id };
      this.addLog(`Rolled [${rollVal}] → 💨 MISS! ${attacker.name} missed completely!`);
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // Heal / Buff
    if (isHeal) {
      // Apply status buff if skill has one
      if (skill.statusEffect) {
        this._applyStatus(attacker, skill.statusEffect);
      }
      const healAmount = Math.max(1, Math.floor(statValue * (skill.power / 100) * multiplier));
      if (skill.power > 0) {
        const healTarget = (target && target !== 'aoe') ? target : attacker;
        // ── hub新增：禁疗状态检查 ──────────────────────────────────
        if (healTarget.statusEffects?.anti_heal > 0) {
          this.addLog(`🚫 ${healTarget.name} is under anti-heal! Cannot recover HP!`);
          this.diceInfo = { isHeal: false, damage: 0, type: 'normal', targetId: healTarget.id };
        } else {
          // 圣灵之心：治疗技能改为全体回复
          const hasHolySpiritHeart = (attacker.equipSlots ?? []).some(item => item?.effect === 'heal_to_aoe');
          if (hasHolySpiritHeart) {
            const aliveAllies = this.heroes.filter(h => this._isAlive(h));
            aliveAllies.forEach(ally => {
              if (!(ally.statusEffects?.anti_heal > 0)) {
                ally.hp = Math.min(ally.maxHp || 100, ally.hp + healAmount);
              }
            });
            this.addLog(`✨ ${attacker.name}'s Holy Spirit Heart heals the whole party for ${healAmount}!`);
            this.diceInfo = { isHeal: true, damage: healAmount, targetId: attacker.id };
          } else {
            healTarget.hp = Math.min(healTarget.maxHp || 100, healTarget.hp + healAmount);
            this.diceInfo = { isHeal: true, damage: healAmount, targetId: healTarget.id };
            this.addLog(`Rolled [${rollVal}] → Restored ${healAmount} HP`);
          }
        }
      } else {
        const healTarget = (target && target !== 'aoe') ? target : attacker;
        this.diceInfo = { isHeal: true, damage: 0, targetId: healTarget.id };
        this.addLog(`Rolled [${rollVal}] → ${skill.name} activated!`);
      }
    } else {
      // Attack / Debuff
      let baseDamage = Math.floor(statValue * (skill.power / 100) * multiplier);

      if (target === 'aoe') {
        const aoeTargets = attacker.type === 'enemy' ? this.heroes : this.enemies;
        // AOE hit all opponents
        aoeTargets.forEach(unit => {
          if (this._isAlive(unit)) {
            const finalDmg = this._getIncomingDamage(unit, Math.max(1, baseDamage - (unit.defense || 0)));
            unit.hp = Math.max(0, unit.hp - finalDmg);
          }
        });
        // AOE status trigger
        this._tryTriggerStatusAOE(skill, rollVal, aoeTargets);
        this.diceInfo = {
          isHeal: false,
          damage: baseDamage,
          type: textType,
          targetId: aoeTargets.find(unit => this._isAlive(unit))?.id
        };
        this.addLog(`Rolled [${rollVal}] → AOE [${skill.name}] hit all! ${this._rollLabel(textType)}`);
      } else {
        // Single target
        const rawDmg = Math.max(1, baseDamage - (target.defense || 0));
        const finalDamage = this._getIncomingDamage(target, rawDmg);
        target.hp = Math.max(0, target.hp - finalDamage);

        // Try to trigger status effect based on dice roll
        this._tryTriggerStatus(skill, target, rollVal);

        this.diceInfo = { isHeal: false, damage: finalDamage, type: textType, targetId: target.id };
        this.addLog(`Rolled [${rollVal}] → [${skill.name}] dealt ${finalDamage} to ${target.name} ${this._rollLabel(textType)}`);

        const hasLifesteal = (attacker.equipSlots ?? []).some(item => item?.effect === 'lifesteal_10');
        if (hasLifesteal && finalDamage > 0 && attacker.hp > 0) {
          const healAmt = Math.max(1, Math.floor(finalDamage * 0.1));
          if (!(attacker.statusEffects?.anti_heal > 0)) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
            this.addLog(`🩸 ${attacker.name}'s Bloodthirst Mask restores ${healAmt} HP!`);

          }
        }
        const hasEagleEye = (attacker.equipSlots ?? []).some(item => item?.effect === 'double_strike_60');
        if (hasEagleEye && finalDamage > 0 && this._isAlive(target) && Math.random() < 0.6) {
          const bonusDmg = this._getIncomingDamage(target, finalDamage);
          target.hp = Math.max(0, target.hp - bonusDmg);
          this.addLog(`🦅 ${attacker.name}'s Eagle Eye triggers! Strikes again for ${bonusDmg}!`);
        }


        const hasLionHeart = (target.equipSlots ?? []).some(item => item?.effect === 'regen_on_hit_30');
        if (hasLionHeart && finalDamage > 0 && this._isAlive(target)) {
          const regenAmt = Math.max(1, Math.floor(finalDamage * 0.3));
          if (!(target.statusEffects?.anti_heal > 0)) {
            target.hp = Math.min(target.maxHp, target.hp + regenAmt);
            this.addLog(`🦁 ${target.name}'s Lion Heart recovers ${regenAmt} HP!`);
          }
        }
      }
    }
    this.phase = 'EXECUTING';
    this.notifyUI();
  }

  _rollLabel(textType) {
      return textType === 'perfect' ? '⚡ PERFECT! ×1.8'
          : textType === 'crit'    ? '💥 CRIT! ×1.6'
              : textType === 'solid'   ? '(Solid ×1.2)'
                  : textType === 'weak'    ? '(Weak ×0.8)'
                      : textType === 'graze'   ? '💨 GRAZE ×0.5'
                          : '';
    }

  // ── Enemy AI（采用 hub 完整版，支持 buff/heal/aoe 等多种技能类型）────
  handleAI() {
    const aliveHeroes  = this.heroes.filter(h => this._isAlive(h));
    if (aliveHeroes.length === 0) return;

    const aliveEnemies = this.enemies.filter(e => this._isAlive(e));
    const skills = this.activeUnit.skills || [];
    const skill  = skills.length > 0
        ? skills[Math.floor(Math.random() * skills.length)]
        : null;

    // ── buff/self：给自己上盾（Goblin Warrior）───────────────────────
    if (skill?.type === 'buff' && skill.target === 'self') {
      this._applyStatus(this.activeUnit, skill.statusEffect);
      this.diceInfo = { isHeal: false, damage: 0, type: 'buff', targetId: this.activeUnit.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // ── ally_heal：治疗随机队友（Goblin Shaman）─────────────────────
    if (skill?.type === 'ally_heal') {
      const candidates = aliveEnemies.filter(e => e.id !== this.activeUnit.id);
      const healTarget = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : this.activeUnit;

      this.currentAction = {
        skill,
        attacker: this.activeUnit,
        target: healTarget,
        multiplier: 1,
        rollVal: 4,
        textType: 'normal',
        isHeal: true,
      };
      this.diceInfo = {
        finalRoll: 4,
        desc: 'Rolling',
        attackerId: this.activeUnit.id,
        targetId: healTarget.id,
        isHeal: true,
        skillType: skill.type,
        skillTarget: skill.target || 'ally',
        skillPower: 0,
        skipDice: true,
      };
      this.phase = 'ROLLING';
      this.notifyUI();
      return;
    }

    if (false && skill?.type === 'ally_heal') {
      const candidates  = aliveEnemies.filter(e => e.id !== this.activeUnit.id);
      const healTarget  = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : this.activeUnit;
      const amount = skill.healAmount || 15;
      // 检查禁疗
      if (healTarget.statusEffects?.anti_heal > 0) {
        this.addLog(`🚫 ${healTarget.name} cannot be healed!`);
        this.diceInfo = { isHeal: false, damage: 0, targetId: healTarget.id };
      } else {
        healTarget.hp = Math.min(healTarget.maxHp || healTarget.hp, healTarget.hp + amount);
        this.addLog(`💚 ${this.activeUnit.name} used [${skill.name}]! ${healTarget.name} recovered ${amount} HP!`);
        this.diceInfo = { isHeal: true, damage: amount, targetId: healTarget.id };
      }
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // ── ally_buff：给随机队友上 warcry（Goblin Shaman）──────────────
    if (skill?.type === 'ally_buff') {
      const buffTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];

      this.currentAction = {
        skill,
        attacker: this.activeUnit,
        target: buffTarget,
        multiplier: 1,
        rollVal: 4,
        textType: 'normal',
        isHeal: false,
      };
      this.diceInfo = {
        finalRoll: 4,
        desc: 'Rolling',
        attackerId: this.activeUnit.id,
        targetId: buffTarget.id,
        isHeal: false,
        skillType: skill.type,
        skillTarget: skill.target || 'ally',
        skillPower: 0,
        skipDice: true,
      };
      this.phase = 'ROLLING';
      this.notifyUI();
      return;
    }

    if (false && skill?.type === 'ally_buff') {
      const buffTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      this._applyStatus(buffTarget, skill.statusEffect);
      this.diceInfo = { isHeal: false, damage: 0, type: 'buff', targetId: buffTarget.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }

    // ── self_restore：精英怪回血+护盾 ───────────────────────────────
    if (skill?.type === 'self_heal') {
      this.currentAction = {
        skill,
        attacker: this.activeUnit,
        target: this.activeUnit,
        multiplier: 1,
        rollVal: 4,
        textType: 'normal',
        isHeal: true,
      };
      this.diceInfo = {
        finalRoll: 4,
        desc: 'Rolling',
        attackerId: this.activeUnit.id,
        targetId: this.activeUnit.id,
        isHeal: true,
        skillType: skill.type,
        skillTarget: skill.target || 'self',
        skillPower: 0,
        skipDice: true,
      };
      this.phase = 'ROLLING';
      this.notifyUI();
      return;
    }

    if (skill?.type === 'self_restore') {
      const healAmt = Math.floor(this.activeUnit.maxHp * (skill.healPct || 0.1));
      if (this.activeUnit.statusEffects?.anti_heal > 0) {
        // 被禁疗时只上盾，不回血
        this._applyStatus(this.activeUnit, skill.statusEffect);
        this.addLog(`🚫 ${this.activeUnit.name} is anti-healed! Shield only.`);
        this.diceInfo = { isHeal: false, damage: 0, type: 'buff', targetId: this.activeUnit.id };
      } else {
        this.activeUnit.hp = Math.min(this.activeUnit.maxHp, this.activeUnit.hp + healAmt);
        this._applyStatus(this.activeUnit, skill.statusEffect);
        this.addLog(`💚 ${this.activeUnit.name} used [${skill.name}]! Restored ${healAmt} HP and raised shield!`);
        this.diceInfo = { isHeal: true, damage: healAmt, targetId: this.activeUnit.id };
      }
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }
    if (skill?.type === 'multi_buff' && skill.target === 'self') {
      this.currentAction = {
        skill,
        attacker: this.activeUnit,
        target: this.activeUnit,
        multiplier: 1,
        rollVal: 4,
        textType: 'normal',
        isHeal: false,
      };
      this.diceInfo = {
        finalRoll: 4,
        desc: 'Rolling',
        attackerId: this.activeUnit.id,
        targetId: this.activeUnit.id,
        isHeal: false,
        skillType: skill.type,
        skillTarget: skill.target || 'self',
        skillPower: 0,
        skipDice: true,
      };
      this.phase = 'ROLLING';
      this.notifyUI();
      return;
    }

    if (false && skill?.type === 'multi_buff' && skill.target === 'self') {
      const effects = skill.statusEffects || [];
      effects.forEach(eff => this._applyStatus(this.activeUnit, eff));
      this.addLog(`✨ ${this.activeUnit.name} used [${skill.name}]! Empowered with all buffs!`);
      this.diceInfo = { isHeal: false, damage: 0, type: 'buff', targetId: this.activeUnit.id };
      this.phase = 'EXECUTING';
      this.notifyUI();
      return;
    }
    // Weighted random target: front-row (knight) is 3x more likely than back-row.
        const FRONT_ROW_IDS = ['knight'];
        const FRONT_WEIGHT = 3;
        const BACK_WEIGHT = 1;
        const weighted = aliveHeroes.map(h => ({
          hero: h,
          weight: FRONT_ROW_IDS.includes(h.id) ? FRONT_WEIGHT : BACK_WEIGHT,
        }));
        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let roll = Math.random() * totalWeight;
        let target = aliveHeroes[0];
        for (const w of weighted) {
          roll -= w.weight;
          if (roll <= 0) { target = w.hero; break; }
        }
    const skillName = skill?.name    || 'Attack';
    const statKey   = skill?.statKey || 'strength';
    const power     = skill?.power   ?? 100;

    let result  = rollAttack(this.activeUnit, 0.5, 6);
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
    const multiplier = rollVal <= 1 ? 0.5 : rollVal <= 2 ? 0.8 : rollVal <= 3 ? 1.0 : rollVal <= 4 ? 1.2 : rollVal === 5 ? 1.6 : 1.8;
    const textType   = rollVal <= 1 ? 'graze' : rollVal <= 2 ? 'weak' : rollVal <= 3 ? 'normal' : rollVal <= 4 ? 'solid' : rollVal === 5 ? 'crit' : 'perfect';
    const resolvedSkill = skill || {
      id: 'enemy_attack',
      name: skillName,
      type: 'attack',
      target: 'single',
      power,
      statKey,
    };
    const resolvedTarget = resolvedSkill.target === 'aoe' ? 'aoe' : target;

    this.currentAction = {
      skill: resolvedSkill,
      attacker: this.activeUnit,
      target: resolvedTarget,
      multiplier,
      rollVal,
      textType,
      isHeal: false,
    };

    this.diceInfo = {
      finalRoll: rollVal,
      desc: 'Rolling',
      attackerId: this.activeUnit.id,
      targetId: resolvedTarget === 'aoe' ? target?.id : resolvedTarget?.id,
      isHeal: false,
      skillType: resolvedSkill.type || 'attack',
      skillTarget: resolvedSkill.target || 'single',
      skillPower: resolvedSkill.power || power || 0,
      skipDice: true,
    };

    this.phase = 'ROLLING';
    this.notifyUI();
    return;

    if (multiplier === 0) {
      this.addLog(`${this.activeUnit.name} used [${skillName}] but missed!`);
      this.diceInfo = { isHeal: false, damage: 0, type: 'miss', targetId: target.id };

    } else if (skill?.target === 'aoe') {
      // 群体攻击（Dark Mage Hellfire / Blizzard）
      const statVal = this._getEffectiveAtk(this.activeUnit, statKey);
      const baseDmg = Math.floor(statVal * (power / 100) * multiplier);
      let sampleDmg = 0;
      aliveHeroes.forEach(hero => {
        const finalDmg = this._getIncomingDamage(hero, Math.max(1, baseDmg - (hero.defense || 0)));
        hero.hp  = Math.max(0, hero.hp - finalDmg);
        sampleDmg = finalDmg;
        if (skill.multiStatusEffects?.length && Math.random() < (skill.statusChance || 0)) {
          skill.multiStatusEffects.forEach(eff => this._applyStatus(hero, eff));
        } else if (skill.statusEffect && Math.random() < (skill.statusChance || 0)) {
          this._applyStatus(hero, skill.statusEffect);
        }
      });
      this.addLog(`${this.activeUnit.name} used [${skillName}]! Hit all heroes! ${this._rollLabel(textType)}`);
      this.diceInfo = { isHeal: false, damage: sampleDmg, type: textType, targetId: aliveHeroes[0]?.id };

    } else {
      // 单体攻击
      const statVal   = this._getEffectiveAtk(this.activeUnit, statKey);
      const baseDmg   = Math.floor(statVal * (power / 100) * multiplier);
      const rawDmg    = Math.max(1, baseDmg - (target.defense || 0));
      const actualDmg = this._getIncomingDamage(target, rawDmg);
      target.hp = Math.max(0, target.hp - actualDmg);
      if (skill?.statusEffect && Math.random() < (skill.statusChance || 0)) {
        this._applyStatus(target, skill.statusEffect);
      }
      this.addLog(`${this.activeUnit.name} used [${skillName}]! Dealt ${actualDmg} to ${target.name} ${this._rollLabel(textType)}`);
      this.diceInfo = { isHeal: false, damage: actualDmg, type: textType, targetId: target.id };
    }

    this.phase = 'EXECUTING';
    this.notifyUI();
  }

  evaluateTurn() {
    this.diceInfo = null;
    if (this.enemies.every(e => !this._isAlive(e))) {
      this.addLog('All enemies defeated! 🎉');
      this.phase = 'WIN';
    } else if (this.heroes.every(h => !this._isAlive(h))) {
      this.addLog('The party has fallen...');
      this.phase = 'LOSE';
    } else {
      this.nextTurn();
      return;
    }
    this.notifyUI();
  }

  finishCombat() {
    if (this.ui.onCombatResult) this.ui.onCombatResult(this.phase === 'WIN' ? 'win' : 'lose');
  }
}
