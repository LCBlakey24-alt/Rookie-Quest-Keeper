/**
 * The data behind the hexagon sheet's Magic wheel, kept free of React.
 *
 * The wheel has a wedge for cantrips (when the character knows any) and one
 * for each spell-slot level the character has, each carrying dots for the
 * slots left. Turning a level to the top lists the spells the character can
 * cast at that level.
 */
import { SPELL_DATABASE } from '@/data/spellDatabase';
import { legacySpellbookEntries, spellListContains } from '@/data/characterSpellListRules';

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
 * entries, including a Wizard's spellbook in an older save's spells_known,
 * are left out: they must be prepared before they can be cast.
 */
export function castableSpells(character = {}) {
  const seen = new Set();
  const out = [];
  const add = (entry, fallbackLevel) => {
    if (!entry) return;
    const spell = spellWithDetails(entry, fallbackLevel);
    if (!spell.name) return;
    // A spell known through two classes stays twice, once per class, since
    // each copy casts with its own class's modifier. Untagged copies of a
    // name already listed are dropped.
    const source = normalise(spell.sourceClass || spell.source_class);
    const name = normalise(spell.name);
    const key = `${source}:${name}`;
    if (seen.has(key) || (!source && seen.has(`name:${name}`))) return;
    seen.add(key);
    seen.add(`name:${name}`);
    out.push({ ...spell, key });
  };
  asList(character.cantrips_known || character.cantrips).forEach((entry) => add(entry, 0));
  asList(character.spells_prepared || character.prepared_spells || character.preparedSpells).forEach((entry) => add(entry, null));
  // A Wizard's older save may hold its spellbook in spells_known: those
  // entries must be prepared (above) before they can be cast.
  const unprepared = legacySpellbookEntries(character);
  asList(character.spells_known || character.known_spells)
    .filter((entry) => !spellListContains(unprepared, entry))
    .forEach((entry) => add(entry, null));
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

/**
 * The spells listed under a wedge, by name. Each spell sits under the lowest
 * wedge at or above its own level, so a spell whose level has no slots of its
 * own (a Warlock's 1st-level spells once Pact Magic slots are 3rd level) is
 * still listed and cast with the higher slot. `wedgeLevels` are the levels on
 * the wheel; without them a wedge lists only spells of exactly its level.
 */
export function spellsAtLevel(spells = [], level = 0, wedgeLevels = null) {
  const levels = Array.isArray(wedgeLevels) ? [...wedgeLevels].sort((a, b) => a - b) : null;
  const home = (spellLevel) => {
    if (!levels || spellLevel === 0) return spellLevel;
    const above = levels.find((value) => value >= spellLevel);
    return above === undefined ? spellLevel : above;
  };
  return spells.filter((spell) => home(spell.level) === level).sort((a, b) => a.name.localeCompare(b.name) || String(a.key).localeCompare(String(b.key)));
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
