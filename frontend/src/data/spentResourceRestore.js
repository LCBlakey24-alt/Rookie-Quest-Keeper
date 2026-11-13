/*
 * Giving back a spent use: a spell slot, a Pact Magic slot, or a class
 * resource (Ki, Rage, Bardic Inspiration, ...) tapped by accident. Every
 * change is relative to the character as it is now, so undoing one tap
 * never rolls back anything spent since.
 */
import { getCharacterSpellPools } from './characterSpellCastingActions';
import { buildPactMagicResource } from './spellcastingPools';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** One row per slot level the character has, plus Pact Magic if any. */
export function spellSlotRows(character = {}) {
  const pools = getCharacterSpellPools(character);
  const rows = Object.entries(pools.normal.totals || {})
    .map(([level, total]) => ({ source: 'spell', level: Number(level), total: Number(total) || 0, left: Number(pools.normal.remaining?.[level]) || 0 }))
    .filter((row) => row.level > 0 && row.total > 0)
    .sort((a, b) => a.level - b.level);
  if (pools.pact?.available) rows.push({ source: 'pact', level: pools.pact.level, total: pools.pact.total, left: pools.pact.current });
  return rows;
}

/**
 * The update that moves one slot pool by `delta` (+1 gives a slot back,
 * -1 spends one). Null when it is already full or empty.
 */
export function slotAdjustUpdate(character = {}, { source, level }, delta) {
  const pools = getCharacterSpellPools(character);
  if (source === 'pact') {
    const pact = pools.pact;
    if (!pact?.available) return null;
    const next = clamp(pact.current + delta, 0, pact.total);
    if (next === pact.current) return null;
    const updates = { resources: buildPactMagicResource(character.resources || {}, pact, next) };
    if (pools.normal.legacyPactExcluded) {
      updates.spell_slots_remaining = { ...(character.spell_slots_remaining || {}), [String(pact.level)]: next };
    }
    return updates;
  }
  const key = String(level);
  const total = Number(pools.normal.totals?.[key]) || 0;
  if (!total) return null;
  const current = Number(pools.normal.remaining?.[key]) || 0;
  const next = clamp(current + delta, 0, total);
  if (next === current) return null;
  return { spell_slots_remaining: { ...pools.normal.remaining, [key]: next } };
}

/** The update that moves a class resource by `delta`, keeping its other fields. */
export function resourceAdjustUpdate(character = {}, resource, delta) {
  if (!resource) return null;
  const max = Number(resource.max) || 0;
  const current = Number(resource.current) || 0;
  const next = clamp(current + delta, 0, max);
  if (next === current) return null;
  const existing = character?.resources?.[resource.key] || {};
  return {
    next,
    updates: {
      resources: {
        ...(character?.resources || {}),
        [resource.key]: {
          ...existing,
          label: resource.label,
          current: next,
          remaining: next,
          max,
          restore: resource.restore || existing.restore,
        },
      },
    },
  };
}
