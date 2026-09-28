import { rollDie } from './diceRoller';

function normaliseDash(value) {
  return String(value || '').replace(/–/g, '-');
}

export function parseRollTableRange(range) {
  const text = normaliseDash(range).trim();
  const match = text.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = match[2] === undefined ? first : Number(match[2]);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second)) return null;

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}

export function parseRollTableDie(die = '') {
  const match = String(die || '').trim().match(/^d(\d+)$/i);
  if (!match) return null;
  const sides = Number(match[1]);
  return Number.isSafeInteger(sides) && sides >= 2 ? sides : null;
}

export function resolveRollTableResult({ die = '', entries = [] } = {}, rng = Math.random) {
  const sides = parseRollTableDie(die);
  if (!sides) {
    return { valid: false, error: 'This table does not have a valid die such as d20 or d100.' };
  }

  const parsedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => ({ entry, range: parseRollTableRange(entry?.range) }))
    .filter(({ range }) => range);

  if (!parsedEntries.length) {
    return { valid: false, error: 'This table does not contain any numeric roll ranges.' };
  }

  const outOfBounds = parsedEntries.find(({ range }) => range.min < 1 || range.max > sides);
  if (outOfBounds) {
    return {
      valid: false,
      error: `Range ${outOfBounds.entry?.range} falls outside d${sides}.`,
    };
  }

  const roll = rollDie(sides, rng);
  const matched = parsedEntries.find(({ range }) => roll >= range.min && roll <= range.max);

  if (!matched) {
    return {
      valid: false,
      error: `Rolled ${roll} on d${sides}, but no table row covers that result.`,
      sides,
      roll,
    };
  }

  return {
    valid: true,
    error: '',
    sides,
    roll,
    entry: matched.entry,
  };
}
