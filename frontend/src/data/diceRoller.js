export function parseDiceNotation(notation = '') {
  const diceGroups = String(notation).match(/(\d+)?d(\d+)/gi) || [];
  const modifierMatches = String(notation).replace(/(\d+)?d(\d+)/gi, '').match(/([+-]\d+)/g) || [];
  const modifier = modifierMatches.reduce((sum, value) => sum + Number.parseInt(value, 10), 0);
  return { diceGroups, modifier };
}

export function rollDie(sides, rng = Math.random) {
  return Math.floor(rng() * sides) + 1;
}

export function rollDiceNotation(notation, options = {}) {
  const {
    rollType = 'normal',
    exploding = false,
    rng = Math.random,
    maxExplosionsPerDie = 100,
  } = options;
  const { diceGroups, modifier } = parseDiceNotation(notation);
  const rolls = [];
  let total = 0;
  const isAdvRoll = (rollType === 'advantage' || rollType === 'disadvantage') && /^\s*(\d+)?d20\s*([+-]\d+)?\s*$/i.test(String(notation));

  if (isAdvRoll) {
    const r1 = rollDie(20, rng);
    const r2 = rollDie(20, rng);
    const keepFirst = rollType === 'advantage' ? r1 >= r2 : r1 <= r2;
    const kept = keepFirst ? r1 : r2;
    rolls.push({ sides: 20, result: r1, dropped: !keepFirst });
    rolls.push({ sides: 20, result: r2, dropped: keepFirst });
    total = kept;
  } else {
    for (const group of diceGroups) {
      const match = group.match(/(\d+)?d(\d+)/i);
      if (!match) continue;
      const count = Number.parseInt(match[1], 10) || 1;
      const sides = Number.parseInt(match[2], 10);
      for (let i = 0; i < count; i += 1) {
        let result = rollDie(sides, rng);
        rolls.push({ sides, result });
        total += result;

        let explosionCount = 0;
        while (exploding && sides !== 20 && result === sides && explosionCount < maxExplosionsPerDie) {
          explosionCount += 1;
          result = rollDie(sides, rng);
          rolls.push({ sides, result, exploded: true, explosionOf: rolls.length - 1 });
          total += result;
        }
      }
    }
  }

  total += modifier;
  const keptRoll = isAdvRoll ? rolls.find(roll => !roll.dropped) : rolls[0];

  return {
    notation,
    rolls,
    visibleRolls: isAdvRoll ? rolls.filter(roll => !roll.dropped) : rolls,
    modifier,
    total,
    keptRoll,
    isCrit: Boolean(keptRoll && keptRoll.sides === 20 && keptRoll.result === 20),
    isFumble: Boolean(keptRoll && keptRoll.sides === 20 && keptRoll.result === 1),
    exploding: Boolean(exploding),
    explosionCount: rolls.filter(roll => roll.exploded).length,
  };
}

export function getAnimationTarget(rollResult) {
  if (!rollResult) return 0;
  const kept = rollResult.keptRoll || rollResult.visibleRolls?.[0] || rollResult.rolls?.[0];
  if (kept?.sides === 20) return kept.result;
  return rollResult.total;
}
