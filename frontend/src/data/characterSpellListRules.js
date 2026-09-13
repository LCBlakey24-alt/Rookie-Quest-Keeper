import { SPELLCASTING_CLASSES } from './spellDatabase';
import { getPreparedSpellCapacity, getSpellSelectionMode, normaliseSpellEdition } from './spellPreparationRules';

const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function normaliseSpell(spell = {}) {
  if (typeof spell === 'string') return { name: spell };
  return {
    ...spell,
    name: spell?.name || spell?.spell_name || spell?.title || '',
  };
}

function rawSpellSource(spell = {}) {
  return spell?.sourceClass || spell?.source_class || spell?.className || spell?.class_name || '';
}

export function characterSpellIdentity(spell = {}) {
  const normalised = normaliseSpell(spell);
  const nameKey = normaliseName(normalised.name);
  if (!nameKey) return '';
  const sourceKey = normaliseName(rawSpellSource(normalised));
  return `${sourceKey || 'legacy'}:${nameKey}`;
}

export function spellListContains(spells = [], spell = {}) {
  const candidate = normaliseSpell(spell);
  const nameKey = normaliseName(candidate.name);
  if (!nameKey) return false;
  const candidateSource = normaliseName(rawSpellSource(candidate));

  return toArray(spells).some((saved) => {
    const savedSpell = normaliseSpell(saved);
    if (normaliseName(savedSpell.name) !== nameKey) return false;
    const savedSource = normaliseName(rawSpellSource(savedSpell));
    // Untagged legacy data is ambiguous, so treat it as occupying this spell
    // name until the character is reviewed/migrated rather than creating a
    // duplicate under a guessed class.
    if (!savedSource || !candidateSource) return true;
    return savedSource === candidateSource;
  });
}

function uniqueSpells(spells = []) {
  const seen = new Set();
  return toArray(spells).map(normaliseSpell).filter((spell) => {
    const key = characterSpellIdentity(spell);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function characterRulesEdition(character = {}) {
  return normaliseSpellEdition(character.rules_edition || character.edition || character.ruleset_id || '2014');
}

export function canonicalSpellClassName(className = '') {
  return Object.keys(SPELLCASTING_CLASSES).find((name) => normaliseName(name) === normaliseName(className)) || String(className || '').trim();
}

export function getCharacterSpellListMode(character = {}, className = '') {
  const canonical = canonicalSpellClassName(className);
  return getSpellSelectionMode({ className: canonical, edition: characterRulesEdition(character) });
}

export function getCharacterPreparedCapacity(character = {}, className = '', classLevel = 0) {
  const canonical = canonicalSpellClassName(className);
  const info = SPELLCASTING_CLASSES[canonical];
  const abilityScore = info?.ability ? Number(character?.[info.ability] || 10) : 10;
  return getPreparedSpellCapacity({
    className: canonical,
    level: Number(classLevel || 0),
    edition: characterRulesEdition(character),
    abilityScore,
  });
}

export function getSpellListDestination(character = {}, className = '', spellLevel = 1) {
  if (Number(spellLevel || 0) <= 0) return 'cantrips_known';
  const mode = getCharacterSpellListMode(character, className);
  if (mode === 'spellbook') return 'spellbook';
  if (mode === 'prepared') return 'spells_prepared';
  return 'spells_known';
}

export function getSpellListLabel(character = {}, className = '') {
  const mode = getCharacterSpellListMode(character, className);
  if (mode === 'spellbook') return 'Spellbook';
  if (mode === 'prepared') return 'Prepared';
  if (mode === 'known') return 'Known';
  return 'Spells';
}

export function tagSpellSource(spell = {}, className = '') {
  if (!spell || typeof spell !== 'object') return spell;
  const canonical = canonicalSpellClassName(className || spell.sourceClass || spell.source_class || '');
  return canonical ? { ...spell, sourceClass: canonical } : { ...spell };
}

export function spellBelongsToClass(spell = {}, className = '') {
  const source = rawSpellSource(spell);
  if (!source) return true; // Legacy saves did not persist source class.
  return normaliseName(source) === normaliseName(canonicalSpellClassName(className));
}

export function normaliseCharacterClassLevels(character = {}) {
  const fromMap = character.class_levels || character.multiclass_levels || character.classLevels || {};
  const mapped = Object.entries(fromMap)
    .filter(([, level]) => Number(level) > 0)
    .map(([name, level]) => [canonicalSpellClassName(name), Number(level)]);
  if (mapped.length) return Object.fromEntries(mapped);

  const fromArray = toArray(character.classes)
    .map((entry) => [
      canonicalSpellClassName(entry?.name || entry?.class_name || entry?.character_class || entry?.class),
      Number(entry?.level || entry?.class_level || 0),
    ])
    .filter(([name, level]) => name && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  const primary = canonicalSpellClassName(character.character_class || character.class_name || '');
  return primary ? { [primary]: Number(character.level || 1) || 1 } : {};
}

function sourceClassOf(spell = {}) {
  return canonicalSpellClassName(rawSpellSource(spell));
}

function spellsExplicitlyForClass(spells = [], className = '') {
  const wanted = normaliseName(className);
  return uniqueSpells(spells).filter((spell) => {
    const source = sourceClassOf(spell);
    return source && normaliseName(source) === wanted;
  });
}

/**
 * Build a non-destructive migration plan for old 2024 saves that still keep
 * revised prepared-caster spells in `spells_known`.
 *
 * Untagged legacy entries are only assigned automatically when there is exactly
 * one prepared-list class on the character. Multiclass ambiguity is surfaced to
 * the UI instead of guessing. The old known-spell list is never deleted.
 */
export function buildLegacyPreparedMigrationPlan(character = {}, suppliedClassLevels = null) {
  if (characterRulesEdition(character) !== '2024') {
    return { candidates: [], safeCandidates: [], effectivePrepared: uniqueSpells(character.spells_prepared || character.prepared_spells), ambiguous: false, hasMigration: false };
  }

  const classLevels = suppliedClassLevels || normaliseCharacterClassLevels(character);
  const preparedClasses = Object.entries(classLevels)
    .map(([name, level]) => ({ className: canonicalSpellClassName(name), level: Number(level) || 0 }))
    .filter(({ className, level }) => level > 0 && getCharacterSpellListMode(character, className) === 'prepared');
  const known = uniqueSpells(character.spells_known || character.known_spells);
  const prepared = uniqueSpells(character.spells_prepared || character.prepared_spells || character.preparedSpells);
  const untaggedKnown = known.filter((spell) => !sourceClassOf(spell));
  const candidates = [];
  let ambiguous = false;

  preparedClasses.forEach(({ className, level }) => {
    const alreadyPrepared = prepared.filter((spell) => spellBelongsToClass(spell, className));
    if (alreadyPrepared.length) return;

    const taggedLegacy = spellsExplicitlyForClass(known, className);
    let legacy = taggedLegacy;
    if (!legacy.length && untaggedKnown.length) {
      if (preparedClasses.length === 1) legacy = untaggedKnown;
      else ambiguous = true;
    }
    if (!legacy.length) return;

    const capacity = getCharacterPreparedCapacity(character, className, level);
    const tagged = legacy.map((spell) => tagSpellSource(spell, className));
    candidates.push({
      className,
      level,
      capacity,
      spells: tagged,
      count: tagged.length,
      safe: capacity <= 0 || tagged.length <= capacity,
      overflow: capacity > 0 ? Math.max(0, tagged.length - capacity) : 0,
    });
  });

  const safeCandidates = candidates.filter((candidate) => candidate.safe);
  const migratedSpells = safeCandidates.flatMap((candidate) => candidate.spells);
  const effectivePrepared = uniqueSpells([...prepared, ...migratedSpells]);

  return {
    candidates,
    safeCandidates,
    effectivePrepared,
    ambiguous,
    hasMigration: safeCandidates.length > 0,
    hasOverflow: candidates.some((candidate) => !candidate.safe),
  };
}

export function buildLegacyPreparedMigrationUpdates(character = {}, suppliedClassLevels = null) {
  const plan = buildLegacyPreparedMigrationPlan(character, suppliedClassLevels);
  if (!plan.hasMigration) return null;
  const prepared = plan.effectivePrepared;
  return {
    spells_prepared: prepared,
    prepared_spells: prepared,
    preparedSpells: prepared,
  };
}
