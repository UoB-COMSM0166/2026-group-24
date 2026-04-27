// src/core/Dice.js

/**
 * 通用骰子判定系统 —— 属性对抗多槽位版 (FTK 简化风格)
 * * 保持原有的 roll(statValue, maxPoints, options) 签名不变
 * 内部逻辑改为：基于攻击/防御属性生成的成功率，进行多次判定
 */

export const RollGrade = {
  CRITICAL_FAIL: { id: 0, label: 'Critical Failure', emoji: '💪' },
  FAIL: { id: 1, label: 'Failure', emoji: '❌' },
  NORMAL: { id: 2, label: 'Normal', emoji: '⚪' },
  SUCCESS: { id: 3, label: 'Success', emoji: '✅' },
  CRITICAL_SUCCESS: { id: 4, label: 'Critical Success', emoji: '🌟' },
};

/**
 * 核心：保持原签名，实现即插即用
 * * @param {number} statValue   攻击方属性 (Attacker)
 * @param {number} maxPoints   在此版本中作为“防御方属性”或“难度基准” (Defender)
 * @param {object} [options]
 * @param {number} [options.difficulty=0.5]  难度系数
 * @param {number} [options.bias=0]          偏移
 */
export function roll(statValue, maxPoints, options = {}) {
  const {
    difficulty = 0.5,
    bias = 0,
    // 以下参数在 FTK 模型中不再核心，但为了结构一致保留默认值
    statScale = 100,
    sigmaDivisor = 5
  } = options;

  // 1. 模拟槽位：根据 maxPoints 决定槽数
    //    maxPoints === 6 (战斗骰子)：5 槽，hits 0-5 直接映射到点数 1-6
    //    其他场景 (陷阱 maxPoints=20 等)：保持 3 槽
    const slots = maxPoints === 6 ? 5 : (maxPoints <= 20 ? 3 : 5);

// 2. 计算成功率 (基于属性对抗模型)
  // A / (A + D)，D 为难度基准
  //   战斗骰子 (maxPoints === 6)：固定难度基准 25，让中等属性玩家有 ~55% 单槽成功率
  //   其他场景：沿用 maxPoints * difficulty
  const defenderPower = maxPoints === 6 ? 25 : (maxPoints * difficulty);
  let p = statValue / (statValue + defenderPower);

  // 叠加 bias 并限制范围 (上限 0.88，让满属性玩家出 6 概率约 53%)
  p = Math.min(0.88, Math.max(0.05, p + bias));

  // 3. 执行多次判定 (Binomial Roll)
  let hits = 0;
  for (let i = 0; i < slots; i++) {
    if (Math.random() < p) hits++;
  }

  // 4. 将命中数映射到 sampleRoll
    //    maxPoints === 6 (战斗骰子)：hits 0-5 直接对应点数 1-6 (hits + 1)，确保 6 个点数都能产生
    //    其他场景：保持原比例映射逻辑
    const hitRatio = hits / slots;
    const sampleRoll = maxPoints === 6 ? (hits + 1) : (hitRatio * maxPoints);

  // 5. 确定等级 (Grade)
  let segIndex;
  if (hits === slots) segIndex = 4;      // 全中 -> 大成功
  else if (hits === 0) segIndex = 0;     // 全失 -> 大失败
  else if (hitRatio >= 0.6) segIndex = 3; // 成功
  else if (hitRatio >= 0.3) segIndex = 2; // 普通
  else segIndex = 1;                     // 失败

  const grade = gradeIndexToGrade(segIndex);

  // 6. 返回原版结构的所有字段，确保调用方不报错
  return {
    sampleRoll: Math.round(sampleRoll * 10) / 10,
    maxPoints,
    mu: p, // 在此模型中，mu 代表单槽成功率，用于调试
    sigma: sigmaDivisor,
    netOffset: Math.round((p - 0.5) * 100) / 100,
    segIndex,
    gradeIndex: segIndex,
    grade,
    difficulty,
    statValue,
    statBonus: p,
    bias,
    // 额外扩展字段（不影响原调用）
    hits,
    slots
  };
}

// ── 以下函数完全保持原样 ────────────────────────────────────────

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
    ` | 命中 ${hits}/${slots}` +
    ` | 模拟落点 ${sampleRoll}/${maxPoints}` +
    ` | 属性 ${statValue} vs 难度基准 ${maxPoints * difficulty}`
  );
}
