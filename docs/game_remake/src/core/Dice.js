// src/core/Dice.js

/**
 * Universal dice judgment system — attribute contest multi-slot version (FTK simplified style)
 * * Keep the original roll(statValue, maxPoints, options) signature unchanged
 * Internal logic: success rate is generated based on attack/defense attributes, and multiple checks are performed
 */

export const RollGrade = {
  CRITICAL_FAIL: { id: 0, label: 'Critical Failure', emoji: '💪' },
  FAIL: { id: 1, label: 'Failure', emoji: '❌' },
  NORMAL: { id: 2, label: 'Normal', emoji: '⚪' },
  SUCCESS: { id: 3, label: 'Success', emoji: '✅' },
  CRITICAL_SUCCESS: { id: 4, label: 'Critical Success', emoji: '🌟' },
};

/**
 * Core: Keep the original signature for plug-and-play
 * @param {number} statValue   Attacker's attribute (Attacker)
 * @param {number} maxPoints   Used as "defender's attribute" or "difficulty baseline" in this version (Defender)
 * @param {object} [options]
 * @param {number} [options.difficulty=0.5]  Difficulty coefficient
 * @param {number} [options.bias=0]          Bias
 */
export function roll(statValue, maxPoints, options = {}) {
  const {
    difficulty = 0.5,
    bias = 0,
    // The following parameters are no longer core in the FTK model, but default values are retained for structural consistency
    statScale = 100,
    sigmaDivisor = 5
  } = options;

  // 1. Simulate slots: determine the number of slots according to maxPoints
    //    maxPoints === 6 (combat dice): 5 slots, hits 0-5 directly map to points 1-6
    //    Other scenarios (trap maxPoints=20, etc.): keep 3 slots
    const slots = maxPoints === 6 ? 5 : (maxPoints <= 20 ? 3 : 5);

// 2. Calculate success rate (based on attribute contest model)
  // A / (A + D), D is the difficulty baseline
  //   Combat dice (maxPoints === 6): fixed difficulty baseline 25, so that players with medium attributes have ~55% single-slot success rate
  //   Other scenarios: use maxPoints * difficulty
  const defenderPower = maxPoints === 6 ? 25 : (maxPoints * difficulty);
  let p = statValue / (statValue + defenderPower);

  // Add bias and limit the range (upper limit 0.88, so that full attribute players have about 53% probability of rolling 6)
  p = Math.min(0.88, Math.max(0.05, p + bias));

  // 3. Perform multiple checks (Binomial Roll)
  let hits = 0;
  for (let i = 0; i < slots; i++) {
    if (Math.random() < p) hits++;
  }

  // 4. Map the number of hits to sampleRoll
    //    maxPoints === 6 (combat dice): hits 0-5 directly correspond to points 1-6 (hits + 1), ensuring all 6 points can be generated
    //    Other scenarios: keep the original proportional mapping logic
    const hitRatio = hits / slots;
    const sampleRoll = maxPoints === 6 ? (hits + 1) : (hitRatio * maxPoints);

  // 5. Determine grade
  let segIndex;
  if (hits === slots) segIndex = 4;      // 全中 -> 大成功
  else if (hits === 0) segIndex = 0;     // 全失 -> 大失败
  else if (hitRatio >= 0.6) segIndex = 3; // 成功
  else if (hitRatio >= 0.3) segIndex = 2; // 普通
  else segIndex = 1;                     // 失败

  const grade = gradeIndexToGrade(segIndex);

  // 6. Return all fields of the original structure to ensure the caller does not report errors
  return {
    sampleRoll: Math.round(sampleRoll * 10) / 10,
    maxPoints,
    mu: p, // In this model, mu represents the single-slot success rate, used for debugging
    sigma: sigmaDivisor,
    netOffset: Math.round((p - 0.5) * 100) / 100,
    segIndex,
    gradeIndex: segIndex,
    grade,
    difficulty,
    statValue,
    statBonus: p,
    bias,
    // Additional extended fields (do not affect original calls)
    hits,
    slots
  };
}

// ── The following functions remain unchanged ────────────────────────────────────────

export function rollAttack(attacker, difficulty = 0.5, maxPoints = 20) {
  return roll(attacker.attack ?? 0, maxPoints, { difficulty, statScale: 50 });
}

export function rollDefense(defender, difficulty = 0.5, maxPoints = 20) {
  return roll(defender.defense ?? 0, maxPoints, { difficulty, statScale: 50 });
}

export function rollSpeed(character, difficulty = 0.5, maxPoints = 20) {
  return roll(character.speed ?? 0, maxPoints, { difficulty, statScale: 10 });
}

export function rollWithBias(statValue, maxPoints, bias, difficulty = 0.5) {
  return roll(statValue, maxPoints, { difficulty, bias });
}

function gradeIndexToGrade(idx) {
  return [
    RollGrade.CRITICAL_FAIL,
    RollGrade.FAIL,
    RollGrade.NORMAL,
    RollGrade.SUCCESS,
    RollGrade.CRITICAL_SUCCESS,
  ][idx];
}

export function formatRoll(result) {
  const { grade, sampleRoll, maxPoints, mu, statValue, difficulty, hits, slots } = result;
  return (
    `${grade.emoji} ${grade.label}` +
    ` | Hits ${hits}/${slots}` +
    ` | Simulated roll ${sampleRoll}/${maxPoints}` +
    ` | Stat ${statValue} vs Difficulty baseline ${maxPoints * difficulty}`
  );
}
