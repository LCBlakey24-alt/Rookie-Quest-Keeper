// Eldritch Heralds locked campaign rule: shared Chaos becomes one-for-one
// banked DM Fate when spent. GM applies each rolled encounter upgrade.
export const FATE_EFFECTS = Object.freeze([
  'Fated Vitality: +10 maximum and current HP',
  'Fated Defence: +1 AC',
  'Fated Accuracy: +1 to all attack rolls',
  'Fated Power: +2 damage per damaging hit/spell/ability',
  'Relentless Assault: +1 attack with the Attack action',
  'Legendary Action: +1 legendary action each round',
  'Legendary Reaction: +1 additional reaction each round',
  'Legendary Resistance: +1 use for the encounter',
]);
export const CHAOS_COSTS = [
  { cost: 1, effects: ['Adjust own finished d20 by ±1', 'Add 1d4 before success known', 'Extra reaction', 'Move 10 ft without opportunity attacks', 'Upgrade or explode one damage die', 'Reduce/remove incoming damage die'] },
  { cost: 2, effects: ['Extra weapon/unarmed attack', 'Extra bonus action', 'Reroll own d20', 'Cancel disadvantage', 'Force enemy d20 reroll before result', 'Downgrade enemy critical hit', 'Move up to Speed without opportunity attacks'] },
  { cost: 3, effects: ['Extra action', 'Drop to 1 HP instead of 0', 'Advantage before own roll', 'Force successful enemy d20 reroll'] },
];
export const EMPTY_CHAOS_FATE = { chaos: 0, fate: 0, history: [] };
const integer = n => Number.isSafeInteger(Number(n)) && Number(n) >= 0 ? Number(n) : 0;
export function normaliseChaosFate(value) {
  return {
    chaos: Math.min(100000, integer(value?.chaos)),
    fate: Math.min(100000, integer(value?.fate)),
    history: Array.isArray(value?.history) ? value.history.slice(-60) : [],
  };
}
export function updateChaosFate(old, action, amount = 1, enemy = '', random = Math.random) {
  const current = normaliseChaosFate(old);
  const n = Number(amount);
  if (!Number.isSafeInteger(n) || n < 1 || n > 100) throw Error('Choose 1 to 100 tokens.');
  let chaos = current.chaos, fate = current.fate, rolls = [];
  if (action === 'award') chaos += n;
  else if (action === 'spend') {
    if (chaos < n) throw Error('Not enough shared Chaos Tokens.');
    chaos -= n;
    fate += n; // Locked 1:1 rule.
  } else if (action === 'commit') {
    if (fate < n) throw Error('Not enough banked Fate Tokens.');
    fate -= n;
    rolls = Array.from({ length: n }, () => {
      const r = Number(random());
      if (!Number.isFinite(r) || r < 0 || r >= 1) throw Error('Invalid dice source.');
      return Math.floor(r * 8) + 1;
    });
  } else throw Error('Unknown token action.');
  const item = { action, amount: n, enemy: String(enemy || '').slice(0, 120), rolls,
    timestamp: new Date().toISOString(), before: { chaos: current.chaos, fate: current.fate } };
  return { chaos, fate, history: [...current.history, item].slice(-60) };
}
export function undoChaosFate(last) {
  const current = normaliseChaosFate(last);
  const item = current.history[current.history.length - 1];
  if (!item || !item.before) throw Error('No token operation to undo.');
  return { ...current, chaos: integer(item.before.chaos), fate: integer(item.before.fate),
    history: current.history.slice(0, -1) };
}
