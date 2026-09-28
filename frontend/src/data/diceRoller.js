const MAX_EXPRESSION_LENGTH = 120;
const MAX_DICE_PER_TERM = 100;
const MAX_TOTAL_DICE = 200;
const MAX_DIE_SIDES = 100;
const MAX_ABS_MODIFIER = 1000000;

function invalidParse(notation, error) {
  return {
    notation,
    normalizedNotation: String(notation || '').replace(/\s+/g, '').toLowerCase(),
    valid: false,
    error,
    terms: [],
    diceGroups: [],
    modifier: 0,
  };
}

function parseDiceBody(body = '') {
  const diceMatch = body.match(/^(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d+))?/i);
  if (diceMatch) {
    return {
      length: diceMatch[0].length,
      countText: diceMatch[1],
      sidesText: diceMatch[2],
      keepDropMode: diceMatch[3]?.toLowerCase() || '',
      keepDropCountText: diceMatch[4] || '',
      raw: diceMatch[0],
    };
  }

  const modifierMatch = body.match(/^(\d+)/);
  if (modifierMatch) {
    return {
      length: modifierMatch[0].length,
      modifierText: modifierMatch[1],
      raw: modifierMatch[0],
    };
  }

  return null;
}

export function parseDiceNotation(notation = '') {
  const original = String(notation ?? '');
  const compact = original.replace(/\s+/g, '').toLowerCase();

  if (!compact) return invalidParse(original, 'Enter a dice formula such as 1d20+5.');
  if (compact.length > MAX_EXPRESSION_LENGTH) {
    return invalidParse(original, `Dice formulas are limited to ${MAX_EXPRESSION_LENGTH} characters.`);
  }

  const terms = [];
  const diceGroups = [];
  let modifier = 0;
  let cursor = 0;
  let totalDice = 0;

  while (cursor < compact.length) {
    let sign = 1;
    const signChar = compact[cursor];

    if (signChar === '+' || signChar === '-') {
      sign = signChar === '-' ? -1 : 1;
      cursor += 1;
      if (cursor >= compact.length) return invalidParse(original, 'The dice formula cannot end with + or -.');
    } else if (terms.length > 0) {
      return invalidParse(original, `Expected + or - near "${compact.slice(cursor)}".`);
    }

    const body = compact.slice(cursor);
    const parsed = parseDiceBody(body);
    if (!parsed) return invalidParse(original, `Could not understand "${body}".`);

    if (parsed.modifierText) {
      const value = Number.parseInt(parsed.modifierText, 10);
      if (!Number.isSafeInteger(value) || value > MAX_ABS_MODIFIER) {
        return invalidParse(original, `Flat modifiers cannot exceed ${MAX_ABS_MODIFIER.toLocaleString()}.`);
      }
      const signedValue = sign * value;
      modifier += signedValue;
      if (Math.abs(modifier) > MAX_ABS_MODIFIER) {
        return invalidParse(original, `Combined modifiers cannot exceed ±${MAX_ABS_MODIFIER.toLocaleString()}.`);
      }
      terms.push({ type: 'modifier', sign, value, signedValue, raw: `${sign < 0 ? '-' : terms.length ? '+' : ''}${parsed.raw}` });
      cursor += parsed.length;
      continue;
    }

    const count = parsed.countText ? Number.parseInt(parsed.countText, 10) : 1;
    const sides = Number.parseInt(parsed.sidesText, 10);

    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_DICE_PER_TERM) {
      return invalidParse(original, `Each dice group must roll between 1 and ${MAX_DICE_PER_TERM} dice.`);
    }
    if (!Number.isSafeInteger(sides) || sides < 2 || sides > MAX_DIE_SIDES) {
      return invalidParse(original, `Dice must have between 2 and ${MAX_DIE_SIDES} sides.`);
    }

    totalDice += count;
    if (totalDice > MAX_TOTAL_DICE) {
      return invalidParse(original, `A single roll is limited to ${MAX_TOTAL_DICE} dice.`);
    }

    let keepDrop = null;
    if (parsed.keepDropMode) {
      const selectionCount = Number.parseInt(parsed.keepDropCountText, 10);
      if (!Number.isSafeInteger(selectionCount) || selectionCount < 1) {
        return invalidParse(original, 'Keep/drop notation needs a positive number, for example 4d6kh3.');
      }

      const isKeep = parsed.keepDropMode.startsWith('k');
      if ((isKeep && selectionCount > count) || (!isKeep && selectionCount >= count)) {
        return invalidParse(
          original,
          isKeep
            ? `Cannot keep ${selectionCount} dice from a ${count}-die group.`
            : `Dropping ${selectionCount} dice would leave no dice to total.`,
        );
      }

      keepDrop = {
        action: isKeep ? 'keep' : 'drop',
        direction: parsed.keepDropMode.endsWith('h') ? 'highest' : 'lowest',
        count: selectionCount,
        notation: parsed.keepDropMode,
      };
    }

    const rawGroup = `${parsed.countText || ''}d${parsed.sidesText}${parsed.keepDropMode || ''}${parsed.keepDropCountText || ''}`;
    terms.push({
      type: 'dice',
      sign,
      count,
      sides,
      keepDrop,
      raw: `${sign < 0 ? '-' : terms.length ? '+' : ''}${rawGroup}`,
    });
    diceGroups.push(`${sign < 0 ? '-' : terms.length > 1 ? '+' : ''}${rawGroup}`);
    cursor += parsed.length;
  }

  if (!terms.some(term => term.type === 'dice')) {
    return invalidParse(original, 'A dice formula needs at least one dice group, such as 1d20.');
  }

  return {
    notation: original,
    normalizedNotation: compact,
    valid: true,
    error: '',
    terms,
    diceGroups,
    modifier,
  };
}

export function rollDie(sides, rng = Math.random) {
  const safeSides = Math.floor(Number(sides));
  if (!Number.isFinite(safeSides) || safeSides < 2) {
    throw new RangeError('A die must have at least 2 sides.');
  }

  const randomValue = Number(rng());
  const bounded = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
    : 0;
  return Math.floor(bounded * safeSides) + 1;
}

function markKeepDrop(rolls, termIndexes, keepDrop) {
  if (!keepDrop || termIndexes.length <= 1) return;

  const ranked = [...termIndexes].sort((leftIndex, rightIndex) => {
    const difference = rolls[leftIndex].result - rolls[rightIndex].result;
    if (difference !== 0) return difference;
    return leftIndex - rightIndex;
  });

  let droppedIndexes = [];
  if (keepDrop.action === 'keep') {
    const kept = keepDrop.direction === 'highest'
      ? ranked.slice(-keepDrop.count)
      : ranked.slice(0, keepDrop.count);
    const keptSet = new Set(kept);
    droppedIndexes = termIndexes.filter(index => !keptSet.has(index));
  } else {
    droppedIndexes = keepDrop.direction === 'highest'
      ? ranked.slice(-keepDrop.count)
      : ranked.slice(0, keepDrop.count);
  }

  droppedIndexes.forEach(index => {
    rolls[index].dropped = true;
    rolls[index].contribution = 0;
  });
}

function emptyRollResult(notation, parsed, options = {}) {
  return {
    notation,
    normalizedNotation: parsed?.normalizedNotation || String(notation || '').replace(/\s+/g, '').toLowerCase(),
    valid: false,
    error: parsed?.error || 'Invalid dice formula.',
    terms: parsed?.terms || [],
    rolls: [],
    visibleRolls: [],
    modifier: 0,
    total: 0,
    keptRoll: null,
    isCrit: false,
    isFumble: false,
    exploding: Boolean(options.exploding),
    explosionCount: 0,
  };
}

export function rollDiceNotation(notation, options = {}) {
  const {
    rollType = 'normal',
    exploding = false,
    rng = Math.random,
    maxExplosionsPerDie = 100,
  } = options;

  const parsed = parseDiceNotation(notation);
  if (!parsed.valid) return emptyRollResult(notation, parsed, options);

  if (!['normal', 'advantage', 'disadvantage'].includes(rollType)) {
    return emptyRollResult(notation, { ...parsed, error: `Unknown roll mode "${rollType}".` }, options);
  }

  const diceTerms = parsed.terms.filter(term => term.type === 'dice');
  const hasKeepDrop = diceTerms.some(term => term.keepDrop);
  if (exploding && hasKeepDrop) {
    return emptyRollResult(notation, {
      ...parsed,
      error: 'Exploding dice cannot be combined with keep/drop notation in the same roll.',
    }, options);
  }

  const advantageTerm = diceTerms.length === 1
    && diceTerms[0].sign === 1
    && diceTerms[0].count === 1
    && diceTerms[0].sides === 20
    && !diceTerms[0].keepDrop
    ? diceTerms[0]
    : null;
  const isAdvRoll = rollType === 'advantage' || rollType === 'disadvantage';

  if (isAdvRoll && !advantageTerm) {
    return emptyRollResult(notation, {
      ...parsed,
      error: 'Advantage and disadvantage require a single 1d20 roll plus optional flat modifiers.',
    }, options);
  }

  const rolls = [];

  if (isAdvRoll) {
    const r1 = rollDie(20, rng);
    const r2 = rollDie(20, rng);
    const keepFirst = rollType === 'advantage' ? r1 >= r2 : r1 <= r2;

    rolls.push({
      sides: 20,
      result: r1,
      sign: 1,
      contribution: keepFirst ? r1 : 0,
      dropped: !keepFirst,
      termIndex: parsed.terms.indexOf(advantageTerm),
    });
    rolls.push({
      sides: 20,
      result: r2,
      sign: 1,
      contribution: keepFirst ? 0 : r2,
      dropped: keepFirst,
      termIndex: parsed.terms.indexOf(advantageTerm),
    });
  } else {
    parsed.terms.forEach((term, termIndex) => {
      if (term.type !== 'dice') return;
      const termIndexes = [];

      for (let index = 0; index < term.count; index += 1) {
        let result = rollDie(term.sides, rng);
        const baseIndex = rolls.length;
        termIndexes.push(baseIndex);
        rolls.push({
          sides: term.sides,
          result,
          sign: term.sign,
          contribution: term.sign * result,
          dropped: false,
          termIndex,
        });

        let explosionCount = 0;
        let previousIndex = baseIndex;
        while (exploding && term.sides !== 20 && result === term.sides && explosionCount < maxExplosionsPerDie) {
          explosionCount += 1;
          result = rollDie(term.sides, rng);
          const explosionIndex = rolls.length;
          rolls.push({
            sides: term.sides,
            result,
            sign: term.sign,
            contribution: term.sign * result,
            dropped: false,
            exploded: true,
            explosionOf: previousIndex,
            termIndex,
          });
          previousIndex = explosionIndex;
        }
      }

      markKeepDrop(rolls, termIndexes, term.keepDrop);
    });
  }

  const visibleRolls = rolls.filter(roll => !roll.dropped);
  const diceTotal = visibleRolls.reduce((sum, roll) => sum + Number(roll.contribution ?? ((roll.sign || 1) * roll.result)), 0);
  const total = diceTotal + parsed.modifier;

  const visibleD20s = visibleRolls.filter(roll => roll.sides === 20 && (roll.sign ?? 1) > 0);
  const keptRoll = isAdvRoll
    ? visibleD20s[0] || null
    : visibleD20s.length === 1
      ? visibleD20s[0]
      : visibleRolls[0] || null;
  const naturalD20 = isAdvRoll || visibleD20s.length === 1 ? visibleD20s[0] : null;

  return {
    notation,
    normalizedNotation: parsed.normalizedNotation,
    valid: true,
    error: '',
    terms: parsed.terms,
    rolls,
    visibleRolls,
    modifier: parsed.modifier,
    total,
    keptRoll,
    isCrit: Boolean(naturalD20 && naturalD20.result === 20),
    isFumble: Boolean(naturalD20 && naturalD20.result === 1),
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
