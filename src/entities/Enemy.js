// src/entities/Enemy.js
import { Character } from './Character.js';

/* Rebalanced for combat pacing (fast TTK, but enemies hit hard):
 *   HP base   130 + level*50    (Lv1=180 / Lv2=230 / Lv3=280)
 *   strength   24 + level*6     (buffed — small mobs deal real damage now)
 *   toughness   8 + level*2
 *   intellect  18 + level*5     (buffed — Dark Mage is now scary)
 *   awareness   8 + level*2
 *   talent      5 + level*1
 *   agility     8 + level*2
 *
 * Pacing examples:
 *   Lv1 warrior (HP=180) vs Knight rare (STR=30) Heavy Strike 140%:
 *     normal → 42 dmg → ~4 hits;  perfect → 84 dmg → ~2 hits.
 *   Lv1 warrior (STR=24, warcry buff 30) Slash 100% vs Knight (DEF~16):
 *     normal → 24-16 = 8 dmg; perfect → 48-16 = 32 dmg. 5-7 turns of pressure.
 *   Lv3 enemy (HP=280) vs Knight epic (STR=48) Dragon Slash 180%:
 *     normal → 86 dmg → ~3-4 hits; perfect → 172 dmg → ~2 hits.
 */
export class Enemy extends Character {
  /**
   * @param {string} name
   * @param {string} type  'wolf' | 'skeleton' | 'boss' etc.
   * @param {number} level
   * @param {object} [statOverrides] Overrides specific base stats, used for bosses / elites
   * @param {string} [difficultyMode] 'normal' or 'hell'
   */
  constructor(name, type, level, statOverrides = {}, difficultyMode = 'normal') {

    // --- 🔴 Dynamic Rebalanced Multipliers ---
    const hpMulti = difficultyMode === 'hell' ? 1.4 : 1.0;
    const atkMulti = difficultyMode === 'hell' ? 1.5 : 1.0;
    const defMulti = difficultyMode === 'hell' ? 1.2 : 0.6;

    // Calculate scaled HP
    const hp = Math.floor((130 + level * 50) * hpMulti);
    super(name, hp, hp);

    this.type = 'enemy';     // Keep consistent with CombatManager checks
    this.monsterType = type; // Store original type
    this.level = level;
    this.difficulty = difficultyMode; // Save difficulty for rendering

    // Apply ATTACK multipliers to offensive stats
  // Apply ATTACK multipliers to offensive stats
      this.strength = Math.floor((statOverrides.strength ?? (24 + (level - 1) * 6)) * atkMulti);
      this.intellect = Math.floor((statOverrides.intellect ?? (18 + (level - 1) * 5)) * atkMulti);

    // Apply DEFENSE multipliers to defensive stats (Heavily nerfed base scaling)
    this.toughness = Math.floor((statOverrides.toughness ?? (8 + (level - 1) * 2)) * defMulti);

    // Apply Standard multipliers to utility stats
    this.awareness = Math.floor((statOverrides.awareness ?? (8 + (level - 1) * 2)) * hpMulti);
    this.talent = Math.floor((statOverrides.talent ?? (5 + (level - 1) * 1)) * hpMulti);
    this.agility = Math.floor((statOverrides.agility ?? (8 + (level - 1) * 2)) * hpMulti);

    // Refresh derived stats from Character.js (attack / defense / speed)
    this.refreshDerivedStats();

    // 🔴 FATAL ATTACK BOOST (Make them hit harder)
    if (this.difficulty === 'hell') {
        this.attack = Math.floor((this.attack || 15) * 1.2);
    }

    // 🔴 GUARANTEED DEFENSE SQUISH (Make them vulnerable)
    // No matter how high their toughness is, force their final defense to be 40% of the calculated value.
    // This guarantees that players will never hit for '0' damage constantly.
    this.defense = Math.floor((this.defense || 0) * 0.4);
  }

  // --- Rendering on the Hex Map ---

  draw(ctx, size) {
    ctx.save();

    // Hell mode enemies are rendered in a darker blood-red color
    ctx.fillStyle = this.difficulty === 'hell' ? '#8b0000' : '#e74c3c';

    // Draw diamond shape body
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Draw level tag
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    // Add fire emoji for hell mode
    const tag = this.difficulty === 'hell' ? `🔥Lv.${this.level}` : `Lv.${this.level}`;
    ctx.fillText(tag, 0, 4);

    ctx.restore();
  }
}