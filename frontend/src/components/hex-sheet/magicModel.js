/**
 * The data behind the hexagon sheet's Magic wheel, kept free of React.
 *
 * The wheel has a wedge for cantrips (when the character knows any) and one
 * for each spell-slot level the character has, each carrying dots for the
 * slots left. Turning a level to the top lists the spells the character can
 * cast at that level.
 */
import { SPELL_DATABASE } from '@/data/spellDatabase';

const normalise = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const toNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/** Every spell in the reference database, by normalised name, with its level. */
const REFERENCE = Object.fromEntries(Object.entries(SPELL_DATABASE).flatMap(([section, list]) =>
  asList(list).map((spell) => [normalise(spell.name), { ...spell, level: section === 'cantrips' ? 0 : Number(section) }])));

/** A saved spell entry (a name or an object) filled in from the reference. */
export function spellWithDetails(entry, fallbackLevel = null) {
  const saved = typeof entry === 'string' ? { name: entry } : { ...entry };
  const reference = REFERENCE[normalise(saved.name)] || {};
  const level = saved.level ?? saved.spell_level ?? reference.level ?? fallbackLevel;
  return {
    ...reference,
    ...saved,
    level: toNumber(level, 0),
    description: saved.description || reference.description || '',
    school: saved.school || reference.school || '',
  };
}

/**
 * The spells a character can cast now: cantrips, plus prepared spells (for
 * preparing casters) and known spells (for known casters). Spellbook-only
 * entries are left out: they must be prepared before they can be cast.
 */
export function castableSpells(character = {}) {
  const seen = new Set();
  const out = [];
  const add = (entry, fallbackLevel) => {
    if (!entry) return;
    const spell = spellWithDetails(entry, fallbackLevel);
    if (!spell.name) return;
    const key = `${normalise(spell.sourceClass || spell.source_class)}:${normalise(spell.name)}`;
    const bare = `:${normalise(spell.name)}`;
    if (seen.has(key) || seen.has(bare)) return;
    seen.add(key);
    seen.add(bare);
    out.push(spell);
  };
  asList(character.cantrips_known || character.cantrips).forEach((entry) => add(entry, 0));
  asList(character.spells_prepared || character.prepared_spells || character.preparedSpells).forEach((entry) => add(entry, null));
  asList(character.spells_known || character.known_spells).forEach((entry) => add(entry, null));
  return out;
}

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };
export const ordinal = (level) => ORDINAL[level] || `${level}th`;

/**
 * The wheel's wedges. `pools` is getCharacterSpellPools(character):
 * { normal: { totals, remaining }, pact: { available, level, total, current } }.
 */
export function magicLevels(spells = [], pools = {}) {
  const levels = [];
  if (spells.some((spell) => spell.level === 0)) {
    levels.push({ id: 'cantrips', level: 0, label: 'Cantrips', short: 'CANTRIP' });
  }
  const totals = pools.normal?.totals || {};
  const remaining = pools.normal?.remaining || {};
  const slotLevels = new Map();
  Object.entries(totals).forEach(([level, total]) => {
    const value = toNumber(total, 0);
    if (value > 0) slotLevels.set(Number(level), { total: value, left: toNumber(remaining[level], value) });
  });
  if (pools.pact?.available) {
    const level = toNumber(pools.pact.level, 0);
    const existing = slotLevels.get(level) || { total: 0, left: 0 };
    slotLevels.set(level, { total: existing.total + toNumber(pools.pact.total, 0), left: existing.left + toNumber(pools.pact.current, 0) });
  }
  [...slotLevels.keys()].sort((a, b) => a - b).forEach((level) => {
    const pips = slotLevels.get(level);
    levels.push({ id: `level-${level}`, level, label: `${ordinal(level)} level`, short: ordinal(level).toUpperCase(), pips });
  });
  return levels;
}

/** The spells listed under a wedge: those of exactly that level, by name. */
export function spellsAtLevel(spells = [], level = 0) {
  return spells.filter((spell) => spell.level === level).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The cast option for a spell from the wedge it is listed under: that
 * level's slot if one is left (ordinary before Pact Magic), otherwise the
 * lowest higher slot. `options` come from getCharacterCastOptions.
 */
export function castOptionAt(options = [], level = 0) {
  if (!options.length) return null;
  if (options[0]?.source === 'cantrip') return options[0];
  const exact = options.filter((option) => toNumber(option.level, 0) === level && toNumber(option.remaining, 0) > 0);
  if (exact.length) return exact.find((option) => option.source === 'spell') || exact[0];
  return [...options]
    .filter((option) => toNumber(option.level, 0) > level && toNumber(option.remaining, 0) > 0)
    .sort((a, b) => toNumber(a.level, 0) - toNumber(b.level, 0))[0] || null;
}
